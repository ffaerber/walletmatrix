import { CHAINS } from './chains';
import { jsonRpc, hexToBigInt, formatUnits, toNumberSafe } from './rpc';
import { CG_IDS } from './tokens';
import type { ChainId, KnownTokens, Prices } from './types';

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

// --- native balance ping --------------------------------------------------
// Returns a map { [chainId]: nativeAmountFloat } for whichever chains replied.
// Any RPC failure is swallowed (allSettled) so one dead gateway can't wedge
// the whole scan.
export async function scanAllChains(
  address: string,
  onProgress?: (chainId: ChainId, amount: number) => void,
): Promise<Partial<Record<ChainId, number>>> {
  const results = await Promise.allSettled(
    CHAINS.map(async (chain) => {
      const hex = await jsonRpc<string>(chain.rpc, 'eth_getBalance', [address, 'latest']);
      const amount = toNumberSafe(formatUnits(hex, 18));
      onProgress?.(chain.id, amount);
      return { chainId: chain.id, amount };
    }),
  );
  const native: Partial<Record<ChainId, number>> = {};
  results.forEach((r) => {
    if (r.status === 'fulfilled') native[r.value.chainId] = r.value.amount;
  });
  return native;
}

// --- ERC-20 discovery -----------------------------------------------------
// With an Alchemy key we can enumerate every token the wallet has ever held
// via alchemy_getTokensForOwner. Without a key we fall back to probing a
// fixed list of well-known contracts with `eth_call balanceOf`.
export async function fetchErc20Balances(
  address: string,
  alchemyKey: string,
  knownTokens: KnownTokens,
): Promise<Partial<Record<ChainId, DiscoveredToken[]>>> {
  const byChain: Partial<Record<ChainId, DiscoveredToken[]>> = {};
  await Promise.allSettled(
    CHAINS.map(async (chain) => {
      if (alchemyKey && chain.alchemyNet) {
        const url = `https://${chain.alchemyNet}.g.alchemy.com/v2/${alchemyKey}`;
        try {
          const resp = await jsonRpc<AlchemyTokenResponse>(url, 'alchemy_getTokensForOwner', [address]);
          const tokens: DiscoveredToken[] = (resp?.tokens ?? [])
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
          byChain[chain.id] = tokens;
          return;
        } catch {
          /* fall through to known-token probe */
        }
      }
      // Fallback: call balanceOf on each known contract on this chain.
      const entries = knownTokens[chain.id] ?? [];
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
      byChain[chain.id] = out
        .filter((r): r is PromiseFulfilledResult<DiscoveredToken> =>
          r.status === 'fulfilled' && r.value.balance > 0,
        )
        .map((r) => r.value);
    }),
  );
  return byChain;
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
