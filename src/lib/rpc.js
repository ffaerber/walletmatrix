// Minimal JSON-RPC helper — no ethers.js dependency so the bundle stays small
// enough for cheap Swarm uploads.

export async function jsonRpc(url, method, params = []) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`rpc ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || 'rpc error');
  return data.result;
}

export function hexToBigInt(hex) {
  if (!hex || hex === '0x') return 0n;
  return BigInt(hex);
}

export function formatUnits(value, decimals = 18) {
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

export function toNumberSafe(str) {
  const n = Number(str);
  return Number.isFinite(n) ? n : 0;
}
