import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchLifiQuote, fetchLifiStatus } from './lifi';

const SAMPLE_QUOTE = {
  id: 'q1',
  type: 'lifi',
  tool: 'across',
  toolDetails: { name: 'Across' },
  action: {
    fromToken: { symbol: 'USDC', decimals: 6, address: '0xa0b8...' },
    toToken: { symbol: 'USDC', decimals: 6, address: '0x8335...' },
    fromAmount: '1000000',
  },
  estimate: {
    fromAmount: '1000000',
    toAmount: '999500',
    toAmountMin: '995000',
    executionDuration: 420,
  },
  transactionRequest: {
    to: '0xSpender',
    chainId: 1,
    data: '0xdeadbeef',
    value: '0x0',
  },
};

describe('fetchLifiQuote', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('hits /v1/quote with decimal chain ids and returns the quote', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(SAMPLE_QUOTE), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const quote = await fetchLifiQuote({
      fromChain: '1',
      toChain: '8453',
      fromToken: '0x0',
      toToken: '0x0',
      fromAmountWei: 1_000_000n,
      fromAddress: '0x1234',
    });

    expect(quote.tool).toBe('across');
    const [url] = fetchMock.mock.calls[0];
    const u = new URL(url as string);
    expect(u.origin + u.pathname).toBe('https://li.quest/v1/quote');
    // Li.Fi uses decimal chain ids
    expect(u.searchParams.get('fromChain')).toBe('1');
    expect(u.searchParams.get('toChain')).toBe('8453');
    expect(u.searchParams.get('fromAmount')).toBe('1000000');
    // Default slippage is 0.5%
    expect(u.searchParams.get('slippage')).toBe('0.005');
  });

  it('surfaces the server message on failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: 'Route not found' }), {
          status: 404,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );
    await expect(
      fetchLifiQuote({
        fromChain: '1',
        toChain: '8453',
        fromToken: '0x0',
        toToken: '0x0',
        fromAmountWei: 1n,
        fromAddress: '0x1234',
      }),
    ).rejects.toThrow(/Route not found/);
  });
});

describe('fetchLifiStatus', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('hits /v1/status with txHash + bridge + decimal chain ids', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: 'DONE', receiving: { txHash: '0xrecv' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const out = await fetchLifiStatus({
      txHash: '0xabc',
      tool: 'across',
      fromChain: '1',
      toChain: '8453',
    });

    expect(out.status).toBe('DONE');
    const [url] = fetchMock.mock.calls[0];
    const u = new URL(url as string);
    expect(u.pathname).toBe('/v1/status');
    expect(u.searchParams.get('bridge')).toBe('across');
    expect(u.searchParams.get('fromChain')).toBe('1');
    expect(u.searchParams.get('toChain')).toBe('8453');
  });
});
