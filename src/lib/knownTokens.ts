// Fallback contract addresses used when no Alchemy key is configured.
// Keyed by numeric chain ID (as string), each entry maps to our token id.

import type { KnownTokens } from './types';

export const KNOWN_TOKENS: KnownTokens = {
  '1': [
    { id: 'usdc', symbol: 'USDC', name: 'USD Coin',        decimals: 6,  contract: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
    { id: 'usdt', symbol: 'USDT', name: 'Tether',          decimals: 6,  contract: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },
    { id: 'dai',  symbol: 'DAI',  name: 'Dai Stablecoin',  decimals: 18, contract: '0x6B175474E89094C44Da98b954EedeAC495271d0F' },
    { id: 'wbtc', symbol: 'WBTC', name: 'Wrapped Bitcoin', decimals: 8,  contract: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599' },
    { id: 'uni',  symbol: 'UNI',  name: 'Uniswap',         decimals: 18, contract: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984' },
    { id: 'link', symbol: 'LINK', name: 'Chainlink',       decimals: 18, contract: '0x514910771AF9Ca656af840dff83E8264EcF986CA' },
    { id: 'aave', symbol: 'AAVE', name: 'Aave',            decimals: 18, contract: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9' },
  ],
  '8453': [
    { id: 'usdc', symbol: 'USDC', name: 'USD Coin', decimals: 6, contract: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' },
  ],
  '42161': [
    { id: 'usdc', symbol: 'USDC', name: 'USD Coin', decimals: 6,  contract: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' },
    { id: 'usdt', symbol: 'USDT', name: 'Tether',   decimals: 6,  contract: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9' },
    { id: 'arb',  symbol: 'ARB',  name: 'Arbitrum', decimals: 18, contract: '0x912CE59144191C1204E64559FE8253a0e49E6548' },
  ],
  '10': [
    { id: 'usdc', symbol: 'USDC', name: 'USD Coin', decimals: 6,  contract: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85' },
    { id: 'op',   symbol: 'OP',   name: 'Optimism', decimals: 18, contract: '0x4200000000000000000000000000000000000042' },
  ],
  '137': [
    { id: 'usdc',  symbol: 'USDC',  name: 'USD Coin', decimals: 6,  contract: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' },
    { id: 'usdt',  symbol: 'USDT',  name: 'Tether',   decimals: 6,  contract: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F' },
    { id: 'dai',   symbol: 'DAI',   name: 'Dai',      decimals: 18, contract: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063' },
    { id: 'matic', symbol: 'MATIC', name: 'Polygon',  decimals: 18, contract: '0x0000000000000000000000000000000000001010' },
  ],
  '56': [
    { id: 'usdc', symbol: 'USDC', name: 'USD Coin', decimals: 18, contract: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d' },
    { id: 'usdt', symbol: 'USDT', name: 'Tether',   decimals: 18, contract: '0x55d398326f99059fF775485246999027B3197955' },
  ],
  '100': [
    { id: 'usdc', symbol: 'USDC', name: 'USD Coin', decimals: 6,  contract: '0xDDAfbb505ad214D7b80b1f830fcCc89B60fb7A83' },
    { id: 'dai',  symbol: 'DAI',  name: 'xDAI',     decimals: 18, contract: '0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d' },
  ],
  '43114': [
    { id: 'usdc', symbol: 'USDC', name: 'USD Coin', decimals: 6, contract: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E' },
    { id: 'usdt', symbol: 'USDT', name: 'Tether',   decimals: 6, contract: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7' },
  ],
};
