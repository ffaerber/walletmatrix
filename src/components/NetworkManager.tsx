import { useMemo } from 'react';
import { useWallet } from '../state/WalletContext';
import { CHAINS } from '../lib/chains';
import { ChainIcon } from './Icons';
import { fmtFiat } from '../lib/format';
import type { Chain } from '../lib/types';

const btn = 'font-sans font-semibold border border-border bg-transparent text-text py-1.5 px-3 rounded-xl cursor-pointer text-[13px] hover:border-accent';

export function NetworkManager({ onClose }: { onClose: () => void }) {
  const { tokens, balances, prices, hiddenChains, currency, toggleHideChain, showAllChains } = useWallet();
  const fmt = (n: number) => fmtFiat(n, currency);

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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface border border-border rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center gap-2.5">
          <div className="text-lg font-semibold">Manage Networks</div>
          <div className="ml-auto flex items-center gap-2">
            <button className={btn} onClick={showAllChains}>Show all</button>
            <button className="w-8 h-8 rounded-lg border border-border bg-transparent text-text text-lg cursor-pointer hover:border-red hover:text-red" onClick={onClose} aria-label="Close">×</button>
          </div>
        </header>

        <p className="text-muted text-xs">
          Hidden networks are removed from the matrix columns. Balances are still scanned — unhide a network to see it again without re-scanning.
        </p>

        <div className="flex flex-col border border-border rounded-xl overflow-hidden">
          {rows.map((c) => {
            const isHidden = hiddenChains.has(c.id);
            const value = totals[c.id] ?? 0;
            return (
              <div key={c.id} className={`grid grid-cols-[32px_1fr_auto_auto] gap-3 items-center py-2.5 px-3.5 border-b border-border last:border-b-0 ${isHidden ? 'border-l-[3px] border-l-red opacity-50' : ''}`}>
                <ChainIcon chainId={c.id} size={28} />
                <div>
                  <div className="font-bold flex items-center" style={{ color: c.color }}>
                    {c.name}
                    {isHidden && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red/15 text-red ml-1.5">HIDDEN</span>}
                  </div>
                  <div className="text-muted text-xs">{c.short} · {c.native}</div>
                </div>
                <div className="text-muted font-mono">{value > 0 ? fmt(value) : '—'}</div>
                <button className={btn} onClick={() => toggleHideChain(c.id)}>
                  {isHidden ? 'Show' : 'Hide'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
