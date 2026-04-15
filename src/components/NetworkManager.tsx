import { useMemo } from 'react';
import { useWallet } from '../state/WalletContext';
import { CHAINS } from '../lib/chains';
import { ChainIcon } from './Icons';
import { fmtUsd } from '../lib/format';
import type { Chain } from '../lib/types';

interface NetworkManagerProps {
  onClose: () => void;
}

// Per-chain visibility manager. Each chain is a row showing its total USD
// value (computed from the current balances+prices). Users toggle chains
// in / out of the matrix view — the hidden set is persisted to
// localStorage, so it survives reloads and address switches.
export function NetworkManager({ onClose }: NetworkManagerProps) {
  const { tokens, balances, prices, hiddenChains, toggleHideChain, showAllChains } = useWallet();

  // Total USD value per chain across all tokens the user holds.
  const totals = useMemo(() => {
    const out: Record<string, number> = {};
    for (const t of tokens) {
      const price = prices[t.symbol]?.price ?? t.price ?? 0;
      const row = balances[t.id] ?? {};
      for (const [chainId, amt] of Object.entries(row)) {
        out[chainId] = (out[chainId] ?? 0) + (amt ?? 0) * price;
      }
    }
    return out;
  }, [tokens, balances, prices]);

  const rows = useMemo<Chain[]>(
    () => [...CHAINS].sort((a, b) => (totals[b.id] ?? 0) - (totals[a.id] ?? 0)),
    [totals],
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <header>
          <div className="big">Manage Networks</div>
          <div className="manager-actions">
            <button className="btn ghost small" onClick={showAllChains}>Show all</button>
            <button className="icon-btn" onClick={onClose} aria-label="Close">×</button>
          </div>
        </header>

        <p className="muted small">
          Hidden networks are removed from the matrix columns. Balances are still scanned —
          unhide a network to see it again without re-scanning.
        </p>

        <div className="token-manager-list">
          {rows.map((c) => {
            const hidden = hiddenChains.has(c.id);
            const value = totals[c.id] ?? 0;
            return (
              <div key={c.id} className={`tm-row ${hidden ? 'hidden' : ''}`}>
                <ChainIcon chainId={c.id} size={28} />
                <div className="tm-meta">
                  <div className="sym" style={{ color: c.color }}>
                    {c.name}
                    {hidden && <span className="badge red">HIDDEN</span>}
                  </div>
                  <div className="muted small">{c.short} · {c.native}</div>
                </div>
                <div className="tm-total muted">{value > 0 ? fmtUsd(value) : '—'}</div>
                <button className="btn ghost small" onClick={() => toggleHideChain(c.id)}>
                  {hidden ? 'Show' : 'Hide'}
                </button>
                <span />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
