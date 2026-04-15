import { CHAINS } from '../lib/chains';
import { ChainIcon } from './Icons';
import type { ChainId } from '../lib/types';
import type { CSSProperties } from 'react';

interface ScanOverlayProps {
  progress: Partial<Record<ChainId, number>>;
}

export function ScanOverlay({ progress }: ScanOverlayProps) {
  return (
    <div className="scan-overlay">
      <div className="scan-card">
        <h2>Scanning chains</h2>
        <p className="muted">
          Querying {CHAINS.length} EVM networks in parallel. Any chain with activity lights up green.
        </p>
        <div className="chain-grid">
          {CHAINS.map((c) => {
            const reported = progress[c.id];
            const active = reported !== undefined;
            const hit = reported !== undefined && reported > 0;
            const style = { '--c': c.color } as CSSProperties;
            return (
              <div
                key={c.id}
                className={`chain-pill ${active ? 'scanned' : ''} ${hit ? 'hit' : ''}`}
                style={style}
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
