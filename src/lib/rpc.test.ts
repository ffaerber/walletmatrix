import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hexToBigInt, formatUnits, toNumberSafe, jsonRpc } from './rpc';

describe('hexToBigInt', () => {
  it('handles null / undefined / empty hex', () => {
    expect(hexToBigInt(null)).toBe(0n);
    expect(hexToBigInt(undefined)).toBe(0n);
    expect(hexToBigInt('0x')).toBe(0n);
  });

  it('parses a hex integer', () => {
    expect(hexToBigInt('0xff')).toBe(255n);
  });
});

describe('formatUnits', () => {
  it('divides by 10^decimals with full precision for bigints', () => {
    expect(formatUnits(1_000_000_000_000_000_000n, 18)).toBe('1');
    expect(formatUnits(1_500_000_000_000_000_000n, 18)).toBe('1.5');
  });

  it('accepts hex strings', () => {
    // 0xde0b6b3a7640000 = 1e18
    expect(formatUnits('0xde0b6b3a7640000', 18)).toBe('1');
  });

  it('trims trailing zeros in the fractional part', () => {
    expect(formatUnits(100n, 6)).toBe('0.0001');
  });

  it('handles negative bigints', () => {
    expect(formatUnits(-1_500_000_000_000_000_000n, 18)).toBe('-1.5');
  });
});

describe('toNumberSafe', () => {
  it('parses decimals as numbers', () => {
    expect(toNumberSafe('1.5')).toBe(1.5);
  });

  it('returns 0 for unparseable input rather than NaN', () => {
    expect(toNumberSafe('not a number')).toBe(0);
  });
});

describe('jsonRpc', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts a JSON-RPC envelope and returns the result', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: '0xabc' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const out = await jsonRpc<string>('https://rpc.example', 'eth_getBalance', ['0x1', 'latest']);
    expect(out).toBe('0xabc');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://rpc.example',
      expect.objectContaining({ method: 'POST' }),
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toMatchObject({
      jsonrpc: '2.0',
      method: 'eth_getBalance',
      params: ['0x1', 'latest'],
    });
  });

  it('throws on non-2xx responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('boom', { status: 500 })),
    );
    await expect(jsonRpc('https://rpc.example', 'foo')).rejects.toThrow('rpc 500');
  });

  it('throws when the response contains a JSON-RPC error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ jsonrpc: '2.0', id: 1, error: { code: -32000, message: 'nope' } }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      ),
    );
    await expect(jsonRpc('https://rpc.example', 'foo')).rejects.toThrow('nope');
  });
});
