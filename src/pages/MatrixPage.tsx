import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useWallet } from '../state/WalletContext';
import { ScanOverlay } from '../components/ScanOverlay';
import { Matrix, type MatrixSort, type MatrixView } from '../components/Matrix';
import { TransferModal } from '../components/TransferModal';
import { HistoryModal } from '../components/HistoryModal';
import { TokenManager } from '../components/TokenManager';
import { NetworkManager } from '../components/NetworkManager';
import {
  DEMO_ADDRESS_PARAM,
  fmtRelative,
  isAddress,
  shortAddr,
} from '../lib/format';
import { useToast } from '../components/Toast';
import type { ChainId, HistoryCell, TransferIntent } from '../lib/types';

export default function MatrixPage() {
  const navigate = useNavigate();
  const { address: urlAddress } = useParams<{ address: string }>();
  const { push } = useToast();
  const {
    demo,
    scanning,
    scanProgress,
    loadAddress,
    refreshBalances,
    disconnect,
    lastRefreshedAt,
    fromCache,
  } = useWallet();
  const [view, setView] = useState<MatrixView>('hasBalance');
  const [sort, setSort] = useState<MatrixSort>('value');
  const [transferIntent, setTransferIntent] = useState<TransferIntent | null>(null);
  const [historyCell, setHistoryCell] = useState<HistoryCell | null>(null);
  const [showTokenMgr, setShowTokenMgr] = useState(false);
  const [showNetworkMgr, setShowNetworkMgr] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Is the URL param a valid key (address or demo sentinel)?
  const validParam = useMemo(
    () => urlAddress === DEMO_ADDRESS_PARAM || isAddress(urlAddress),
    [urlAddress],
  );

  // Reconcile state with whatever's in the URL.
  useEffect(() => {
    if (!urlAddress) {
      navigate('/', { replace: true });
      return;
    }
    if (!validParam) {
      push('Invalid wallet address in URL.', 'error');
      navigate('/', { replace: true });
      return;
    }
    void loadAddress(urlAddress);
  }, [urlAddress, validParam, loadAddress, navigate, push]);

  async function handleRefresh() {
    if (refreshing || scanning) return;
    setRefreshing(true);
    try {
      await refreshBalances();
      push('Balances refreshed.', 'success');
    } catch (e) {
      push(e instanceof Error ? e.message : 'Refresh failed', 'error');
    } finally {
      setRefreshing(false);
    }
  }

  function handleDrop(intent: TransferIntent) {
    setTransferIntent(intent);
  }

  function handleCell(tid: string, nid: ChainId) {
    setHistoryCell({ tid, nid });
  }

  const displayAddress = urlAddress === DEMO_ADDRESS_PARAM ? null : urlAddress;
  const isRealWallet = !demo && !!displayAddress;

  return (
    <main className="matrix-page">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark" />
          <span>WalletMatrix</span>
          {demo && <span className="badge">DEMO</span>}
          {fromCache && !demo && <span className="badge" title="Loaded from local cache">CACHED</span>}
        </div>
        <div className="app-header-right">
          {displayAddress && (
            <span className="addr muted" title={displayAddress}>
              {shortAddr(displayAddress)}
            </span>
          )}
          {isRealWallet && lastRefreshedAt && (
            <span className="muted small refreshed-label">
              Updated {fmtRelative(lastRefreshedAt)}
            </span>
          )}
          {isRealWallet && (
            <button
              className="btn ghost small"
              onClick={handleRefresh}
              disabled={refreshing || scanning}
              title="Re-scan all chains"
            >
              {refreshing || scanning ? '↻ Scanning…' : '↻ Refresh'}
            </button>
          )}
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
        <button className="btn ghost small" onClick={() => setShowNetworkMgr(true)}>
          🌐 Networks
        </button>
        <button className="btn ghost small" onClick={() => setShowTokenMgr(true)}>
          ⚙ Tokens
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
      {showTokenMgr && <TokenManager onClose={() => setShowTokenMgr(false)} />}
      {showNetworkMgr && <NetworkManager onClose={() => setShowNetworkMgr(false)} />}
    </main>
  );
}
