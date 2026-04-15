import { useMemo, useState } from 'react';
import { useWallet } from '../state/WalletContext.jsx';
import { CHAINS_BY_ID } from '../lib/chains.js';
import { TokenIcon, ChainIcon } from './Icons.jsx';
import { fmtAmount, fmtUsd } from '../lib/format.js';

const RANGES = [
  { id: '1w', label: '1W', days: 7 },
  { id: '1m', label: '1M', days: 30 },
  { id: '3m', label: '3M', days: 90 },
  { id: '1y', label: '1Y', days: 365 },
  { id: 'all', label: 'All', days: 720 },
];

// Deterministic pseudo-random so the chart is stable per token/chain pair.
function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function genHistory(tokenId, chainId, current, days) {
  const rand = seeded(hash(tokenId + chainId));
  const now = Date.now();
  const points = [];
  let bal = current * (0.4 + rand() * 0.4);
  for (let i = days; i >= 0; i--) {
    const drift = (rand() - 0.5) * current * 0.05;
    bal = Math.max(0, bal + drift);
    points.push({ t: now - i * 86400000, v: bal });
  }
  // Snap the final point to the real current balance.
  if (points.length) points[points.length - 1].v = current;

  const txs = [];
  const actions = ['Received', 'Sent', 'Swapped', 'Bridged'];
  for (let i = 0; i < 8; i++) {
    txs.push({
      kind: actions[Math.floor(rand() * actions.length)],
      amount: current * (0.05 + rand() * 0.4),
      date: now - Math.floor(rand() * days) * 86400000,
      running: current * (rand() + 0.2),
    });
  }
  txs.sort((a, b) => b.date - a.date);
  return { points, txs };
}

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h;
}

export function HistoryModal({ tokenId, chainId, onClose }) {
  const { tokens, balances, prices } = useWallet();
  const token = tokens.find((t) => t.id === tokenId);
  const chain = CHAINS_BY_ID[chainId];
  const [range, setRange] = useState('3m');
  const current = balances[tokenId]?.[chainId] || 0;
  const price = prices[token?.symbol]?.price || token?.price || 0;

  const { points, txs } = useMemo(() => {
    const days = RANGES.find((r) => r.id === range)?.days || 90;
    return genHistory(tokenId, chainId, current, days);
  }, [tokenId, chainId, current, range]);

  const ath = Math.max(...points.map((p) => p.v));
  const firstDate = new Date(points[0].t).toLocaleDateString();

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <header>
          <div className="history-head">
            <TokenIcon token={token} size={28} />
            <div>
              <div className="big">{token.symbol} · {token.name}</div>
              <div className="muted small">
                <span className="pill route">
                  <ChainIcon chainId={chain.id} size={14} />
                  {chain.name}
                </span>
              </div>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">×</button>
        </header>

        <div className="stat-bar">
          <Stat label="Current Balance" value={`${fmtAmount(current)} ${token.symbol}`} sub={fmtUsd(current * price)} />
          <Stat label="All-Time High" value={`${fmtAmount(ath)} ${token.symbol}`} sub={fmtUsd(ath * price)} />
          <Stat label="First Acquired" value={firstDate} />
          <Stat label="Transactions" value={String(txs.length)} />
        </div>

        <div className="range-tabs">
          {RANGES.map((r) => (
            <button
              key={r.id}
              className={`tab ${range === r.id ? 'active' : ''}`}
              onClick={() => setRange(r.id)}
            >
              {r.label}
            </button>
          ))}
        </div>

        <Chart points={points} />

        <div className="tx-list">
          {txs.map((tx, i) => (
            <div key={i} className={`tx-row ${tx.kind.toLowerCase()}`}>
              <span className="tx-icon">
                {tx.kind === 'Received' ? '↓' : tx.kind === 'Sent' ? '↑' : tx.kind === 'Swapped' ? '⇄' : '⬡'}
              </span>
              <span className="tx-kind">{tx.kind}</span>
              <span className="tx-amt">{fmtAmount(tx.amount)} {token.symbol}</span>
              <span className="tx-date muted">{new Date(tx.date).toLocaleDateString()}</span>
              <span className="tx-running muted">Bal: {fmtAmount(tx.running)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div className="stat">
      <div className="muted small">{label}</div>
      <div className="stat-val">{value}</div>
      {sub && <div className="muted small">{sub}</div>}
    </div>
  );
}

function Chart({ points }) {
  const w = 640;
  const h = 180;
  const pad = 4;
  const max = Math.max(...points.map((p) => p.v)) || 1;
  const min = Math.min(...points.map((p) => p.v));
  const range = Math.max(0.0001, max - min);
  const step = (w - pad * 2) / Math.max(1, points.length - 1);
  const path = points
    .map((p, i) => {
      const x = pad + i * step;
      const y = h - pad - ((p.v - min) / range) * (h - pad * 2);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
  const area = `${path} L${pad + (points.length - 1) * step},${h - pad} L${pad},${h - pad} Z`;
  return (
    <svg className="chart" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
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
