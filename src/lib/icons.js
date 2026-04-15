import { CHAINS_BY_ID } from './chains.js';

// Token logos come from the Trust Wallet CDN keyed by checksummed contract.
// For our canonical token ids we hard-code the Ethereum mainnet address since
// the CDN mirrors the same logo for every chain copy of the token.
const TW_ETH = (addr) =>
  `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${addr}/logo.png`;

export const TOKEN_LOGOS = {
  eth:   TW_ETH('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'),
  usdc:  TW_ETH('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'),
  usdt:  TW_ETH('0xdAC17F958D2ee523a2206206994597C13D831ec7'),
  dai:   TW_ETH('0x6B175474E89094C44Da98b954EedeAC495271d0F'),
  wbtc:  TW_ETH('0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'),
  uni:   TW_ETH('0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984'),
  link:  TW_ETH('0x514910771AF9Ca656af840dff83E8264EcF986CA'),
  aave:  TW_ETH('0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9'),
  op:    TW_ETH('0x4200000000000000000000000000000000000042'),
  arb:   TW_ETH('0x912CE59144191C1204E64559FE8253a0e49E6548'),
  matic: TW_ETH('0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0'),
};

export function tokenLogoUrl(token) {
  if (!token) return null;
  if (token.logoUrl) return token.logoUrl;
  return TOKEN_LOGOS[token.id] || null;
}

export function chainLogoUrl(chainId) {
  return CHAINS_BY_ID[chainId]?.logo || null;
}
