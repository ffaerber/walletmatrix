import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchPrices } from './scanner';

describe('fetchPrices', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns an empty object for an empty symbol list', async () => {
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

    const out = await fetchPrices(['ETH', 'USDC']);
    expect(out).toEqual({
      ETH: { price: 3200, change: 2.1 },
      USDC: { price: 1, change: 0.01 },
    });

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('ids=ethereum,usd-coin');
    expect(url).toContain('include_24hr_change=true');
  });

  it('deduplicates symbols (case-insensitive) and filters unknown ones', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ethereum: { usd: 3200 } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await fetchPrices(['eth', 'ETH', 'XYZ_UNKNOWN']);
    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('ids=ethereum');
    // XYZ_UNKNOWN should not be in the CoinGecko id list.
    expect(url).not.toContain('XYZ_UNKNOWN');
  });

  it('swallows network errors and returns an empty map', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('boom')));
    const out = await fetchPrices(['ETH']);
    expect(out).toEqual({});
  });
});
