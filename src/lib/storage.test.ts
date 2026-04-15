import { describe, it, expect, beforeEach } from 'vitest';
import { storage, SCAN_CACHE_VERSION } from './storage';
import type { Balances, Prices, Token } from './types';

describe('storage — hidden tokens', () => {
  beforeEach(() => localStorage.clear());

  it('defaults to an empty Set', () => {
    expect(storage.getHidden().size).toBe(0);
  });

  it('round-trips a Set', () => {
    storage.setHidden(new Set(['usdc', 'dai']));
    const read = storage.getHidden();
    expect(read).toBeInstanceOf(Set);
    expect(read.has('usdc')).toBe(true);
    expect(read.has('dai')).toBe(true);
    expect(read.has('eth')).toBe(false);
  });

  it('falls back to an empty Set if JSON is malformed', () => {
    localStorage.setItem('wm_hidden_tokens', 'not-json');
    expect(storage.getHidden().size).toBe(0);
  });
});

describe('storage — hidden chains', () => {
  beforeEach(() => localStorage.clear());

  it('defaults to an empty Set', () => {
    expect(storage.getHiddenChains().size).toBe(0);
  });

  it('round-trips a Set of chain ids', () => {
    storage.setHiddenChains(new Set(['zora', 'celo']));
    const read = storage.getHiddenChains();
    expect(read.has('zora')).toBe(true);
    expect(read.has('celo')).toBe(true);
    expect(read.has('eth')).toBe(false);
  });
});

describe('storage — custom tokens', () => {
  beforeEach(() => localStorage.clear());

  it('round-trips the list', () => {
    const list: Token[] = [
      { id: 'bzz', symbol: 'BZZ', name: 'Swarm', icon: 'B', bg: '#f90', price: 0.25, custom: true },
    ];
    storage.setCustom(list);
    expect(storage.getCustom()).toEqual(list);
  });
});

describe('storage — scan cache', () => {
  const ADDR = '0xAbC0000000000000000000000000000000000000';
  const balances: Balances = { eth: { eth: 1.5 }, usdc: { eth: 100 } };
  const prices: Prices = { ETH: { price: 3200, change: 2.1 } };

  beforeEach(() => localStorage.clear());

  it('returns null when no cache exists', () => {
    expect(storage.getScanCache(ADDR)).toBeNull();
  });

  it('round-trips balances+prices and stamps updatedAt', () => {
    const before = Date.now();
    storage.setScanCache(ADDR, { balances, prices });
    const cache = storage.getScanCache(ADDR);
    expect(cache).not.toBeNull();
    expect(cache!.version).toBe(SCAN_CACHE_VERSION);
    expect(cache!.updatedAt).toBeGreaterThanOrEqual(before);
    expect(cache!.balances).toEqual(balances);
    expect(cache!.prices).toEqual(prices);
  });

  it('keys by lowercased address', () => {
    storage.setScanCache('0xDEADBEEFdeadbeefdeadbeefDEADBEEFdeadbeef', { balances, prices });
    // Looking up with a different case still hits the same entry.
    const cached = storage.getScanCache('0xdeadbeefDEADBEEFdeadbeefdeadbeefdeadbeef');
    expect(cached).not.toBeNull();
  });

  it('discards cache entries whose version does not match', () => {
    localStorage.setItem(
      'wm_scan_' + ADDR.toLowerCase(),
      JSON.stringify({ version: 0, updatedAt: Date.now(), balances, prices }),
    );
    expect(storage.getScanCache(ADDR)).toBeNull();
  });

  it('clears a single address\'s cache', () => {
    storage.setScanCache(ADDR, { balances, prices });
    storage.clearScanCache(ADDR);
    expect(storage.getScanCache(ADDR)).toBeNull();
  });

  it('clearScanCache() with no arg removes all wm_scan_ entries', () => {
    storage.setScanCache('0x1111111111111111111111111111111111111111', { balances, prices });
    storage.setScanCache('0x2222222222222222222222222222222222222222', { balances, prices });
    // Unrelated key should survive.
    storage.setHidden(new Set(['usdc']));
    storage.clearScanCache();
    expect(storage.getScanCache('0x1111111111111111111111111111111111111111')).toBeNull();
    expect(storage.getScanCache('0x2222222222222222222222222222222222222222')).toBeNull();
    expect(storage.getHidden().has('usdc')).toBe(true);
  });
});
