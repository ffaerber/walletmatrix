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

async function fetchSupportedChainIds(): Promise<Set<number>> {
  try {
    const res = await fetch(`${LIFI_BASE}/chains`);
    if (!res.ok) return new Set();
    const data = (await res.json()) as { chains?: Array<{ id?: number }> };
    return new Set((data.chains ?? []).map((c) => c.id).filter((id): id is number => typeof id === 'number'));
  } catch {
    return new Set();
  }
}

async function loadTokens(): Promise<TokenCache> {
  // Li.Fi returns 400 if any chain in `chains=` is unsupported, so intersect
  // our wishlist with what Li.Fi actually supports before requesting tokens.
  const supported = await fetchSupportedChainIds();
  const ours = supported.size
    ? CHAIN_IDS.filter((id) => supported.has(id))
    : CHAIN_IDS;
  if (!ours.length) return {};
  let res = await fetch(`${LIFI_BASE}/tokens?chains=${ours.join(',')}`);
  // If /v1/chains didn't narrow the list (network error, unexpected shape),
  // a single unsupported chain still makes Li.Fi return 400. Retry unfiltered
  // and let the grouping below pick out the chains we actually care about.
  if (res.status === 400 && supported.size === 0) {
    res = await fetch(`${LIFI_BASE}/tokens`);
  }
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

// Synchronous check — returns false if the cache hasn't loaded yet.
// Use for UI hints (drag targets), not for blocking decisions.
export function lifiHasToken(symbol: string, chainId: string): boolean {
  if (!cache) return false;
  return !!cache[chainId]?.[symbol.toUpperCase()];
}

// Returns the set of chain IDs where the token (or any of its aliases)
// exists in Li.Fi's list. Excludes the source chain.
export function getValidBridgeTargets(
  symbol: string,
  aliases: string[],
  sourceChainId: string,
): Set<string> {
  if (!cache) return new Set();
  const syms = [symbol, ...aliases].map((s) => s.toUpperCase());
  const out = new Set<string>();
  for (const chainId of Object.keys(cache)) {
    if (chainId === sourceChainId) continue;
    if (syms.some((s) => !!cache![chainId]?.[s])) out.add(chainId);
  }
  return out;
}

// Pre-warm the cache. Call early (e.g. after initChains) so the sync
// checks work by the time the user starts dragging.
export async function preloadLifiTokens(): Promise<void> {
  await ensureCache();
}
