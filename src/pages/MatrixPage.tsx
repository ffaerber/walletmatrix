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
import { resolveEns } from '../lib/ens';
import { useToast } from '../components/Toast';
import type { ChainId, HistoryCell, TransferIntent } from '../lib/types';

export default function MatrixPage() {
  const navigate = useNavigate();
  // New route uses :addressOrEns, legacy route uses :address.
  const params = useParams<{ addressOrEns?: string; address?: string }>();
  const urlParam = params.addressOrEns ?? params.address;
  const { push } = useToast();
  const {
    address: walletAddress,
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
  const [resolving, setResolving] = useState(false);

  // Valid if demo, a well-formed 0x address, or an ENS name (no 0x prefix).
  // Rejects only malformed 0x strings (wrong length / bad hex chars).
  const validParam = useMemo(() => {
    if (!urlParam) return false;
    if (urlParam === DEMO_ADDRESS_PARAM) return true;
    if (/^0x[a-fA-F0-9]{40}$/.test(urlParam)) return true;
    return !urlParam.startsWith('0x'); // ENS name
  }, [urlParam]);

  // Reconcile state with whatever's in the URL. For ENS names, resolve
  // on-chain first, then hand the 0x address to loadAddress.
  useEffect(() => {
    if (!urlParam) {
      navigate('/', { replace: true });
      return;
    }
    if (!validParam) {
      push('Invalid wallet address in URL.', 'error');
      navigate('/', { replace: true });
      return;
    }

    // Demo or raw 0x address — load directly.
    if (urlParam === DEMO_ADDRESS_PARAM || isAddress(urlParam)) {
      void loadAddress(urlParam);
      return;
    }

    // Otherwise treat it as an ENS name.
    let cancelled = false;
    setResolving(true);
    resolveEns(urlParam)
      .then((resolved) => {
        if (cancelled) return;
        if (!resolved) {
          push(`Could not resolve "${urlParam}" via ENS.`, 'error');
          navigate('/', { replace: true });
          return;
        }
        void loadAddress(resolved);
      })
      .catch(() => {
        if (cancelled) return;
        push(`ENS lookup failed for "${urlParam}".`, 'error');
        navigate('/', { replace: true });
      })
      .finally(() => {
        if (!cancelled) setResolving(false);
      });
    return () => { cancelled = true; };
  }, [urlParam, validParam, loadAddress, navigate, push]);

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

  // Show the ENS name in the header when the URL param is an ENS name,
  // otherwise show the shortened 0x address.
  const isEnsParam = !!urlParam && urlParam !== DEMO_ADDRESS_PARAM && !isAddress(urlParam);
  const displayLabel = urlParam === DEMO_ADDRESS_PARAM
    ? null
    : isEnsParam
      ? urlParam
      : shortAddr(walletAddress);
  const isRealWallet = !demo && !!walletAddress;

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
          {displayLabel && (
            <span className="addr muted" title={walletAddress ?? urlParam ?? ''}>
              {displayLabel}
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

      {resolving && (
        <div className="ens-resolving">Resolving ENS name…</div>
      )}

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
