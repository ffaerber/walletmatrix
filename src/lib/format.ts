export function fmtAmount(n: number): string {
  if (!n) return '0';
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (n >= 1) return n.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
  if (n >= 0.001) return n.toFixed(4);
  return n.toFixed(6);
}

export type FiatCurrency = 'usd' | 'eur' | 'gbp' | 'chf' | 'jpy' | 'cny' | 'krw' | 'btc' | 'eth';

const FIAT_SYMBOLS: Record<FiatCurrency, string> = {
  usd: '$', eur: '€', gbp: '£', chf: 'CHF ', jpy: '¥', cny: '¥', krw: '₩', btc: '₿', eth: 'Ξ',
};

const FIAT_LABELS: Record<FiatCurrency, string> = {
  usd: 'US Dollar', eur: 'Euro', gbp: 'British Pound', chf: 'Swiss Franc',
  jpy: 'Japanese Yen', cny: 'Chinese Yuan', krw: 'Korean Won', btc: 'Bitcoin', eth: 'Ether',
};

export const CURRENCIES: { id: FiatCurrency; symbol: string; label: string }[] =
  (Object.keys(FIAT_SYMBOLS) as FiatCurrency[]).map((id) => ({
    id,
    symbol: FIAT_SYMBOLS[id],
    label: FIAT_LABELS[id],
  }));

export function fmtFiat(n: number, currency: FiatCurrency = 'usd'): string {
  const sym = FIAT_SYMBOLS[currency];
  const noDecimals = currency === 'jpy' || currency === 'krw';
  if (!n) return `${sym}0`;
  if (n >= 1000) return `${sym}${n.toLocaleString('en-US', { maximumFractionDigits: noDecimals ? 0 : 0 })}`;
  if (n >= 1) return `${sym}${noDecimals ? Math.round(n) : n.toFixed(2)}`;
  return `${sym}${noDecimals ? n.toFixed(0) : n.toFixed(3)}`;
}

// Backward compat — some tests reference fmtUsd directly.
export function fmtUsd(n: number): string {
  return fmtFiat(n, 'usd');
}

export function shortAddr(a: string | null | undefined): string {
  if (!a) return '';
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

// Ethereum address validator — 0x + 40 hex chars, case-insensitive.
// Does not enforce EIP-55 checksum since some wallets emit lowercase.
const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
export function isAddress(value: string | null | undefined): value is string {
  return !!value && ADDRESS_RE.test(value);
}

export const DEMO_ADDRESS_PARAM = 'demo';

// Coarse humanised relative-time string — enough for the "cached 2m ago"
// indicator next to the refresh button.
export function fmtRelative(epochMs: number | null | undefined): string {
  if (!epochMs) return '';
  const delta = Math.max(0, Date.now() - epochMs);
  const sec = Math.round(delta / 1000);
  if (sec < 45) return 'just now';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.round(hr / 24);
  return `${d}d ago`;
}

