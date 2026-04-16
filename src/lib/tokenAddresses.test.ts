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
    expect(resolveTokenAddress(eth, '1')).toBe(NATIVE_ADDRESS);
    // ETH is also native on L2s that use ETH for gas.
    expect(resolveTokenAddress(eth, '8453')).toBe(NATIVE_ADDRESS);
    expect(resolveTokenAddress(eth, '42161')).toBe(NATIVE_ADDRESS);
  });

  it('treats MATIC as native on Polygon only', () => {
    expect(resolveTokenAddress(matic, '137')).toBe(NATIVE_ADDRESS);
    // On Ethereum MATIC is an ERC-20, handled via knownTokens.
    expect(resolveTokenAddress(matic, '1')).not.toBe(NATIVE_ADDRESS);
  });

  it('treats DAI as native on Gnosis (xDAI)', () => {
    expect(resolveTokenAddress(dai, '100')).toBe(NATIVE_ADDRESS);
  });

  it('resolves ERC-20 contract addresses from the known-token table', () => {
    const addr = resolveTokenAddress(usdc, '1');
    expect(addr).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(addr).not.toBe(NATIVE_ADDRESS);
  });

  it('returns null when the token is not known on the target chain', () => {
    expect(resolveTokenAddress(dai, '7777777')).toBeNull();
  });

  it('prefers a custom token\'s own address field', () => {
    const custom: Token = {
      id: 'bzz', symbol: 'BZZ', name: 'Swarm', icon: 'B', bg: '#f90', price: 0.25,
      address: '0x19062190b1925b5b6689d7073fdfc8c2976ef8cb',
    };
    expect(resolveTokenAddress(custom, '1')).toBe(custom.address);
  });
});

describe('resolveTokenDecimals', () => {
  it('returns 18 for natives', () => {
    expect(resolveTokenDecimals(eth, '1')).toBe(18);
    expect(resolveTokenDecimals(matic, '137')).toBe(18);
  });

  it('returns USDC as 6 on Ethereum (per knownTokens)', () => {
    expect(resolveTokenDecimals(usdc, '1')).toBe(6);
  });

  it('falls back to 18 when unknown', () => {
    expect(resolveTokenDecimals(dai, '7777777')).toBe(18);
  });
});

describe('decimalChainId', () => {
  it('converts hex chain ids to decimals', () => {
    expect(decimalChainId('1')).toBe(1);
    expect(decimalChainId('42161')).toBe(42161);
    expect(decimalChainId('137')).toBe(137);
  });
});
