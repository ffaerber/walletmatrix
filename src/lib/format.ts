export function fmtAmount(n: number): string {
  if (!n) return '0';
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (n >= 1) return n.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
  if (n >= 0.001) return n.toFixed(4);
  return n.toFixed(6);
}

export function fmtUsd(n: number): string {
  if (!n) return '$0';
  if (n >= 1000) return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(3)}`;
}

export function shortAddr(a: string | null | undefined): string {
  if (!a) return '';
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}
