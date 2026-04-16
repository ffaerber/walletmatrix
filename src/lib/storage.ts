import type { ChainId, ScanCache, Token } from './types';

const HIDDEN_TOKENS_KEY = 'wm_hidden_tokens';
const HIDDEN_CHAINS_KEY = 'wm_hidden_chains';
const CUSTOM_TOKENS_KEY = 'wm_custom_tokens';
const TOKEN_ORDER_KEY = 'wm_token_order';
const CHAIN_ORDER_KEY = 'wm_chain_order';
const CURRENCY_KEY = 'wm_currency';
const SCAN_CACHE_PREFIX = 'wm_scan_'; // wm_scan_<lowercaseAddress>
const SCAN_CACHE_VERSION = 2; // bumped: chain IDs changed to numeric strings

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode, quota, etc. — silently drop */
  }
}

function cacheKey(address: string): string {
  return SCAN_CACHE_PREFIX + address.toLowerCase();
}

export const storage = {
  // --- hidden tokens ------------------------------------------------------
  getHidden: (): Set<string> => new Set(read<string[]>(HIDDEN_TOKENS_KEY, [])),
  setHidden: (set: Set<string>): void => write(HIDDEN_TOKENS_KEY, [...set]),

  // --- hidden chains ------------------------------------------------------
  getHiddenChains: (): Set<ChainId> =>
    new Set(read<ChainId[]>(HIDDEN_CHAINS_KEY, [])),
  setHiddenChains: (set: Set<ChainId>): void =>
    write(HIDDEN_CHAINS_KEY, [...set]),

  // --- token order ---------------------------------------------------------
  getTokenOrder: (): string[] => read<string[]>(TOKEN_ORDER_KEY, []),
  setTokenOrder: (list: string[]): void => write(TOKEN_ORDER_KEY, list),

  // --- chain order ---------------------------------------------------------
  getChainOrder: (): string[] => read<string[]>(CHAIN_ORDER_KEY, []),
  setChainOrder: (list: string[]): void => write(CHAIN_ORDER_KEY, list),

  // --- currency ------------------------------------------------------------
  getCurrency: (): string => read<string>(CURRENCY_KEY, 'usd'),
  setCurrency: (c: string): void => write(CURRENCY_KEY, c),

  // --- custom tokens ------------------------------------------------------
  getCustom: (): Token[] => read<Token[]>(CUSTOM_TOKENS_KEY, []),
  setCustom: (list: Token[]): void => write(CUSTOM_TOKENS_KEY, list),

  // --- per-address scan cache --------------------------------------------
  // Stored separately per address so switching wallets doesn't cross-pollute.
  // `version` mismatches are treated as cache misses so we can change the
  // stored shape without manual migration.
  getScanCache: (address: string): ScanCache | null => {
    const cached = read<ScanCache | null>(cacheKey(address), null);
    if (!cached || cached.version !== SCAN_CACHE_VERSION) return null;
    return cached;
  },
  setScanCache: (
    address: string,
    data: Omit<ScanCache, 'version' | 'updatedAt'>,
  ): void => {
    const payload: ScanCache = {
      version: SCAN_CACHE_VERSION,
      updatedAt: Date.now(),
      ...data,
    };
    write(cacheKey(address), payload);
  },
  clearScanCache: (address?: string): void => {
    try {
      if (address) {
        localStorage.removeItem(cacheKey(address));
        return;
      }
      // Clear all cache entries.
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith(SCAN_CACHE_PREFIX)) localStorage.removeItem(k);
      }
    } catch {
      /* noop */
    }
  },
};

export { SCAN_CACHE_VERSION };
