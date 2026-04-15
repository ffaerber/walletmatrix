// Thin typed client for the Li.Fi public API (li.quest).
// No SDK dependency — keeps the Swarm bundle small.
// Endpoints used:
//   GET /v1/quote   -> one-shot quote with an executable transactionRequest
//   GET /v1/status  -> polling status for a running bridge / swap

import { decimalChainId } from './tokenAddresses';
import type { ChainId } from './types';

const LIFI_BASE = 'https://li.quest/v1';

export interface LifiTxRequest {
  from?: string;
  to: string;
  chainId: number;
  data: string;
  value?: string;
  gasLimit?: string;
  gasPrice?: string;
}

export interface LifiQuote {
  id: string;
  type: string;
  tool: string; // identifier of the underlying bridge/dex (used when polling status)
  toolDetails?: { name: string; logoURI?: string };
  action: {
    fromToken: { symbol: string; decimals: number; address: string };
    toToken: { symbol: string; decimals: number; address: string };
    fromAmount: string;
  };
  estimate: {
    fromAmount: string;
    toAmount: string;
    toAmountMin: string;
    executionDuration: number;
    feeCosts?: Array<{ amount: string; amountUSD?: string; description?: string; name?: string }>;
    gasCosts?: Array<{ amount: string; amountUSD?: string; token: { symbol: string; decimals: number } }>;
  };
  transactionRequest: LifiTxRequest;
}

export interface FetchQuoteArgs {
  fromChain: ChainId;
  toChain: ChainId;
  fromToken: string;   // resolved contract address or zero-address for native
  toToken: string;
  fromAmountWei: bigint;
  fromAddress: string; // wallet to quote for
  slippage?: number;   // decimal, default 0.005 = 0.5%
  signal?: AbortSignal;
}

export async function fetchLifiQuote(args: FetchQuoteArgs): Promise<LifiQuote> {
  const params = new URLSearchParams({
    fromChain: String(decimalChainId(args.fromChain)),
    toChain: String(decimalChainId(args.toChain)),
    fromToken: args.fromToken,
    toToken: args.toToken,
    fromAmount: args.fromAmountWei.toString(),
    fromAddress: args.fromAddress,
    slippage: String(args.slippage ?? 0.005),
  });
  const res = await fetch(`${LIFI_BASE}/quote?${params.toString()}`, { signal: args.signal });
  if (!res.ok) {
    // Li.Fi returns structured errors; surface the message if present.
    let detail = res.statusText;
    try {
      const body = (await res.json()) as { message?: string };
      if (body?.message) detail = body.message;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(`Li.Fi quote ${res.status}: ${detail}`);
  }
  return (await res.json()) as LifiQuote;
}

export type LifiStatusKind = 'PENDING' | 'DONE' | 'FAILED' | 'INVALID' | 'NOT_FOUND';

export interface LifiStatus {
  status: LifiStatusKind;
  substatus?: string;
  substatusMessage?: string;
  sending?: { txHash?: string; chainId?: number };
  receiving?: { txHash?: string; chainId?: number; amount?: string };
}

export async function fetchLifiStatus(args: {
  txHash: string;
  tool: string;
  fromChain: ChainId;
  toChain: ChainId;
  signal?: AbortSignal;
}): Promise<LifiStatus> {
  const params = new URLSearchParams({
    txHash: args.txHash,
    bridge: args.tool,
    fromChain: String(decimalChainId(args.fromChain)),
    toChain: String(decimalChainId(args.toChain)),
  });
  const res = await fetch(`${LIFI_BASE}/status?${params.toString()}`, { signal: args.signal });
  if (!res.ok) throw new Error(`Li.Fi status ${res.status}`);
  return (await res.json()) as LifiStatus;
}
