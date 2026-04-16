import { CHAINS } from '../lib/chains';
import { ChainIcon } from './Icons';
import type { ChainId } from '../lib/types';

interface ScanOverlayProps {
  progress: Partial<Record<ChainId, number>>;
  activeChain?: ChainId | null;
  totalChains?: number;
}

export function ScanOverlay({ progress, activeChain, totalChains }: ScanOverlayProps) {
  const done = Object.keys(progress).length;
  const total = totalChains ?? CHAINS.length;

  return (
    <div className="fixed inset-0 bg-bg/90 backdrop-blur-sm z-40 flex items-center justify-center p-4">
      <div className="bg-surface border border-border rounded-2xl p-8 max-w-2xl w-full">
        <h2 className="font-extrabold text-xl mb-2">Scanning chains</h2>
        <p className="text-muted text-sm">
          Querying {total} EVM networks sequentially ({done}/{total} done).
        </p>
        <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-2">
          {CHAINS.map((c) => {
            const reported = progress[c.id];
            const isDone = reported !== undefined;
            const isActive = activeChain === c.id && !isDone;
            const hit = reported !== undefined && reported > 0;
            return (
              <div
                key={c.id}
                className={[
                  'flex items-center gap-2 py-2.5 px-3 border rounded-xl bg-surface-2 font-semibold text-[13px] transition-all duration-200',
                  !isDone && !isActive ? 'opacity-50 border-border' : '',
                  isDone && !hit ? 'opacity-100 border-muted' : '',
                  hit ? 'opacity-100 border-green shadow-[0_0_0_1px_var(--color-green)_inset,0_0_20px_rgba(0,229,160,0.1)]' : '',
                  isActive ? 'opacity-100 border-accent shadow-[0_0_0_1px_var(--color-accent)_inset,0_0_12px_rgba(99,102,241,0.15)] animate-pulse-scan' : '',
                ].join(' ')}
              >
                <ChainIcon chainId={c.id} size={20} />
                <span>{c.short}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
