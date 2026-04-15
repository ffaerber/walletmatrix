// Default token catalog and CoinGecko ID mapping for price lookups.

export const DEFAULT_TOKENS = [
  { id: 'eth',   symbol: 'ETH',   name: 'Ether',           icon: 'Ξ', bg: '#293241', price: 3200 },
  { id: 'usdc',  symbol: 'USDC',  name: 'USD Coin',        icon: '$', bg: '#0a2a4a', price: 1 },
  { id: 'usdt',  symbol: 'USDT',  name: 'Tether',          icon: '₮', bg: '#0f3d2e', price: 1 },
  { id: 'dai',   symbol: 'DAI',   name: 'Dai Stablecoin',  icon: '◈', bg: '#4a3a0f', price: 1 },
  { id: 'wbtc',  symbol: 'WBTC',  name: 'Wrapped Bitcoin', icon: '₿', bg: '#4a2a0a', price: 62000 },
  { id: 'uni',   symbol: 'UNI',   name: 'Uniswap',         icon: 'U', bg: '#4a0a3a', price: 8.4 },
  { id: 'link',  symbol: 'LINK',  name: 'Chainlink',       icon: 'L', bg: '#0a2a6a', price: 14.2 },
  { id: 'aave',  symbol: 'AAVE',  name: 'Aave',            icon: 'A', bg: '#4a1a2a', price: 132 },
  { id: 'op',    symbol: 'OP',    name: 'Optimism',        icon: 'O', bg: '#5a0a1a', price: 1.65 },
  { id: 'arb',   symbol: 'ARB',   name: 'Arbitrum',        icon: 'A', bg: '#0a3a5a', price: 0.52 },
  { id: 'matic', symbol: 'MATIC', name: 'Polygon',         icon: 'M', bg: '#3a0a5a', price: 0.41 },
];

// Symbol → CoinGecko id for /simple/price lookups.
export const CG_IDS = {
  ETH: 'ethereum',
  USDC: 'usd-coin',
  USDT: 'tether',
  DAI: 'dai',
  WBTC: 'wrapped-bitcoin',
  UNI: 'uniswap',
  LINK: 'chainlink',
  AAVE: 'aave',
  OP: 'optimism',
  ARB: 'arbitrum',
  MATIC: 'matic-network',
  BNB: 'binancecoin',
  AVAX: 'avalanche-2',
  FTM: 'fantom',
  CELO: 'celo',
  MNT: 'mantle',
  XDAI: 'xdai',
};

// Seed demo balances used when the user clicks "Continue with demo wallet".
export const DEMO_BALANCES = {
  eth:   { eth: 1.842, base: 0.231, arb: 0.512, op: 0.104, zks: 0.05,  linea: 0.03, scrl: 0.02, zora: 0.012 },
  usdc:  { eth: 850, base: 1200, arb: 400, op: 250, poly: 640, gno: 120, avax: 300 },
  usdt:  { eth: 500, bnb: 820, poly: 330, arb: 210, avax: 110 },
  dai:   { eth: 120, gno: 900, poly: 45 },
  wbtc:  { eth: 0.0521, arb: 0.0102 },
  uni:   { eth: 42.1, arb: 18.3, op: 9.7 },
  link:  { eth: 58.4, bnb: 12.1, poly: 24.0 },
  aave:  { eth: 3.21, poly: 1.1, avax: 0.5 },
  op:    { op: 210 },
  arb:   { arb: 512 },
  matic: { poly: 2400 },
};

// Starter 24h change data for the UI — replaced by real CoinGecko
// include_24hr_change values once the scanner runs.
export const DEMO_CHANGES = {
  ETH: 2.1, USDC: 0.01, USDT: -0.02, DAI: 0.0,
  WBTC: 3.4, UNI: -1.2, LINK: 4.8, AAVE: 1.9,
  OP: 5.3, ARB: -0.8, MATIC: -2.4,
};
