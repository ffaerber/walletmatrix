// Orchestrates the real bridge / cross-chain swap flow:
//   1. fetch Li.Fi quote
//   2. switch MetaMask to the source chain
//   3. for ERC-20 sources: read allowance, submit approve() if needed
//   4. send the main tx via eth_sendTransaction
//   5. poll Li.Fi /status until DONE or FAILED
//
// The caller supplies an onStage callback so the UI can render progress.

import { fetchLifiQuote, fetchLifiStatus, type LifiQuote } from './lifi';
import {
  resolveTokenAddress,
  resolveTokenDecimals,
  NATIVE_ADDRESS,
} from './tokenAddresses';
import { encodeApprove, readAllowance } from './erc20';
import { sendTransaction, switchToChain, waitForReceipt } from './wallet';
import { parseUnits } from './units';
import type { ChainId, Token } from './types';

export type TxStage =
  | { kind: 'idle' }
  | { kind: 'quoting' }
  | { kind: 'ready'; quote: LifiQuote }
  | { kind: 'switching' }
  | { kind: 'approving'; txHash?: string }
  | { kind: 'signing' }
  | { kind: 'pending'; txHash: string; label: string }
  | { kind: 'done'; txHash: string; receiveHash?: string }
  | { kind: 'error'; message: string };

export interface ExecuteArgs {
  address: string;
  fromToken: Token;
  toToken: Token;
  fromChainId: ChainId;
  toChainId: ChainId;
  amountHuman: string;
  slippage?: number;
}

// Returns a fresh quote with real numbers (toAmount, fees, tool, gas).
// Throws with a human-readable error if the token pair isn't bridgeable.
export async function fetchQuote(args: ExecuteArgs, signal?: AbortSignal): Promise<LifiQuote> {
  const fromAddr = resolveTokenAddress(args.fromToken, args.fromChainId);
  const toAddr = resolveTokenAddress(args.toToken, args.toChainId);
  if (!fromAddr) {
    throw new Error(`No contract address known for ${args.fromToken.symbol} on ${args.fromChainId}`);
  }
  if (!toAddr) {
    throw new Error(`No contract address known for ${args.toToken.symbol} on ${args.toChainId}`);
  }
  const decimals = resolveTokenDecimals(args.fromToken, args.fromChainId);
  const amountWei = parseUnits(args.amountHuman, decimals);
  if (amountWei <= 0n) throw new Error('Amount must be greater than zero');

  return fetchLifiQuote({
    fromChain: args.fromChainId,
    toChain: args.toChainId,
    fromToken: fromAddr,
    toToken: toAddr,
    fromAmountWei: amountWei,
    fromAddress: args.address,
    slippage: args.slippage ?? 0.005,
    signal,
  });
}

// Drives the execution phase given a quote the user has already reviewed.
// Throws on any failure (after emitting an 'error' stage) so callers can
// also catch for cleanup.
// `opts.pollInitialDelayMs` is only set by tests; production always uses the
// default 5s first-delay so we don't hammer Li.Fi's status endpoint.
export interface ExecuteOpts {
  pollInitialDelayMs?: number;
}

export async function executeQuote(
  args: ExecuteArgs,
  quote: LifiQuote,
  onStage: (s: TxStage) => void,
  opts?: ExecuteOpts,
): Promise<{ txHash: string; receiveHash?: string }> {
  try {
    onStage({ kind: 'switching' });
    await switchToChain(args.fromChainId);

    const fromAddr = resolveTokenAddress(args.fromToken, args.fromChainId);
    if (!fromAddr) throw new Error('Source token address disappeared');
    const decimals = resolveTokenDecimals(args.fromToken, args.fromChainId);
    const amountWei = parseUnits(args.amountHuman, decimals);

    // --- Approve phase (ERC-20 only) ------------------------------------
    if (fromAddr !== NATIVE_ADDRESS) {
      onStage({ kind: 'approving' });
      const spender = quote.transactionRequest.to;
      const current = await readAllowance(args.fromChainId, fromAddr, args.address, spender);
      if (current < amountWei) {
        const approveHash = await sendTransaction({
          from: args.address,
          to: fromAddr,
          data: encodeApprove(spender, amountWei),
        });
        onStage({ kind: 'approving', txHash: approveHash });
        await waitForReceipt(args.fromChainId, approveHash);
      }
    }

    // --- Main tx --------------------------------------------------------
    onStage({ kind: 'signing' });
    const tx = quote.transactionRequest;
    const txHash = await sendTransaction({
      from: args.address,
      to: tx.to,
      data: tx.data,
      value: tx.value,
      gas: tx.gasLimit,
      gasPrice: tx.gasPrice,
    });

    // --- Status polling -------------------------------------------------
    onStage({ kind: 'pending', txHash, label: 'Submitted, waiting for source tx…' });
    const deadline = Date.now() + 20 * 60 * 1000; // 20 min
    let delay = opts?.pollInitialDelayMs ?? 5000;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, delay));
      // mild backoff so we don't hammer the API
      delay = Math.min(delay + 1000, 12_000);
      let status;
      try {
        status = await fetchLifiStatus({
          txHash,
          tool: quote.tool,
          fromChain: args.fromChainId,
          toChain: args.toChainId,
        });
      } catch {
        // transient — keep polling
        continue;
      }
      onStage({
        kind: 'pending',
        txHash,
        label: status.substatusMessage ?? status.substatus ?? status.status,
      });
      if (status.status === 'DONE') {
        onStage({ kind: 'done', txHash, receiveHash: status.receiving?.txHash });
        return { txHash, receiveHash: status.receiving?.txHash };
      }
      if (status.status === 'FAILED' || status.status === 'INVALID') {
        throw new Error(status.substatusMessage ?? `Bridge ${status.status.toLowerCase()}`);
      }
    }
    throw new Error('Status polling timed out — check Li.Fi explorer for final state');
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    onStage({ kind: 'error', message });
    throw e;
  }
}
