import { useMemo, useState, type FormEvent } from 'react';
import { useWallet } from '../state/WalletContext';
import { TokenIcon } from './Icons';
import { fmtAmount } from '../lib/format';
import { useToast } from './Toast';
import type { CustomTokenDraft, Token } from '../lib/types';

const btn = 'font-sans font-semibold border border-border bg-transparent text-text py-1.5 px-3 rounded-xl cursor-pointer text-[13px] hover:border-accent';
const inputCls = 'bg-bg border border-border rounded-lg py-2 px-2.5 font-mono';

export function TokenManager({ onClose }: { onClose: () => void }) {
  const { tokens, balances, hidden, toggleHide, hideZeroBalance, showAll, addCustomToken, removeCustomToken } = useWallet();
  const { push } = useToast();

  const rows = useMemo(() => {
    return tokens
      .map((t) => ({ token: t, total: Object.values(balances[t.id] ?? {}).reduce((a, b) => a + b, 0) }))
      .sort((a, b) => b.total - a.total);
  }, [tokens, balances]);

  const [form, setForm] = useState<CustomTokenDraft>({ symbol: '', name: '', price: '', icon: '', address: '' });

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.symbol.trim() || !form.name.trim()) { push('Symbol and name are required.', 'error'); return; }
    addCustomToken(form);
    push(`Added custom token ${form.symbol.toUpperCase()}.`, 'success');
    setForm({ symbol: '', name: '', price: '', icon: '', address: '' });
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface border border-border rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center gap-2.5">
          <div className="text-lg font-semibold">Manage Tokens</div>
          <div className="ml-auto flex items-center gap-2">
            <button className={btn} onClick={hideZeroBalance}>Hide zero-balance</button>
            <button className={btn} onClick={showAll}>Show all</button>
            <button className="w-8 h-8 rounded-lg border border-border bg-transparent text-text text-lg cursor-pointer hover:border-red hover:text-red" onClick={onClose} aria-label="Close">×</button>
          </div>
        </header>

        <div className="flex flex-col border border-border rounded-xl overflow-hidden">
          {rows.map(({ token, total }) => (
            <TokenRow key={token.id} token={token} total={total} isHidden={hidden.has(token.id)} onToggle={toggleHide} onRemove={removeCustomToken} />
          ))}
        </div>

        <form className="bg-surface-2 border border-border rounded-xl p-4 flex flex-col gap-3" onSubmit={submit}>
          <div className="text-lg font-semibold">Add custom token</div>
          <div className="grid grid-cols-2 gap-2.5 max-sm:grid-cols-1">
            <label className="flex flex-col gap-1">
              <span className="text-muted text-xs">Symbol</span>
              <input className={inputCls} value={form.symbol} onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value.toUpperCase() }))} placeholder="FOO" required />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-muted text-xs">Name</span>
              <input className={inputCls} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Foo Token" required />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-muted text-xs">Price (USD)</span>
              <input className={inputCls} type="number" step="any" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} placeholder="0.00" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-muted text-xs">Icon</span>
              <input className={inputCls} value={form.icon} onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value.slice(0, 2) }))} placeholder="?" />
            </label>
            <label className="flex flex-col gap-1 col-span-full">
              <span className="text-muted text-xs">Contract address (optional)</span>
              <input className={inputCls} value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="0x…" />
            </label>
          </div>
          <button type="submit" className="font-sans font-semibold border border-transparent bg-gradient-to-br from-accent to-[#00a8d8] text-[#041014] py-2.5 px-4 rounded-xl cursor-pointer">Add token</button>
        </form>
      </div>
    </div>
  );
}

function TokenRow({ token, total, isHidden, onToggle, onRemove }: {
  token: Token; total: number; isHidden: boolean;
  onToggle: (tid: string) => void; onRemove: (tid: string) => void;
}) {
  return (
    <div className={`grid grid-cols-[32px_1fr_auto_auto_auto] gap-3 items-center py-2.5 px-3.5 border-b border-border last:border-b-0 ${isHidden ? 'border-l-[3px] border-l-red opacity-50' : ''} ${token.custom ? 'border-l-[3px] border-l-green' : ''}`}>
      <TokenIcon token={token} size={32} />
      <div>
        <div className="font-bold flex items-center">
          {token.symbol}
          {token.custom && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green/15 text-green ml-1.5">CUSTOM</span>}
          {isHidden && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red/15 text-red ml-1.5">HIDDEN</span>}
        </div>
        <div className="text-muted text-xs">{token.name}</div>
      </div>
      <div className="text-muted font-mono">{fmtAmount(total)}</div>
      <button className="font-sans font-semibold border border-border bg-transparent text-text py-1.5 px-3 rounded-xl cursor-pointer text-[13px] hover:border-accent" onClick={() => onToggle(token.id)}>
        {isHidden ? 'Show' : 'Hide'}
      </button>
      {token.custom ? (
        <button className="font-sans font-semibold border border-red/40 bg-transparent text-red py-1.5 px-3 rounded-xl cursor-pointer text-[13px]" onClick={() => onRemove(token.id)}>Remove</button>
      ) : <span />}
    </div>
  );
}
