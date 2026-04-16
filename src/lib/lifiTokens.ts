// Lazy-loaded cache of token addresses from the Li.Fi API.
// Lets us resolve any bridgeable token's contract address on any chain,
// even if it's not in our local knownTokens table.

import { CHAIN_IDS } from './chains';

const LIFI_BASE = 'https://li.quest/v1';

interface LifiTokenEntry {
  address: string;
  symbol: string;
  decimals: number;
  chainId: number;
  name: string;
  logoURI?: string;
}

// { chainId: { SYMBOL_UPPER: { address, decimals } } }
type TokenCache = Record<string, Record<string, { address: string; decimals: number }>>;

let cache: TokenCache | null = null;
let pending: Promise<TokenCache> | null = null;

async function loadTokens(): Promise<TokenCache> {
  const chains = CHAIN_IDS.join(',');
  const res = await fetch(`${LIFI_BASE}/tokens?chains=${chains}`);
  if (!res.ok) throw new Error(`Li.Fi tokens ${res.status}`);
  const data = (await res.json()) as { tokens: Record<string, LifiTokenEntry[]> };
  const out: TokenCache = {};
  for (const [chainId, tokens] of Object.entries(data.tokens)) {
    out[chainId] = {};
    for (const t of tokens) {
      // First entry per symbol wins (Li.Fi lists canonical addresses first).
      const key = t.symbol.toUpperCase();
      if (!out[chainId][key]) {
        out[chainId][key] = { address: t.address, decimals: t.decimals };
      }
    }
  }
  return out;
}

async function ensureCache(): Promise<TokenCache> {
  if (cache) return cache;
  if (!pending) {
    pending = loadTokens()
      .then((c) => { cache = c; return c; })
      .catch(() => { pending = null; return {} as TokenCache; });
  }
  return pending;
}

// Resolve a token's contract address on a given chain via the Li.Fi API.
// Returns null if Li.Fi doesn't support that token on that chain.
export async function lifiResolveToken(
  symbol: string,
  chainId: string,
): Promise<{ address: string; decimals: number } | null> {
  const c = await ensureCache();
  return c[chainId]?.[symbol.toUpperCase()] ?? null;
}
