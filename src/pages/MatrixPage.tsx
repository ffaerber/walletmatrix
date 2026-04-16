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
import type { HistoryCell, TransferIntent } from '../lib/types';

const btn = 'font-sans font-semibold border border-border bg-transparent text-text py-1.5 px-3 rounded-xl cursor-pointer text-[13px] transition-transform active:translate-y-px hover:border-accent disabled:opacity-60 disabled:cursor-not-allowed';
const segBtn = 'bg-transparent border-0 text-muted py-1.5 px-3 font-semibold cursor-pointer';

export default function MatrixPage() {
  const navigate = useNavigate();
  const params = useParams<{ addressOrEns?: string; address?: string }>();
  const urlParam = params.addressOrEns ?? params.address;
  const { push } = useToast();
  const {
    address: walletAddress,
    demo,
    scanning,
    activeChain,
    scanProgress,
    totalChains,
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

  const validParam = useMemo(() => {
    if (!urlParam) return false;
    if (urlParam === DEMO_ADDRESS_PARAM) return true;
    if (/^0x[a-fA-F0-9]{40}$/.test(urlParam)) return true;
    return !urlParam.startsWith('0x');
  }, [urlParam]);

  useEffect(() => {
    if (!urlParam) { navigate('/', { replace: true }); return; }
    if (!validParam) { push('Invalid wallet address in URL.', 'error'); navigate('/', { replace: true }); return; }
    if (urlParam === DEMO_ADDRESS_PARAM || isAddress(urlParam)) { void loadAddress(urlParam); return; }
    let cancelled = false;
    setResolving(true);
    resolveEns(urlParam)
      .then((resolved) => {
        if (cancelled) return;
        if (!resolved) { push(`Could not resolve "${urlParam}" via ENS.`, 'error'); navigate('/', { replace: true }); return; }
        void loadAddress(resolved);
      })
      .catch(() => { if (!cancelled) { push(`ENS lookup failed for "${urlParam}".`, 'error'); navigate('/', { replace: true }); } })
      .finally(() => { if (!cancelled) setResolving(false); });
    return () => { cancelled = true; };
  }, [urlParam, validParam, loadAddress, navigate, push]);

  async function handleRefresh() {
    if (refreshing || scanning) return;
    setRefreshing(true);
    try { await refreshBalances(); push('Balances refreshed.', 'success'); }
    catch (e) { push(e instanceof Error ? e.message : 'Refresh failed', 'error'); }
    finally { setRefreshing(false); }
  }

  const isEnsParam = !!urlParam && urlParam !== DEMO_ADDRESS_PARAM && !isAddress(urlParam);
  const displayLabel = urlParam === DEMO_ADDRESS_PARAM ? null : isEnsParam ? urlParam : shortAddr(walletAddress);
  const isRealWallet = !demo && !!walletAddress;

  return (
    <main>
      {/* ── Header ── */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-bg/85 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-2.5 font-sans font-extrabold text-lg -tracking-tight">
          <span className="w-[18px] h-[18px] rounded bg-gradient-to-br from-accent to-green" />
          <span>WalletMatrix</span>
          {demo && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/8 text-muted uppercase tracking-wide ml-1.5">DEMO</span>}
          {fromCache && !demo && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/8 text-muted uppercase tracking-wide ml-1.5" title="Loaded from local cache">CACHED</span>}
        </div>
        <div className="flex items-center gap-3">
          {displayLabel && (
            <span className="font-mono text-[13px] text-muted" title={walletAddress ?? urlParam ?? ''}>
              {displayLabel}
            </span>
          )}
          {isRealWallet && lastRefreshedAt && (
            <span className="text-muted text-[11px] font-mono pr-1">
              Updated {fmtRelative(lastRefreshedAt)}
            </span>
          )}
          {isRealWallet && (
            <button className={btn} onClick={handleRefresh} disabled={refreshing || scanning} title="Re-scan all chains">
              {refreshing || scanning ? '↻ Scanning…' : '↻ Refresh'}
            </button>
          )}
          <button className={btn} onClick={() => { disconnect(); navigate('/'); }}>
            Disconnect
          </button>
        </div>
      </header>

      {resolving && <div className="text-center py-6 text-muted text-sm">Resolving ENS name…</div>}

      {/* ── Toolbar ── */}
      <section className="flex items-center gap-5 px-6 py-4 border-b border-border flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-muted text-xs">View</span>
          <div className="inline-flex border border-border rounded-xl overflow-hidden bg-surface">
            <button className={`${segBtn} ${view === 'all' ? 'bg-surface-2 text-text' : ''}`} onClick={() => setView('all')}>All tokens</button>
            <button className={`${segBtn} ${view === 'hasBalance' ? 'bg-surface-2 text-text' : ''}`} onClick={() => setView('hasBalance')}>Has balance</button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted text-xs">Sort</span>
          <div className="inline-flex border border-border rounded-xl overflow-hidden bg-surface">
            <button className={`${segBtn} ${sort === 'value' ? 'bg-surface-2 text-text' : ''}`} onClick={() => setSort('value')}>By value</button>
            <button className={`${segBtn} ${sort === 'name' ? 'bg-surface-2 text-text' : ''}`} onClick={() => setSort('name')}>By name</button>
          </div>
        </div>
        <div className="flex-1" />
        <button className={btn} onClick={() => setShowNetworkMgr(true)}>Networks</button>
        <button className={btn} onClick={() => setShowTokenMgr(true)}>Tokens</button>
      </section>

      <Matrix view={view} sort={sort} onCell={(tid, nid) => setHistoryCell({ tid, nid })} onDrop={setTransferIntent} />

      {scanning && <ScanOverlay progress={scanProgress} activeChain={activeChain} totalChains={totalChains} />}
      {transferIntent && <TransferModal intent={transferIntent} onClose={() => setTransferIntent(null)} />}
      {historyCell && <HistoryModal tokenId={historyCell.tid} chainId={historyCell.nid} onClose={() => setHistoryCell(null)} />}
      {showTokenMgr && <TokenManager onClose={() => setShowTokenMgr(false)} />}
      {showNetworkMgr && <NetworkManager onClose={() => setShowNetworkMgr(false)} />}
    </main>
  );
}
