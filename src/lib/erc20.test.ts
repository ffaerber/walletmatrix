import { describe, it, expect, vi, beforeEach } from 'vitest';
import { encodeAllowance, encodeApprove, readAllowance } from './erc20';

describe('encodeAllowance', () => {
  it('produces the correct selector + padded owner/spender', () => {
    const data = encodeAllowance(
      '0x1111111111111111111111111111111111111111',
      '0x2222222222222222222222222222222222222222',
    );
    expect(data).toMatch(/^0xdd62ed3e/);
    // 4 bytes selector + 32 bytes owner + 32 bytes spender = 68 bytes = 136 hex chars + 2 for 0x.
    expect(data.length).toBe(2 + 8 + 64 + 64);
    expect(data.endsWith('2222222222222222222222222222222222222222')).toBe(true);
  });
});

describe('encodeApprove', () => {
  it('encodes approve(spender, amount) with correct selector + padding', () => {
    const data = encodeApprove('0x2222222222222222222222222222222222222222', 10n ** 18n);
    expect(data).toMatch(/^0x095ea7b3/);
    expect(data.length).toBe(2 + 8 + 64 + 64);
    // Amount is 0xde0b6b3a7640000 (1e18); should appear right-aligned in last 32 bytes.
    expect(data.endsWith('de0b6b3a7640000'.padStart(64, '0'))).toBe(true);
  });

  it('throws on negative amounts', () => {
    expect(() => encodeApprove('0x2222222222222222222222222222222222222222', -1n)).toThrow();
  });
});

describe('readAllowance', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('dispatches an eth_call with the allowance calldata and parses the result', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ jsonrpc: '2.0', id: 1, result: '0x00000000000000000000000000000000000000000000000000000000000003e8' }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const out = await readAllowance(
      'eth',
      '0x3333333333333333333333333333333333333333',
      '0x1111111111111111111111111111111111111111',
      '0x2222222222222222222222222222222222222222',
    );
    expect(out).toBe(1000n);
    // Verify the RPC payload targets the token contract with allowance calldata.
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.method).toBe('eth_call');
    expect(body.params[0].to).toBe('0x3333333333333333333333333333333333333333');
    expect(body.params[0].data).toMatch(/^0xdd62ed3e/);
  });

  it('returns 0 when the RPC returns empty bytes', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: '0x' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );
    const out = await readAllowance('eth', '0x33...', '0x11...', '0x22...');
    expect(out).toBe(0n);
  });
});
