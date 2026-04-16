import {
  useCallback,
  useMemo,
  useState,
  type DragEvent,
} from 'react';
import { useWallet } from '../state/WalletContext';
import { CHAINS, CHAINS_BY_ID } from '../lib/chains';
import { TokenIcon, ChainIcon } from './Icons';
import { fmtAmount, fmtUsd } from '../lib/format';
import { isNativeOnChain } from '../lib/tokenAddresses';
import { getValidBridgeTargets } from '../lib/lifiTokens';
import type { Chain, ChainId, Token } from '../lib/types';

export type MatrixView = 'all' | 'hasBalance';
export type MatrixSort = 'value' | 'name';

interface MatrixProps {
  view: MatrixView;
  sort: MatrixSort;
  onCell: (tokenId: string, chainId: ChainId) => void;
  onDrop: (intent: {
    fromTid: string;
    fromNid: ChainId;
    fromAmount: number;
    toTid: string;
    toNid: ChainId;
  }) => void;
}

interface Row {
  token: Token;
  row: Record<string, number>;
  price: number;
  change: number;
  totalAmount: number;
  totalUsd: number;
}

interface DragCtx {
  tokenId: string;
  chainId: ChainId;
  amount: number;
  symbol: string;
  validTargets: Set<string>;
}

export function Matrix({ view, sort, onCell, onDrop }: MatrixProps) {
  const { tokens, balances, prices, hidden, hiddenChains } = useWallet();
  const [dragCtx, setDragCtx] = useState<DragCtx | null>(null);

  const activeChains = useMemo<Chain[]>(() => {
    return CHAINS.filter((c) => !hiddenChains.has(c.id));
  }, [hiddenChains]);

  const rows = useMemo<Row[]>(() => {
    const enriched: Row[] = tokens.map((t) => {
      const row = balances[t.id] ?? {};
      const price = prices[t.symbol]?.price ?? t.price ?? 0;
      const change = prices[t.symbol]?.change ?? 0;
      const total = Object.values(row).reduce((a, b) => a + b, 0);
      return { token: t, row, price, change, totalAmount: total, totalUsd: total * price };
    });
    let filtered = enriched.filter((r) => !hidden.has(r.token.id));
    if (view === 'hasBalance') filtered = filtered.filter((r) => r.totalAmount > 0);
    if (sort === 'value') filtered.sort((a, b) => b.totalUsd - a.totalUsd);
    else filtered.sort((a, b) => a.token.symbol.localeCompare(b.token.symbol));
    return filtered;
  }, [tokens, balances, prices, hidden, view, sort]);

  const maxRowUsd = Math.max(1, ...rows.map((r) => r.totalUsd));

  const columnTotals = useMemo<Record<string, number>>(() => {
    const out: Record<string, number> = {};
    activeChains.forEach((c) => {
      out[c.id] = rows.reduce((sum, r) => sum + (r.row[c.id] ?? 0) * r.price, 0);
    });
    return out;
  }, [rows, activeChains]);

  const grandTotal = rows.reduce((sum, r) => sum + r.totalUsd, 0);

  const onDragStart = useCallback((tokenId: string, chainId: ChainId, amount: number) => {
    const token = tokens.find((t) => t.id === tokenId);
    const symbol = token?.symbol ?? tokenId.toUpperCase();
    const aliases = token?.aliases ?? [];
    const validTargets = getValidBridgeTargets(symbol, aliases, chainId);
    setDragCtx({ tokenId, chainId, amount, symbol, validTargets });
  }, [tokens]);

  const onDragEnd = useCallback(() => setDragCtx(null), []);

  return (
    <div className="px-6 pb-20 pt-4 overflow-x-auto">
      <table className="border-separate border-spacing-1 w-full min-w-[960px] font-mono text-[13px]">
        <thead>
          <tr>
            <th className="text-left font-sans font-extrabold tracking-widest uppercase text-[11px] text-muted bg-transparent border-0 p-2.5">Token</th>
            {activeChains.map((c) => (
              <th key={c.id} className="min-w-[140px] bg-gradient-to-b from-surface to-surface-2 border border-border rounded-xl p-2.5" style={{ borderTopColor: c.color, borderTopWidth: 2 }}>
                <div className="flex items-center gap-2">
                  <ChainIcon chainId={c.id} size={22} />
                  <div>
                    <div className="font-sans font-semibold text-text">{c.name}</div>
                    <div className="font-mono text-muted text-[11px]">{fmtUsd(columnTotals[c.id] ?? 0)}</div>
                  </div>
                </div>
              </th>
            ))}
            <th className="min-w-[150px] bg-surface-2 border border-border rounded-xl p-2.5 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <MatrixRow
              key={r.token.id}
              row={r}
              activeChains={activeChains}
              maxUsd={maxRowUsd}
              dragCtx={dragCtx}
              onCell={onCell}
              onDrop={onDrop}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            />
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td className="text-left p-2.5"><span className="text-muted">Grand total</span></td>
            <td colSpan={activeChains.length} />
            <td className="min-w-[150px] bg-surface-2 border border-border rounded-xl p-2.5 text-right font-mono font-bold text-yellow text-lg">{fmtUsd(grandTotal)}</td>
          </tr>
        </tfoot>
      </table>
      {!rows.length && (
        <div className="py-12 text-center text-muted italic">
          No tokens to display. Try switching the view filter or connect a different wallet.
        </div>
      )}
    </div>
  );
}

interface MatrixRowProps {
  row: Row;
  activeChains: Chain[];
  maxUsd: number;
  dragCtx: DragCtx | null;
  onCell: MatrixProps['onCell'];
  onDrop: MatrixProps['onDrop'];
  onDragStart: (tokenId: string, chainId: ChainId, amount: number) => void;
  onDragEnd: () => void;
}

function MatrixRow({ row, activeChains, maxUsd, dragCtx, onCell, onDrop, onDragStart, onDragEnd }: MatrixRowProps) {
  const { token, row: bal, price, change, totalAmount, totalUsd } = row;
  const barPct = Math.round((totalUsd / maxUsd) * 100);
  return (
    <tr>
      <th className="text-left min-w-[200px] bg-surface-2 border border-border rounded-xl p-2.5">
        <div className="flex items-center gap-2.5">
          <TokenIcon token={token} size={32} />
          <div>
            <div className="font-sans font-bold text-sm flex items-center">
              {token.symbol}
              {token.custom && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green/15 text-green ml-1.5">CUSTOM</span>}
            </div>
            <div className="text-muted text-xs">{token.name}</div>
          </div>
        </div>
      </th>
      {activeChains.map((c) => (
        <MatrixCell
          key={c.id}
          tokenId={token.id}
          chainId={c.id}
          amount={bal[c.id] ?? 0}
          price={price}
          change={change}
          isNative={isNativeOnChain(token, c.id)}
          dragCtx={dragCtx}
          onCell={onCell}
          onDrop={onDrop}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        />
      ))}
      <td className="min-w-[150px] bg-surface-2 border border-border rounded-xl p-2.5 text-right">
        <div className="flex flex-col gap-0.5 items-end">
          <div className="font-bold">{fmtAmount(totalAmount)}</div>
          <div className="text-yellow text-xs">{fmtUsd(totalUsd)}</div>
          <div className="h-1 w-full bg-border rounded-sm overflow-hidden">
            <span className="block h-full bg-gradient-to-r from-accent to-green" style={{ width: `${barPct}%` }} />
          </div>
        </div>
      </td>
    </tr>
  );
}

interface MatrixCellProps {
  tokenId: string;
  chainId: ChainId;
  amount: number;
  price: number;
  change: number;
  isNative: boolean;
  dragCtx: DragCtx | null;
  onCell: MatrixProps['onCell'];
  onDrop: MatrixProps['onDrop'];
  onDragStart: (tokenId: string, chainId: ChainId, amount: number) => void;
  onDragEnd: () => void;
}

function MatrixCell({
  tokenId, chainId, amount, price, change, isNative,
  dragCtx, onCell, onDrop, onDragStart, onDragEnd,
}: MatrixCellProps) {
  const [hovering, setHovering] = useState(false);
  const usd = amount * price;
  const isHigh = usd >= 500;
  const isEmpty = amount <= 0;

  const isSource = dragCtx?.chainId === chainId && dragCtx?.tokenId === tokenId;
  const isValidTarget = dragCtx && !isSource && dragCtx.validTargets.has(chainId);
  const isInvalidTarget = dragCtx && !isSource && !dragCtx.validTargets.has(chainId);

  function handleDragStart(e: DragEvent<HTMLTableCellElement>) {
    if (isEmpty) { e.preventDefault(); return; }
    const payload = { tokenId, chainId, amount };
    e.dataTransfer.setData('application/json', JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'move';
    const ghost = document.createElement('div');
    ghost.className = 'fixed -top-[1000px] -left-[1000px] py-1.5 px-3 bg-surface border border-accent rounded-lg text-text font-mono text-xs pointer-events-none';
    ghost.textContent = `${fmtAmount(amount)} ${tokenId.toUpperCase()} · ${CHAINS_BY_ID[chainId]?.short ?? chainId}`;
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 20, 16);
    setTimeout(() => ghost.remove(), 0);
    onDragStart(tokenId, chainId, amount);
  }

  function handleDragOver(e: DragEvent<HTMLTableCellElement>) {
    if (isInvalidTarget) return;
    e.preventDefault();
    setHovering(true);
  }

  function handleDragLeave() { setHovering(false); }

  function handleDrop(e: DragEvent<HTMLTableCellElement>) {
    e.preventDefault();
    setHovering(false);
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json')) as {
        tokenId: string; chainId: ChainId; amount: number;
      } | null;
      if (!data || data.chainId === chainId) return;
      onDrop({ fromTid: data.tokenId, fromNid: data.chainId, fromAmount: data.amount, toTid: tokenId, toNid: chainId });
    } catch { /* no-op */ }
  }

  const cls = [
    'text-right min-w-[130px] bg-surface border border-border rounded-xl p-2.5 transition-all duration-100',
    isEmpty ? 'cursor-default text-muted !bg-transparent' : 'cursor-grab active:cursor-grabbing',
    isNative && !isEmpty ? 'bg-white/4 border-white/12' : '',
    isNative && isEmpty ? 'bg-white/2' : '',
    isHigh ? 'bg-green/8 border-green/35' : '',
    hovering && isValidTarget ? 'border-green shadow-[0_0_0_1px_var(--color-green)_inset]' : '',
    isInvalidTarget ? 'opacity-30 cursor-not-allowed' : '',
    isValidTarget && !hovering ? 'border-green/25' : '',
  ].join(' ');

  return (
    <td
      className={cls}
      draggable={!isEmpty}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onDragEnd={onDragEnd}
      onClick={() => !isEmpty && onCell(tokenId, chainId)}
    >
      {isEmpty ? (
        <span className="text-lg opacity-30">·</span>
      ) : (
        <div className="flex flex-col gap-0.5 items-end">
          <div className="font-bold">{fmtAmount(amount)}</div>
          <div className="text-muted text-[11px]">{fmtUsd(usd)}</div>
          <div className={`text-[11px] ${change >= 0 ? 'text-green' : 'text-red'}`}>
            {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
          </div>
        </div>
      )}
    </td>
  );
}
