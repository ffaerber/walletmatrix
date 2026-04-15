// Inverse of formatUnits — converts a human-entered decimal string into the
// token's base-unit bigint, no float precision loss.
export function parseUnits(amount: string, decimals: number): bigint {
  if (!amount) return 0n;
  const neg = amount.startsWith('-');
  const s = neg ? amount.slice(1) : amount;
  if (!/^\d*\.?\d*$/.test(s)) throw new Error(`Invalid decimal string: ${amount}`);
  const [whole = '0', frac = ''] = s.split('.');
  const fracTrimmed = frac.slice(0, decimals);
  const fracPadded = fracTrimmed.padEnd(decimals, '0');
  const bn =
    BigInt(whole || '0') * 10n ** BigInt(decimals) +
    BigInt(fracPadded || '0');
  return neg ? -bn : bn;
}

// 0x-prefixed hex for an `eth_sendTransaction` value field.
export function toHex(n: bigint): string {
  return '0x' + n.toString(16);
}
