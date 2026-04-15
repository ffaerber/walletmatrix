import { describe, it, expect } from 'vitest';
import { parseUnits, toHex } from './units';

describe('parseUnits', () => {
  it('parses whole numbers', () => {
    expect(parseUnits('1', 18)).toBe(10n ** 18n);
    expect(parseUnits('0', 18)).toBe(0n);
  });

  it('parses decimals without float precision loss', () => {
    expect(parseUnits('1.5', 18)).toBe(1_500_000_000_000_000_000n);
    // 6-decimal USDC
    expect(parseUnits('1.23', 6)).toBe(1_230_000n);
  });

  it('truncates fractional input longer than decimals (does not round)', () => {
    expect(parseUnits('0.1234567', 6)).toBe(123_456n);
  });

  it('handles empty string as zero', () => {
    expect(parseUnits('', 18)).toBe(0n);
  });

  it('accepts a leading minus sign', () => {
    expect(parseUnits('-1.5', 18)).toBe(-1_500_000_000_000_000_000n);
  });

  it('throws on non-numeric input', () => {
    expect(() => parseUnits('abc', 18)).toThrow(/Invalid decimal/);
  });

  it('is an inverse of formatUnits for representable amounts', async () => {
    const { formatUnits } = await import('./rpc');
    const roundTrip = (s: string, d: number) => formatUnits(parseUnits(s, d), d);
    expect(roundTrip('1.5', 18)).toBe('1.5');
    expect(roundTrip('0.000001', 18)).toBe('0.000001');
  });
});

describe('toHex', () => {
  it('0x-prefixes the lowercase hex form', () => {
    expect(toHex(255n)).toBe('0xff');
    expect(toHex(0n)).toBe('0x0');
  });
});
