// Central type definitions shared across the app.

// Chain IDs are numeric EVM chain IDs stored as strings (e.g. "1", "137").
// No longer a fixed union — chains are loaded dynamically from the
// ethereum-lists/chains registry at startup.
export type ChainId = string;

export interface Chain {
  id: ChainId;
  name: string;
  short: string;
  chainId: string;     // hex chain id for wallet_switchEthereumChain
  color: string;
  icon: string;
  rpc: string;
  alchemyNet: string | null;
  twPath: string;
  native: string;
  logo: string;
}

export interface Token {
  id: string;
  symbol: string;
  name: string;
  icon: string;
  bg: string;
  price: number;
  // CoinGecko coin ID — the canonical cross-chain identity for this asset.
  // Used for price lookups and to determine "same token, different chain."
  cgId?: string;
  logoUrl?: string | null;
  custom?: boolean;
  address?: string | null;
  // Other symbols that map to the same row (e.g. ETH aliases WETH,
  // DAI aliases XDAI). Driven by the eip155 nativeCurrency.symbol.
  aliases?: string[];
}

// BALANCES[tokenId][chainId] = amount
export type Balances = Record<string, Record<string, number>>;

export interface PriceEntry {
  price: number;
  change: number;
}
export type Prices = Record<string, PriceEntry>;

export interface KnownTokenEntry {
  id: string;
  symbol: string;
  name: string;
  decimals: number;
  contract: string;
}
export type KnownTokens = Partial<Record<ChainId, KnownTokenEntry[]>>;

export interface TransferIntent {
  fromTid: string;
  fromNid: ChainId;
  fromAmount: number;
  toTid: string;
  toNid: ChainId;
}

export interface HistoryCell {
  tid: string;
  nid: ChainId;
}

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

export interface CustomTokenDraft {
  symbol: string;
  name: string;
  price: string;
  icon: string;
  address: string;
}

// Per-address snapshot stored in localStorage so repeat visits don't need
// to re-scan 15 chains. `version` lets us invalidate on shape changes.
export interface ScanCache {
  version: number;
  updatedAt: number;      // epoch ms
  balances: Balances;
  prices: Prices;
}
