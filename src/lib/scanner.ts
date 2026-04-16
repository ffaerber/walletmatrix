import { CHAINS } from './chains';
import { jsonRpc, hexToBigInt, formatUnits, toNumberSafe } from './rpc';
import { CG_IDS } from './tokens';
import type { Chain, ChainId, KnownTokens, Prices } from './types';

export interface DiscoveredToken {
  id?: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: number;
  contract: string;
  logo?: string | null;
}

interface AlchemyTokenResponse {
  tokens?: Array<{
    symbol?: string;
    name?: string;
    decimals?: number;
    rawBalance?: string;
    contractAddress: string;
    logo?: string | null;
  }>;
}

// Result of scanning a single chain (native + ERC-20).
export interface ChainScanResult {
  chainId: ChainId;
  native: number;
  erc20: DiscoveredToken[];
}

// --- sequential per-chain scan -----------------------------------------------
// Scans each chain one at a time, ordered by the CHAINS array (which is sorted
// by numeric chain ID). Each chain does native balance + ERC-20 discovery.
// A dead RPC never wedges the scan — errors are swallowed per chain.
export async function scanChainsSequential(
  address: string,
  alchemyKey: string,
  knownTokens: KnownTokens,
  onChainStart?: (chainId: ChainId) => void,
  onChainDone?: (result: ChainScanResult) => void,
): Promise<ChainScanResult[]> {
  const results: ChainScanResult[] = [];

  for (const chain of CHAINS) {
    onChainStart?.(chain.id);

    let native = 0;
    try {
      const hex = await jsonRpc<string>(chain.rpc, 'eth_getBalance', [address, 'latest']);
      native = toNumberSafe(formatUnits(hex, 18));
    } catch { /* swallow — dead RPC */ }

    let erc20: DiscoveredToken[] = [];
    try {
      erc20 = await scanChainErc20(address, chain, alchemyKey, knownTokens);
    } catch { /* swallow */ }

    const result: ChainScanResult = { chainId: chain.id, native, erc20 };
    results.push(result);
    onChainDone?.(result);
  }

  return results;
}

// --- per-chain ERC-20 discovery ---------------------------------------------
async function scanChainErc20(
  address: string,
  chain: Chain,
  alchemyKey: string,
  knownTokens: KnownTokens,
): Promise<DiscoveredToken[]> {
  // Alchemy path — enumerate every token the wallet has ever held.
  if (alchemyKey && chain.alchemyNet) {
    const url = `https://${chain.alchemyNet}.g.alchemy.com/v2/${alchemyKey}`;
    try {
      const resp = await jsonRpc<AlchemyTokenResponse>(url, 'alchemy_getTokensForOwner', [address]);
      return (resp?.tokens ?? [])
        .filter((t) => t?.rawBalance && t.rawBalance !== '0')
        .map((t) => {
          const decimals = t.decimals ?? 18;
          return {
            symbol: (t.symbol ?? '').toUpperCase(),
            name: t.name ?? t.symbol ?? 'Unknown',
            decimals,
            balance: toNumberSafe(formatUnits(BigInt(t.rawBalance ?? '0'), decimals)),
            contract: t.contractAddress,
            logo: t.logo ?? null,
          };
        });
    } catch {
      /* fall through to known-token probe */
    }
  }

  // Fallback: call balanceOf on each known contract on this chain.
  const entries = knownTokens[chain.id] ?? [];
  if (!entries.length) return [];

  const selector = '0x70a08231'; // keccak256("balanceOf(address)")[:4]
  const addrPadded = address.replace(/^0x/, '').padStart(64, '0');
  const data = selector + addrPadded;

  const out = await Promise.allSettled(
    entries.map(async (t): Promise<DiscoveredToken> => {
      const raw = await jsonRpc<string>(chain.rpc, 'eth_call', [
        { to: t.contract, data },
        'latest',
      ]);
      const bal = toNumberSafe(formatUnits(hexToBigInt(raw), t.decimals));
      return {
        id: t.id,
        symbol: t.symbol,
        name: t.name,
        decimals: t.decimals,
        balance: bal,
        contract: t.contract,
      };
    }),
  );

  return out
    .filter((r): r is PromiseFulfilledResult<DiscoveredToken> =>
      r.status === 'fulfilled' && r.value.balance > 0,
    )
    .map((r) => r.value);
}

// --- prices ---------------------------------------------------------------
// Keyless CoinGecko batch lookup — 24h change included.
interface CoinGeckoEntry {
  usd: number;
  usd_24h_change?: number;
}

export async function fetchPrices(symbols: string[]): Promise<Prices> {
  const unique = [...new Set(symbols.map((s) => s.toUpperCase()))].filter((s) => CG_IDS[s]);
  if (!unique.length) return {};
  const ids = unique.map((s) => CG_IDS[s]).join(',');
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('coingecko ' + res.status);
    const data = (await res.json()) as Record<string, CoinGeckoEntry>;
    const out: Prices = {};
    unique.forEach((sym) => {
      const entry = data[CG_IDS[sym]];
      if (entry) out[sym] = { price: entry.usd, change: entry.usd_24h_change ?? 0 };
    });
    return out;
  } catch {
    return {};
  }
}
