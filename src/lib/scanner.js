import { CHAINS } from './chains.js';
import { jsonRpc, hexToBigInt, formatUnits, toNumberSafe } from './rpc.js';
import { CG_IDS } from './tokens.js';

// --- native balance ping --------------------------------------------------
// Returns a map { [chainId]: nativeAmountFloat } for whichever chains replied.
// Any RPC failure is swallowed (allSettled) so one dead gateway can't wedge
// the whole scan.
export async function scanAllChains(address, onProgress) {
  const results = await Promise.allSettled(
    CHAINS.map(async (chain) => {
      const hex = await jsonRpc(chain.rpc, 'eth_getBalance', [address, 'latest']);
      const amount = toNumberSafe(formatUnits(hex, 18));
      onProgress?.(chain.id, amount);
      return { chainId: chain.id, amount };
    }),
  );
  const native = {};
  results.forEach((r) => {
    if (r.status === 'fulfilled') native[r.value.chainId] = r.value.amount;
  });
  return native;
}

// --- ERC-20 discovery -----------------------------------------------------
// With an Alchemy key we can enumerate every token the wallet has ever held
// via alchemy_getTokensForOwner. Without a key we fall back to probing a
// fixed list of well-known contracts with `eth_call balanceOf`.
export async function fetchErc20Balances(address, alchemyKey, knownTokens) {
  const byChain = {}; // { chainId: [{ symbol, name, decimals, balance, contract }] }
  await Promise.allSettled(
    CHAINS.map(async (chain) => {
      if (alchemyKey && chain.alchemyNet) {
        const url = `https://${chain.alchemyNet}.g.alchemy.com/v2/${alchemyKey}`;
        try {
          const resp = await jsonRpc(url, 'alchemy_getTokensForOwner', [address]);
          const tokens = (resp?.tokens || [])
            .filter((t) => t?.rawBalance && t.rawBalance !== '0')
            .map((t) => ({
              symbol: (t.symbol || '').toUpperCase(),
              name: t.name || t.symbol || 'Unknown',
              decimals: t.decimals ?? 18,
              balance: toNumberSafe(formatUnits(BigInt(t.rawBalance), t.decimals ?? 18)),
              contract: t.contractAddress,
              logo: t.logo || null,
            }));
          byChain[chain.id] = tokens;
          return;
        } catch {
          /* fall through to known-token probe */
        }
      }
      // Fallback: call balanceOf on each known contract on this chain.
      const entries = (knownTokens?.[chain.id] || []);
      const selector = '0x70a08231'; // keccak256("balanceOf(address)")[:4]
      const addrPadded = address.replace(/^0x/, '').padStart(64, '0');
      const data = selector + addrPadded;
      const out = await Promise.allSettled(
        entries.map(async (t) => {
          const raw = await jsonRpc(chain.rpc, 'eth_call', [
            { to: t.contract, data },
            'latest',
          ]);
          const bal = toNumberSafe(formatUnits(hexToBigInt(raw), t.decimals));
          return { ...t, balance: bal };
        }),
      );
      byChain[chain.id] = out
        .filter((r) => r.status === 'fulfilled' && r.value.balance > 0)
        .map((r) => r.value);
    }),
  );
  return byChain;
}

// --- prices ---------------------------------------------------------------
// Keyless CoinGecko batch lookup — 24h change included.
export async function fetchPrices(symbols) {
  const unique = [...new Set(symbols.map((s) => s.toUpperCase()))].filter((s) => CG_IDS[s]);
  if (!unique.length) return {};
  const ids = unique.map((s) => CG_IDS[s]).join(',');
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('coingecko ' + res.status);
    const data = await res.json();
    const out = {};
    unique.forEach((sym) => {
      const entry = data[CG_IDS[sym]];
      if (entry) out[sym] = { price: entry.usd, change: entry.usd_24h_change ?? 0 };
    });
    return out;
  } catch {
    return {};
  }
}
