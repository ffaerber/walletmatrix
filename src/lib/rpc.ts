// Minimal JSON-RPC helper — no ethers.js dependency so the bundle stays small
// enough for cheap Swarm uploads.

interface JsonRpcResponse<T> {
  jsonrpc: '2.0';
  id: number;
  result?: T;
  error?: { code: number; message: string };
}

export async function jsonRpc<T = unknown>(
  url: string,
  method: string,
  params: unknown[] = [],
): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`rpc ${res.status}`);
  const data = (await res.json()) as JsonRpcResponse<T>;
  if (data.error) throw new Error(data.error.message || 'rpc error');
  return data.result as T;
}

export function hexToBigInt(hex: string | null | undefined): bigint {
  if (!hex || hex === '0x') return 0n;
  return BigInt(hex);
}

export function formatUnits(value: bigint | string, decimals = 18): string {
  const bn = typeof value === 'bigint' ? value : hexToBigInt(value);
  const neg = bn < 0n;
  const abs = neg ? -bn : bn;
  const base = 10n ** BigInt(decimals);
  const whole = abs / base;
  const frac = abs % base;
  const fracStr = frac.toString().padStart(decimals, '0').replace(/0+$/, '');
  const out = fracStr ? `${whole}.${fracStr}` : `${whole}`;
  return neg ? `-${out}` : out;
}

export function toNumberSafe(str: string): number {
  const n = Number(str);
  return Number.isFinite(n) ? n : 0;
}
