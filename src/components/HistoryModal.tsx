import { useMemo, useState } from 'react';
import { useWallet } from '../state/WalletContext';
import { CHAINS_BY_ID } from '../lib/chains';
import { TokenIcon, ChainIcon } from './Icons';
import { fmtAmount, fmtFiat } from '../lib/format';
import type { ChainId } from '../lib/types';

const RANGES = [
  { id: '1w', label: '1W', days: 7 },
  { id: '1m', label: '1M', days: 30 },
  { id: '3m', label: '3M', days: 90 },
  { id: '1y', label: '1Y', days: 365 },
  { id: 'all', label: 'All', days: 720 },
] as const;

interface Point { t: number; v: number; }
interface Tx { kind: string; amount: number; date: number; running: number; }

function seeded(seed: number): () => number {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h;
}
function genHistory(tokenId: string, chainId: string, current: number, days: number) {
  const rand = seeded(hash(tokenId + chainId));
  const now = Date.now();
  const points: Point[] = [];
  let bal = current * (0.4 + rand() * 0.4);
  for (let i = days; i >= 0; i--) {
    bal = Math.max(0, bal + (rand() - 0.5) * current * 0.05);
    points.push({ t: now - i * 86400000, v: bal });
  }
  if (points.length) points[points.length - 1].v = current;
  const txs: Tx[] = [];
  const actions = ['Received', 'Sent', 'Swapped', 'Bridged'];
  for (let i = 0; i < 8; i++) {
    txs.push({ kind: actions[Math.floor(rand() * actions.length)], amount: current * (0.05 + rand() * 0.4), date: now - Math.floor(rand() * days) * 86400000, running: current * (rand() + 0.2) });
  }
  txs.sort((a, b) => b.date - a.date);
  return { points, txs };
}

const TX_ICON_COLOR: Record<string, string> = {
  sent: 'text-red', received: 'text-green', bridged: 'text-yellow', swapped: 'text-accent',
};

export function HistoryModal({ tokenId, chainId, onClose }: { tokenId: string; chainId: ChainId; onClose: () => void }) {
  const { tokens, balances, prices, currency } = useWallet();
  const fmt = (n: number) => fmtFiat(n, currency);
  const token = tokens.find((t) => t.id === tokenId);
  const chain = CHAINS_BY_ID[chainId];
  const [range, setRange] = useState('3m');

  if (!token || !chain) return null;

  const current = balances[tokenId]?.[chainId] ?? 0;
  const price = prices[token.symbol]?.price ?? token.price ?? 0;
  const { points, txs } = useMemo(() => {
    const days = RANGES.find((r) => r.id === range)?.days ?? 90;
    return genHistory(tokenId, chainId, current, days);
  }, [tokenId, chainId, current, range]);
  const ath = Math.max(...points.map((p) => p.v));
  const firstDate = new Date(points[0].t).toLocaleDateString();

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface border border-border rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center gap-2.5">
          <div className="flex items-center gap-2.5">
            <TokenIcon token={token} size={28} />
            <div>
              <div className="text-lg font-semibold">{token.symbol} · {token.name}</div>
              <div className="text-muted text-xs">
                <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-semibold bg-surface-2 border border-border">
                  <ChainIcon chainId={chain.id} size={14} />
                  {chain.name}
                </span>
              </div>
            </div>
          </div>
          <button className="ml-auto w-8 h-8 rounded-lg border border-border bg-transparent text-text text-lg cursor-pointer hover:border-red hover:text-red" onClick={onClose} aria-label="Close">×</button>
        </header>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2.5">
          <Stat label="Current Balance" value={`${fmtAmount(current)} ${token.symbol}`} sub={fmt(current * price)} />
          <Stat label="All-Time High" value={`${fmtAmount(ath)} ${token.symbol}`} sub={fmt(ath * price)} />
          <Stat label="First Acquired" value={firstDate} />
          <Stat label="Transactions" value={String(txs.length)} />
        </div>

        <div className="inline-flex bg-surface-2 border border-border rounded-xl overflow-hidden w-max">
          {RANGES.map((r) => (
            <button key={r.id} className={`bg-transparent border-0 text-muted py-2 px-4 font-semibold cursor-pointer ${range === r.id ? 'text-text bg-surface' : ''}`} onClick={() => setRange(r.id)}>
              {r.label}
            </button>
          ))}
        </div>

        <Chart points={points} />

        <div className="flex flex-col border border-border rounded-xl overflow-hidden">
          {txs.map((tx, i) => (
            <div key={i} className="grid grid-cols-[28px_80px_1fr_120px_140px] max-sm:grid-cols-[24px_1fr_auto] gap-2.5 items-center py-2.5 px-3.5 border-b border-border last:border-b-0 font-mono text-xs">
              <span className={`w-6 h-6 inline-flex items-center justify-center rounded-full bg-surface-2 ${TX_ICON_COLOR[tx.kind.toLowerCase()] ?? 'text-accent'}`}>
                {tx.kind === 'Received' ? '↓' : tx.kind === 'Sent' ? '↑' : tx.kind === 'Swapped' ? '⇄' : '⬡'}
              </span>
              <span>{tx.kind}</span>
              <span>{fmtAmount(tx.amount)} {token.symbol}</span>
              <span className="text-muted max-sm:hidden">{new Date(tx.date).toLocaleDateString()}</span>
              <span className="text-muted max-sm:hidden">Bal: {fmtAmount(tx.running)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-surface-2 border border-border rounded-xl p-3">
      <div className="text-muted text-xs">{label}</div>
      <div className="font-mono font-bold text-base my-1">{value}</div>
      {sub && <div className="text-muted text-xs">{sub}</div>}
    </div>
  );
}

function Chart({ points }: { points: Point[] }) {
  const w = 640, h = 180, pad = 4;
  const max = Math.max(...points.map((p) => p.v)) || 1;
  const min = Math.min(...points.map((p) => p.v));
  const range = Math.max(0.0001, max - min);
  const step = (w - pad * 2) / Math.max(1, points.length - 1);
  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${(pad + i * step).toFixed(2)},${(h - pad - ((p.v - min) / range) * (h - pad * 2)).toFixed(2)}`)
    .join(' ');
  const area = `${path} L${pad + (points.length - 1) * step},${h - pad} L${pad},${h - pad} Z`;
  return (
    <svg className="w-full h-[200px]" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#00d4ff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#grad)" />
      <path d={path} fill="none" stroke="#00d4ff" strokeWidth="2" />
    </svg>
  );
}
