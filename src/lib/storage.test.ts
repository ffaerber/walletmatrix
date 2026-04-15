import { describe, it, expect, beforeEach } from 'vitest';
import { storage } from './storage';
import type { Token } from './types';

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults hidden tokens to an empty Set', () => {
    expect(storage.getHidden().size).toBe(0);
  });

  it('round-trips hidden tokens as a Set', () => {
    const set = new Set(['usdc', 'dai']);
    storage.setHidden(set);
    const read = storage.getHidden();
    expect(read).toBeInstanceOf(Set);
    expect(read.has('usdc')).toBe(true);
    expect(read.has('dai')).toBe(true);
    expect(read.has('eth')).toBe(false);
  });

  it('round-trips custom tokens', () => {
    const list: Token[] = [
      { id: 'bzz', symbol: 'BZZ', name: 'Swarm', icon: 'B', bg: '#f90', price: 0.25, custom: true },
    ];
    storage.setCustom(list);
    expect(storage.getCustom()).toEqual(list);
  });

  it('returns the fallback if JSON in localStorage is malformed', () => {
    localStorage.setItem('wm_hidden_tokens', 'not-json');
    expect(storage.getHidden().size).toBe(0);
  });
});
