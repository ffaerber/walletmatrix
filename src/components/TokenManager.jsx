import { useMemo, useState } from 'react';
import { useWallet } from '../state/WalletContext.jsx';
import { TokenIcon } from './Icons.jsx';
import { fmtAmount } from '../lib/format.js';
import { useToast } from './Toast.jsx';

export function TokenManager({ onClose }) {
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
        total: Object.values(balances[t.id] || {}).reduce((a, b) => a + b, 0),
      }))
      .sort((a, b) => b.total - a.total);
  }, [tokens, balances]);

  const [form, setForm] = useState({ symbol: '', name: '', price: '', icon: '', address: '' });

  function submit(e) {
    e.preventDefault();
    if (!form.symbol.trim() || !form.name.trim()) {
      return push('Symbol and name are required.', 'error');
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
          {rows.map(({ token, total }) => {
            const isHidden = hidden.has(token.id);
            return (
              <div
                key={token.id}
                className={`tm-row ${isHidden ? 'hidden' : ''} ${token.custom ? 'custom' : ''}`}
              >
                <TokenIcon token={token} size={32} />
                <div className="tm-meta">
                  <div className="sym">
                    {token.symbol}
                    {token.custom && <span className="badge custom">CUSTOM</span>}
                    {isHidden && <span className="badge red">HIDDEN</span>}
                  </div>
                  <div className="muted small">{token.name}</div>
                </div>
                <div className="tm-total muted">{fmtAmount(total)}</div>
                <button className="btn ghost small" onClick={() => toggleHide(token.id)}>
                  {isHidden ? 'Show' : 'Hide'}
                </button>
                {token.custom && (
                  <button
                    className="btn ghost small danger"
                    onClick={() => removeCustomToken(token.id)}
                  >
                    Remove
                  </button>
                )}
              </div>
            );
          })}
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
