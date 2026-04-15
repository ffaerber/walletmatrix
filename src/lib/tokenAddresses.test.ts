import { describe, it, expect } from 'vitest';
import {
  NATIVE_ADDRESS,
  decimalChainId,
  resolveTokenAddress,
  resolveTokenDecimals,
} from './tokenAddresses';
import type { Token } from './types';

const eth: Token = { id: 'eth', symbol: 'ETH', name: 'Ether', icon: 'Ξ', bg: '#000', price: 3200 };
const usdc: Token = { id: 'usdc', symbol: 'USDC', name: 'USD Coin', icon: '$', bg: '#000', price: 1 };
const matic: Token = { id: 'matic', symbol: 'MATIC', name: 'Polygon', icon: 'M', bg: '#000', price: 0.4 };
const dai: Token = { id: 'dai', symbol: 'DAI', name: 'Dai', icon: '◈', bg: '#000', price: 1 };

describe('resolveTokenAddress', () => {
  it('returns the zero address for a native token', () => {
    expect(resolveTokenAddress(eth, 'eth')).toBe(NATIVE_ADDRESS);
    // ETH is also native on L2s that use ETH for gas.
    expect(resolveTokenAddress(eth, 'base')).toBe(NATIVE_ADDRESS);
    expect(resolveTokenAddress(eth, 'arb')).toBe(NATIVE_ADDRESS);
  });

  it('treats MATIC as native on Polygon only', () => {
    expect(resolveTokenAddress(matic, 'poly')).toBe(NATIVE_ADDRESS);
    // On Ethereum MATIC is an ERC-20, handled via knownTokens.
    expect(resolveTokenAddress(matic, 'eth')).not.toBe(NATIVE_ADDRESS);
  });

  it('treats DAI as native on Gnosis (xDAI)', () => {
    expect(resolveTokenAddress(dai, 'gno')).toBe(NATIVE_ADDRESS);
  });

  it('resolves ERC-20 contract addresses from the known-token table', () => {
    const addr = resolveTokenAddress(usdc, 'eth');
    expect(addr).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(addr).not.toBe(NATIVE_ADDRESS);
  });

  it('returns null when the token is not known on the target chain', () => {
    expect(resolveTokenAddress(dai, 'zora')).toBeNull();
  });

  it('prefers a custom token\'s own address field', () => {
    const custom: Token = {
      id: 'bzz', symbol: 'BZZ', name: 'Swarm', icon: 'B', bg: '#f90', price: 0.25,
      address: '0x19062190b1925b5b6689d7073fdfc8c2976ef8cb',
    };
    expect(resolveTokenAddress(custom, 'eth')).toBe(custom.address);
  });
});

describe('resolveTokenDecimals', () => {
  it('returns 18 for natives', () => {
    expect(resolveTokenDecimals(eth, 'eth')).toBe(18);
    expect(resolveTokenDecimals(matic, 'poly')).toBe(18);
  });

  it('returns USDC as 6 on Ethereum (per knownTokens)', () => {
    expect(resolveTokenDecimals(usdc, 'eth')).toBe(6);
  });

  it('falls back to 18 when unknown', () => {
    expect(resolveTokenDecimals(dai, 'zora')).toBe(18);
  });
});

describe('decimalChainId', () => {
  it('converts hex chain ids to decimals', () => {
    expect(decimalChainId('eth')).toBe(1);
    expect(decimalChainId('arb')).toBe(42161);
    expect(decimalChainId('poly')).toBe(137);
  });
});
