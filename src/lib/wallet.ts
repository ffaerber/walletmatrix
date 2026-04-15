// MetaMask / EIP-1193 helpers. All of these route through window.ethereum
// and will prompt the user for confirmation.

import { CHAINS_BY_ID } from './chains';
import { jsonRpc } from './rpc';
import type { ChainId } from './types';

// EIP-3085 error code for `wallet_switchEthereumChain` when the chain is
// not configured in the user's wallet yet.
const CHAIN_NOT_ADDED = 4902;

function getEthereum(): EthereumProvider {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask not detected');
  }
  return window.ethereum;
}

// Ask MetaMask to switch to `chainId`. If the chain isn't known to the
// wallet yet (code 4902), auto-add it using our registry entry.
export async function switchToChain(chainId: ChainId): Promise<void> {
  const chain = CHAINS_BY_ID[chainId];
  if (!chain) throw new Error(`Unknown chain ${chainId}`);
  const eth = getEthereum();
  try {
    await eth.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chain.chainId }],
    });
  } catch (e: unknown) {
    const err = e as { code?: number };
    if (err?.code !== CHAIN_NOT_ADDED) throw e;
    await eth.request({
      method: 'wallet_addEthereumChain',
      params: [
        {
          chainId: chain.chainId,
          chainName: chain.name,
          nativeCurrency: {
            name: chain.native,
            symbol: chain.native === 'xDAI' ? 'xDAI' : chain.native,
            decimals: 18,
          },
          rpcUrls: [chain.rpc],
        },
      ],
    });
  }
}

export interface RawTx {
  from: string;
  to: string;
  data?: string;
  value?: string;
  gas?: string;
  gasPrice?: string;
}

// Triggers a MetaMask signing prompt and returns the resulting tx hash.
export async function sendTransaction(tx: RawTx): Promise<string> {
  const eth = getEthereum();
  const hash = (await eth.request({
    method: 'eth_sendTransaction',
    params: [tx],
  })) as string;
  if (typeof hash !== 'string') throw new Error('MetaMask returned no tx hash');
  return hash;
}

// Polls eth_getTransactionReceipt until the transaction is mined or we time
// out. Uses the chain's public RPC (not the wallet) so a MetaMask
// disconnect doesn't halt polling.
export async function waitForReceipt(
  chainId: ChainId,
  txHash: string,
  timeoutMs = 180_000,
  pollMs = 3000,
): Promise<void> {
  const chain = CHAINS_BY_ID[chainId];
  if (!chain) throw new Error(`Unknown chain ${chainId}`);
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const receipt = await jsonRpc<{ status: string } | null>(
        chain.rpc,
        'eth_getTransactionReceipt',
        [txHash],
      );
      if (receipt) {
        if (receipt.status !== '0x1') {
          throw new Error(`Transaction reverted (status ${receipt.status})`);
        }
        return;
      }
    } catch (e) {
      // Propagate revert errors immediately; swallow transient network
      // errors so polling can continue.
      if (e instanceof Error && /reverted/i.test(e.message)) throw e;
    }
    await new Promise((r) => setTimeout(r, pollMs));
  }
  throw new Error('Receipt polling timed out');
}
