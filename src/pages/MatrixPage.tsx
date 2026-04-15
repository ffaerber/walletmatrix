import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useWallet } from '../state/WalletContext';
import { ScanOverlay } from '../components/ScanOverlay';
import { Matrix, type MatrixSort, type MatrixView } from '../components/Matrix';
import { TransferModal } from '../components/TransferModal';
import { HistoryModal } from '../components/HistoryModal';
import { TokenManager } from '../components/TokenManager';
import { shortAddr } from '../lib/format';
import type { ChainId, HistoryCell, TransferIntent } from '../lib/types';

export default function MatrixPage() {
  const navigate = useNavigate();
  const { address, demo, scanning, scanProgress, disconnect } = useWallet();
  const [view, setView] = useState<MatrixView>('hasBalance');
  const [sort, setSort] = useState<MatrixSort>('value');
  const [transferIntent, setTransferIntent] = useState<TransferIntent | null>(null);
  const [historyCell, setHistoryCell] = useState<HistoryCell | null>(null);
  const [showManager, setShowManager] = useState(false);

  // Without an address we bounce back to /#/ (login).
  useEffect(() => {
    if (!address && !scanning) navigate('/');
  }, [address, scanning, navigate]);

  function handleDrop(intent: TransferIntent) {
    setTransferIntent(intent);
  }

  function handleCell(tid: string, nid: ChainId) {
    setHistoryCell({ tid, nid });
  }

  return (
    <main className="matrix-page">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark" />
          <span>WalletMatrix</span>
          {demo && <span className="badge">DEMO</span>}
        </div>
        <div className="app-header-right">
          {address && <span className="addr muted">{shortAddr(address)}</span>}
          <button
            className="btn ghost small"
            onClick={() => { disconnect(); navigate('/'); }}
          >
            Disconnect
          </button>
        </div>
      </header>

      <section className="toolbar">
        <div className="toolbar-group">
          <span className="muted small">View</span>
          <div className="seg">
            <button className={view === 'all' ? 'active' : ''} onClick={() => setView('all')}>All tokens</button>
            <button className={view === 'hasBalance' ? 'active' : ''} onClick={() => setView('hasBalance')}>Has balance</button>
          </div>
        </div>
        <div className="toolbar-group">
          <span className="muted small">Sort</span>
          <div className="seg">
            <button className={sort === 'value' ? 'active' : ''} onClick={() => setSort('value')}>By value</button>
            <button className={sort === 'name' ? 'active' : ''} onClick={() => setSort('name')}>By name</button>
          </div>
        </div>
        <div className="toolbar-spacer" />
        <button className="btn ghost small" onClick={() => setShowManager(true)}>
          ⚙ Manage tokens
        </button>
      </section>

      <Matrix view={view} sort={sort} onCell={handleCell} onDrop={handleDrop} />

      {scanning && <ScanOverlay progress={scanProgress} />}
      {transferIntent && (
        <TransferModal intent={transferIntent} onClose={() => setTransferIntent(null)} />
      )}
      {historyCell && (
        <HistoryModal
          tokenId={historyCell.tid}
          chainId={historyCell.nid}
          onClose={() => setHistoryCell(null)}
        />
      )}
      {showManager && <TokenManager onClose={() => setShowManager(false)} />}
    </main>
  );
}
