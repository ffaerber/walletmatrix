import { CHAINS } from '../lib/chains';
import { ChainIcon } from './Icons';
import type { ChainId } from '../lib/types';
import type { CSSProperties } from 'react';

interface ScanOverlayProps {
  progress: Partial<Record<ChainId, number>>;
  activeChain?: ChainId | null;
  totalChains?: number;
}

export function ScanOverlay({ progress, activeChain, totalChains }: ScanOverlayProps) {
  const done = Object.keys(progress).length;
  const total = totalChains ?? CHAINS.length;

  return (
    <div className="scan-overlay">
      <div className="scan-card">
        <h2>Scanning chains</h2>
        <p className="muted">
          Querying {total} EVM networks sequentially ({done}/{total} done).
        </p>
        <div className="chain-grid">
          {CHAINS.map((c) => {
            const reported = progress[c.id];
            const isDone = reported !== undefined;
            const isActive = activeChain === c.id && !isDone;
            const hit = reported !== undefined && reported > 0;
            const style = { '--c': c.color } as CSSProperties;
            return (
              <div
                key={c.id}
                className={`chain-pill${isDone ? ' scanned' : ''}${hit ? ' hit' : ''}${isActive ? ' active' : ''}${c.testnet ? ' testnet' : ''}`}
                style={style}
              >
                <ChainIcon chainId={c.id} size={20} />
                <span>{c.short}</span>
                {c.testnet && <span className="testnet-badge">T</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
