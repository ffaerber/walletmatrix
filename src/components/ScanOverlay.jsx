import { CHAINS } from '../lib/chains.js';
import { ChainIcon } from './Icons.jsx';

export function ScanOverlay({ progress }) {
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
            const hit = reported > 0;
            return (
              <div
                key={c.id}
                className={`chain-pill ${active ? 'scanned' : ''} ${hit ? 'hit' : ''}`}
                style={{ '--c': c.color }}
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
