import {
  useMemo,
  useState,
  type CSSProperties,
  type DragEvent,
} from 'react';
import { useWallet } from '../state/WalletContext';
import { CHAINS, CHAINS_BY_ID } from '../lib/chains';
import { TokenIcon, ChainIcon } from './Icons';
import { fmtAmount, fmtUsd } from '../lib/format';
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

export function Matrix({ view, sort, onCell, onDrop }: MatrixProps) {
  const { tokens, balances, prices, hidden, hiddenChains } = useWallet();

  // Show all chains not in the hidden set. Empty chains are auto-hidden
  // after a scan, but the user can bring them back via the Networks manager.
  const activeChains = useMemo<Chain[]>(() => {
    return CHAINS.filter((c) => !hiddenChains.has(c.id));
  }, [hiddenChains]);

  // Filter and sort tokens for display.
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

  return (
    <div className="matrix-wrap">
      <table className="matrix">
        <thead>
          <tr>
            <th className="corner">Token</th>
            {activeChains.map((c) => {
              const style = { '--c': c.color } as CSSProperties;
              return (
                <th key={c.id} className="chain-head" style={style}>
                  <div className="chain-head-inner">
                    <ChainIcon chainId={c.id} size={22} />
                    <div>
                      <div className="chain-name">{c.name}</div>
                      <div className="chain-total">{fmtUsd(columnTotals[c.id] ?? 0)}</div>
                    </div>
                  </div>
                </th>
              );
            })}
            <th className="totals">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <MatrixRow
              key={r.token.id}
              row={r}
              activeChains={activeChains}
              maxUsd={maxRowUsd}
              onCell={onCell}
              onDrop={onDrop}
            />
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td className="corner">
              <span className="muted">Grand total</span>
            </td>
            <td colSpan={activeChains.length}></td>
            <td className="totals grand">{fmtUsd(grandTotal)}</td>
          </tr>
        </tfoot>
      </table>
      {!rows.length && (
        <div className="empty-state">
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
  onCell: MatrixProps['onCell'];
  onDrop: MatrixProps['onDrop'];
}

function MatrixRow({ row, activeChains, maxUsd, onCell, onDrop }: MatrixRowProps) {
  const { token, row: bal, price, change, totalAmount, totalUsd } = row;
  const barPct = Math.round((totalUsd / maxUsd) * 100);
  return (
    <tr>
      <th className="token-head">
        <div className="token-head-inner">
          <TokenIcon token={token} size={32} />
          <div>
            <div className="sym">
              {token.symbol}
              {token.custom && <span className="badge custom">CUSTOM</span>}
            </div>
            <div className="muted small">{token.name}</div>
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
          onCell={onCell}
          onDrop={onDrop}
        />
      ))}
      <td className="totals">
        <div className="total-stack">
          <div className="amt">{fmtAmount(totalAmount)}</div>
          <div className="usd">{fmtUsd(totalUsd)}</div>
          <div className="bar"><span style={{ width: `${barPct}%` }} /></div>
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
  onCell: MatrixProps['onCell'];
  onDrop: MatrixProps['onDrop'];
}

type DragState = 'ok' | 'bad' | null;

function MatrixCell({ tokenId, chainId, amount, price, change, onCell, onDrop }: MatrixCellProps) {
  const [dragState, setDragState] = useState<DragState>(null);
  const usd = amount * price;
  const isHigh = usd >= 500;
  const isEmpty = amount <= 0;

  function handleDragStart(e: DragEvent<HTMLTableCellElement>) {
    if (isEmpty) {
      e.preventDefault();
      return;
    }
    const payload = { tokenId, chainId, amount };
    e.dataTransfer.setData('application/json', JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'move';
    // Custom ghost — amount + source chain name.
    const ghost = document.createElement('div');
    ghost.className = 'drag-ghost';
    ghost.textContent = `${fmtAmount(amount)} ${tokenId.toUpperCase()} · ${CHAINS_BY_ID[chainId].short}`;
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 20, 16);
    setTimeout(() => ghost.remove(), 0);
  }

  function handleDragOver(e: DragEvent<HTMLTableCellElement>) {
    e.preventDefault();
    if (!e.dataTransfer.types.includes('application/json')) return;
    // We can't read the full payload during dragover (only types), so we
    // optimistically mark the cell as a valid drop target; onDrop filters
    // out same-chain drops.
    setDragState('ok');
  }

  function handleDragLeave() {
    setDragState(null);
  }

  function handleDrop(e: DragEvent<HTMLTableCellElement>) {
    e.preventDefault();
    setDragState(null);
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json')) as {
        tokenId: string;
        chainId: ChainId;
        amount: number;
      } | null;
      if (!data || data.chainId === chainId) return;
      onDrop({
        fromTid: data.tokenId,
        fromNid: data.chainId,
        fromAmount: data.amount,
        toTid: tokenId,
        toNid: chainId,
      });
    } catch {
      /* no-op */
    }
  }

  return (
    <td
      className={[
        'cell',
        isEmpty ? 'empty' : '',
        isHigh ? 'high-balance' : '',
        dragState === 'ok' ? 'drop-ok' : '',
        dragState === 'bad' ? 'drop-bad' : '',
      ].join(' ')}
      draggable={!isEmpty}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !isEmpty && onCell(tokenId, chainId)}
    >
      {isEmpty ? (
        <span className="dot">·</span>
      ) : (
        <div className="cell-inner">
          <div className="cell-amt">{fmtAmount(amount)}</div>
          <div className="cell-usd">{fmtUsd(usd)}</div>
          <div className={`cell-chg ${change >= 0 ? 'up' : 'down'}`}>
            {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
          </div>
        </div>
      )}
    </td>
  );
}
