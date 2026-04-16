// Default token catalog and CoinGecko ID mapping for price lookups.

import type { Balances, Token } from './types';

export const DEFAULT_TOKENS: Token[] = [
  { id: 'eth',   symbol: 'ETH',   name: 'Ether',           icon: 'Ξ', bg: '#293241', price: 3200, cgId: 'ethereum',        aliases: ['WETH'] },
  { id: 'usdc',  symbol: 'USDC',  name: 'USD Coin',        icon: '$', bg: '#0a2a4a', price: 1,    cgId: 'usd-coin' },
  { id: 'usdt',  symbol: 'USDT',  name: 'Tether',          icon: '₮', bg: '#0f3d2e', price: 1,    cgId: 'tether' },
  { id: 'dai',   symbol: 'DAI',   name: 'Dai Stablecoin',  icon: '◈', bg: '#4a3a0f', price: 1,    cgId: 'dai',             aliases: ['XDAI'] },
  { id: 'wbtc',  symbol: 'WBTC',  name: 'Wrapped Bitcoin', icon: '₿', bg: '#4a2a0a', price: 62000, cgId: 'wrapped-bitcoin' },
  { id: 'uni',   symbol: 'UNI',   name: 'Uniswap',         icon: 'U', bg: '#4a0a3a', price: 8.4,  cgId: 'uniswap' },
  { id: 'link',  symbol: 'LINK',  name: 'Chainlink',       icon: 'L', bg: '#0a2a6a', price: 14.2, cgId: 'chainlink' },
  { id: 'aave',  symbol: 'AAVE',  name: 'Aave',            icon: 'A', bg: '#4a1a2a', price: 132,  cgId: 'aave' },
  { id: 'op',    symbol: 'OP',    name: 'Optimism',        icon: 'O', bg: '#5a0a1a', price: 1.65, cgId: 'optimism' },
  { id: 'arb',   symbol: 'ARB',   name: 'Arbitrum',        icon: 'A', bg: '#0a3a5a', price: 0.52, cgId: 'arbitrum' },
  { id: 'matic', symbol: 'MATIC', name: 'Polygon',         icon: 'M', bg: '#3a0a5a', price: 0.41, cgId: 'matic-network',   aliases: ['POL'] },
];

// CoinGecko IDs for native currencies that aren't in DEFAULT_TOKENS.
// These are only needed for ad-hoc token rows created by the scanner
// when it encounters a chain whose native isn't in the catalog.
export const NATIVE_CG_IDS: Record<string, string> = {
  BNB:  'binancecoin',
  AVAX: 'avalanche-2',
  FTM:  'fantom',
  CELO: 'celo',
  MNT:  'mantle',
};

// Seed demo balances used when the user clicks "Continue with demo wallet".
// Keys are numeric EVM chain IDs as strings.
export const DEMO_BALANCES: Balances = {
  eth:   { '1': 1.842, '8453': 0.231, '42161': 0.512, '10': 0.104, '324': 0.05, '59144': 0.03, '534352': 0.02, '7777777': 0.012 },
  usdc:  { '1': 850, '8453': 1200, '42161': 400, '10': 250, '137': 640, '100': 120, '43114': 300 },
  usdt:  { '1': 500, '56': 820, '137': 330, '42161': 210, '43114': 110 },
  dai:   { '1': 120, '100': 900, '137': 45 },
  wbtc:  { '1': 0.0521, '42161': 0.0102 },
  uni:   { '1': 42.1, '42161': 18.3, '10': 9.7 },
  link:  { '1': 58.4, '56': 12.1, '137': 24.0 },
  aave:  { '1': 3.21, '137': 1.1, '43114': 0.5 },
  op:    { '10': 210 },
  arb:   { '42161': 512 },
  matic: { '137': 2400 },
};

// Starter 24h change data for the UI — replaced by real CoinGecko
// include_24hr_change values once the scanner runs.
export const DEMO_CHANGES: Record<string, number> = {
  ETH: 2.1, USDC: 0.01, USDT: -0.02, DAI: 0.0,
  WBTC: 3.4, UNI: -1.2, LINK: 4.8, AAVE: 1.9,
  OP: 5.3, ARB: -0.8, MATIC: -2.4,
};
