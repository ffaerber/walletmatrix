import { describe, it, expect } from 'vitest';
import { fmtAmount, fmtUsd, shortAddr, isAddress } from './format';

describe('fmtAmount', () => {
  it('returns "0" for zero / falsy', () => {
    expect(fmtAmount(0)).toBe('0');
  });

  it('formats thousands with locale separator, no decimals', () => {
    expect(fmtAmount(1234.5678)).toBe('1,235');
  });

  it('trims trailing zeros in the 1..<1000 band', () => {
    expect(fmtAmount(1.5)).toBe('1.5');
    expect(fmtAmount(2)).toBe('2');
  });

  it('uses 4 decimals for small amounts, 6 for dust', () => {
    expect(fmtAmount(0.01)).toBe('0.0100');
    expect(fmtAmount(0.0001)).toBe('0.000100');
  });
});

describe('fmtUsd', () => {
  it('prefixes with dollar sign', () => {
    expect(fmtUsd(0)).toBe('$0');
    expect(fmtUsd(12.5)).toBe('$12.50');
  });

  it('drops decimals past $1000', () => {
    expect(fmtUsd(2345.67)).toBe('$2,346');
  });
});

describe('shortAddr', () => {
  it('returns empty string for null/undefined', () => {
    expect(shortAddr(null)).toBe('');
    expect(shortAddr(undefined)).toBe('');
  });

  it('shows the first 6 and last 4 chars', () => {
    expect(shortAddr('0x1234567890abcdef1234567890abcdef12345678')).toBe(
      '0x1234…5678',
    );
  });
});

describe('isAddress', () => {
  it('accepts valid 0x-prefixed 40-hex addresses', () => {
    expect(isAddress('0x1234567890abcdef1234567890abcdef12345678')).toBe(true);
    // Uppercase hex (checksum-style) is accepted.
    expect(isAddress('0xABCDEF1234567890ABCDEF1234567890ABCDEF12')).toBe(true);
  });

  it('rejects the wrong length', () => {
    expect(isAddress('0x1234')).toBe(false);
    expect(isAddress('0x' + 'a'.repeat(41))).toBe(false);
  });

  it('rejects non-hex characters and missing 0x prefix', () => {
    expect(isAddress('0x' + 'g'.repeat(40))).toBe(false);
    expect(isAddress('1234567890abcdef1234567890abcdef12345678')).toBe(false);
  });

  it('rejects null, undefined and empty string', () => {
    expect(isAddress(null)).toBe(false);
    expect(isAddress(undefined)).toBe(false);
    expect(isAddress('')).toBe(false);
  });
});
