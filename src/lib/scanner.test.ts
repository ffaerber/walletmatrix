import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchPrices } from './scanner';
import type { Token } from './types';

const eth: Token = { id: 'eth', symbol: 'ETH', name: 'Ether', icon: 'Ξ', bg: '#000', price: 0, cgId: 'ethereum' };
const usdc: Token = { id: 'usdc', symbol: 'USDC', name: 'USD Coin', icon: '$', bg: '#000', price: 0, cgId: 'usd-coin' };
const noCg: Token = { id: 'xyz', symbol: 'XYZ', name: 'Unknown', icon: '?', bg: '#000', price: 0 };

describe('fetchPrices', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns an empty object for an empty token list', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const out = await fetchPrices([]);
    expect(out).toEqual({});
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps CoinGecko response back to symbol keys with price + change', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ethereum: { usd: 3200, usd_24h_change: 2.1 },
          'usd-coin': { usd: 1, usd_24h_change: 0.01 },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const out = await fetchPrices([eth, usdc]);
    expect(out).toEqual({
      ETH: { price: 3200, change: 2.1 },
      USDC: { price: 1, change: 0.01 },
    });

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('ids=ethereum,usd-coin');
    expect(url).toContain('include_24hr_change=true');
  });

  it('skips tokens without a cgId', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ethereum: { usd: 3200 } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await fetchPrices([eth, noCg]);
    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('ids=ethereum');
    expect(url).not.toContain('XYZ');
  });

  it('swallows network errors and returns an empty map', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('boom')));
    const out = await fetchPrices([eth]);
    expect(out).toEqual({});
  });
});
