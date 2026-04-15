import { useMemo, useState, type FormEvent } from 'react';
import { useWallet } from '../state/WalletContext';
import { TokenIcon } from './Icons';
import { fmtAmount } from '../lib/format';
import { useToast } from './Toast';
import type { CustomTokenDraft, Token } from '../lib/types';

interface TokenManagerProps {
  onClose: () => void;
}

export function TokenManager({ onClose }: TokenManagerProps) {
  const {
    tokens,
    balances,
    hidden,
    toggleHide,
    hideZeroBalance,
    showAll,
    addCustomToken,
    removeCustomToken,
  } = useWallet();
  const { push } = useToast();

  const rows = useMemo(() => {
    return tokens
      .map((t) => ({
        token: t,
        total: Object.values(balances[t.id] ?? {}).reduce((a, b) => a + b, 0),
      }))
      .sort((a, b) => b.total - a.total);
  }, [tokens, balances]);

  const [form, setForm] = useState<CustomTokenDraft>({
    symbol: '',
    name: '',
    price: '',
    icon: '',
    address: '',
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.symbol.trim() || !form.name.trim()) {
      push('Symbol and name are required.', 'error');
      return;
    }
    addCustomToken(form);
    push(`Added custom token ${form.symbol.toUpperCase()}.`, 'success');
    setForm({ symbol: '', name: '', price: '', icon: '', address: '' });
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <header>
          <div className="big">Manage Tokens</div>
          <div className="manager-actions">
            <button className="btn ghost small" onClick={hideZeroBalance}>Hide zero-balance</button>
            <button className="btn ghost small" onClick={showAll}>Show all</button>
            <button className="icon-btn" onClick={onClose} aria-label="Close">×</button>
          </div>
        </header>

        <div className="token-manager-list">
          {rows.map(({ token, total }) => (
            <TokenRow
              key={token.id}
              token={token}
              total={total}
              hidden={hidden.has(token.id)}
              onToggle={toggleHide}
              onRemove={removeCustomToken}
            />
          ))}
        </div>

        <form className="tm-form" onSubmit={submit}>
          <div className="big">Add custom token</div>
          <div className="tm-form-grid">
            <label>
              <span className="muted small">Symbol</span>
              <input
                value={form.symbol}
                onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value.toUpperCase() }))}
                placeholder="FOO"
                required
              />
            </label>
            <label>
              <span className="muted small">Name</span>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Foo Token"
                required
              />
            </label>
            <label>
              <span className="muted small">Price (USD)</span>
              <input
                type="number"
                step="any"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                placeholder="0.00"
              />
            </label>
            <label>
              <span className="muted small">Icon</span>
              <input
                value={form.icon}
                onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value.slice(0, 2) }))}
                placeholder="🐝"
              />
            </label>
            <label className="full">
              <span className="muted small">Contract address (optional)</span>
              <input
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="0x…"
              />
            </label>
          </div>
          <button type="submit" className="btn primary">Add token</button>
        </form>
      </div>
    </div>
  );
}

interface TokenRowProps {
  token: Token;
  total: number;
  hidden: boolean;
  onToggle: (tid: string) => void;
  onRemove: (tid: string) => void;
}

function TokenRow({ token, total, hidden, onToggle, onRemove }: TokenRowProps) {
  return (
    <div className={`tm-row ${hidden ? 'hidden' : ''} ${token.custom ? 'custom' : ''}`}>
      <TokenIcon token={token} size={32} />
      <div className="tm-meta">
        <div className="sym">
          {token.symbol}
          {token.custom && <span className="badge custom">CUSTOM</span>}
          {hidden && <span className="badge red">HIDDEN</span>}
        </div>
        <div className="muted small">{token.name}</div>
      </div>
      <div className="tm-total muted">{fmtAmount(total)}</div>
      <button className="btn ghost small" onClick={() => onToggle(token.id)}>
        {hidden ? 'Show' : 'Hide'}
      </button>
      {token.custom ? (
        <button className="btn ghost small danger" onClick={() => onRemove(token.id)}>
          Remove
        </button>
      ) : (
        <span />
      )}
    </div>
  );
}
