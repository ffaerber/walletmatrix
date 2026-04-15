import { describe, it, expect } from 'vitest';
import { CHAINS, CHAINS_BY_ID, chainByChainId } from './chains';

describe('chain registry', () => {
  it('contains all 15 chains from the spec', () => {
    expect(CHAINS).toHaveLength(15);
  });

  it('every chain id is unique', () => {
    const ids = CHAINS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every chain has a https RPC URL', () => {
    for (const c of CHAINS) {
      expect(c.rpc).toMatch(/^https:\/\//);
    }
  });

  it('CHAINS_BY_ID exposes every chain', () => {
    for (const c of CHAINS) {
      expect(CHAINS_BY_ID[c.id]).toBe(c);
    }
  });

  describe('chainByChainId', () => {
    it('finds a chain by its hex id (case-insensitive)', () => {
      expect(chainByChainId('0x1')?.id).toBe('eth');
      expect(chainByChainId('0X1')?.id).toBe('eth');
      expect(chainByChainId('0xA4B1')?.id).toBe('arb');
    });

    it('returns null when no chain matches', () => {
      expect(chainByChainId('0xdeadbeef')).toBeNull();
    });
  });
});
