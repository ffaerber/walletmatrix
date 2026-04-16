import { describe, it, expect, beforeAll } from 'vitest';
import { CHAINS, CHAINS_BY_ID, chainByChainId, initChains, MAINNET_IDS, TESTNET_IDS } from './chains';

describe('chain registry', () => {
  beforeAll(async () => {
    // initChains fetches from the registry; in tests the fetch will fail
    // so we get fallback-built chains. That's fine — we test the shape.
    await initChains();
  });

  it('loads all configured chain IDs', () => {
    const expected = MAINNET_IDS.length + TESTNET_IDS.length;
    expect(CHAINS).toHaveLength(expected);
  });

  it('every chain id is unique', () => {
    const ids = CHAINS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('chain ids are numeric strings', () => {
    for (const c of CHAINS) {
      expect(Number(c.id)).not.toBeNaN();
    }
  });

  it('CHAINS_BY_ID exposes every chain', () => {
    for (const c of CHAINS) {
      expect(CHAINS_BY_ID[c.id]).toBe(c);
    }
  });

  describe('chainByChainId', () => {
    it('finds a chain by its hex id (case-insensitive)', () => {
      expect(chainByChainId('0x1')?.id).toBe('1');
      expect(chainByChainId('0X1')?.id).toBe('1');
    });

    it('returns null when no chain matches', () => {
      expect(chainByChainId('0xdeadbeef')).toBeNull();
    });
  });
});
