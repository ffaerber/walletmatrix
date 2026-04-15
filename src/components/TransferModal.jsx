import { useMemo, useState } from 'react';
import { useWallet } from '../state/WalletContext.jsx';
import { CHAINS_BY_ID } from '../lib/chains.js';
import { TokenIcon, ChainIcon } from './Icons.jsx';
import { fmtAmount, fmtUsd } from '../lib/format.js';
import { useToast } from './Toast.jsx';

// One modal serves both bridge (same token, different chains) and
// cross-chain swap (different token). Labels, fees and the center glyph
// adapt based on whether fromTid === toTid.
export function TransferModal({ intent, onClose }) {
  const { tokens, balances, prices, applyTransfer } = useWallet();
  const { push } = useToast();

  const fromToken = tokens.find((t) => t.id === intent.fromTid);
  const toToken = tokens.find((t) => t.id === intent.toTid);
  const fromChain = CHAINS_BY_ID[intent.fromNid];
  const toChain = CHAINS_BY_ID[intent.toNid];

  const fromBalance = balances[intent.fromTid]?.[intent.fromNid] || 0;
  const toBalance = balances[intent.toTid]?.[intent.toNid] || 0;
  const fromPrice = prices[fromToken?.symbol]?.price || fromToken?.price || 0;
  const toPrice = prices[toToken?.symbol]?.price || toToken?.price || 1;

  const sameToken = intent.fromTid === intent.toTid;
  const kind = sameToken ? 'Bridge' : 'Cross-Chain Swap';
  const slip = sameToken ? 0.001 : 0.004;
  const fee = sameToken ? 0.003 : 0.006;

  const [amount, setAmount] = useState(String(Math.min(fromBalance, intent.fromAmount || 0)));

  const { received, rate } = useMemo(() => {
    const n = Number(amount) || 0;
    const r = toPrice > 0 ? (n * fromPrice * (1 - slip - fee)) / toPrice : 0;
    const rt = toPrice > 0 ? (fromPrice * (1 - slip - fee)) / toPrice : 0;
    return { received: r, rate: rt };
  }, [amount, fromPrice, toPrice, slip, fee]);

  function setMax() {
    setAmount(String(fromBalance));
  }

  function confirm() {
    const n = Number(amount) || 0;
    if (n <= 0) return push('Enter an amount greater than zero.', 'error');
    if (n > fromBalance) return push('Amount exceeds balance.', 'error');
    applyTransfer({
      fromTid: intent.fromTid,
      fromNid: intent.fromNid,
      toTid: intent.toTid,
      toNid: intent.toNid,
      amount: n,
    });
    push(
      `${kind} submitted: ${fmtAmount(n)} ${fromToken.symbol} on ${fromChain.name} → ${toToken.symbol} on ${toChain.name}`,
      'success',
    );
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header>
          <span className={`pill pill-${sameToken ? 'bridge' : 'swap'}`}>{kind}</span>
          <span className="pill route">
            <ChainIcon chainId={fromChain.id} size={16} />
            {fromChain.short} → {toChain.short}
            <ChainIcon chainId={toChain.id} size={16} />
          </span>
          <button className="icon-btn" onClick={onClose} aria-label="Close">×</button>
        </header>

        <div className="transfer-grid">
          <TransferSide label="From" token={fromToken} chain={fromChain} balance={fromBalance} />
          <div className="arrow">{sameToken ? '→' : '⇄'}</div>
          <TransferSide label="To" token={toToken} chain={toChain} balance={toBalance} />
        </div>

        <label className="amount-row">
          <span className="muted">Amount</span>
          <div className="amount-input">
            <input
              type="number"
              min="0"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <button type="button" className="max-btn" onClick={setMax}>MAX</button>
          </div>
        </label>

        <div className="estimate">
          <div>
            <div className="muted small">Estimated receive</div>
            <div className="big">{fmtAmount(received)} {toToken.symbol}</div>
          </div>
          <div className="rate">
            1 {fromToken.symbol} ≈ {fmtAmount(rate)} {toToken.symbol}
          </div>
        </div>

        <div className="route-viz">
          <span className="route-node">
            <TokenIcon token={fromToken} size={22} />
            {fromToken.symbol}
          </span>
          <span className="route-line" />
          <span className="route-router">{sameToken ? 'Across · Stargate · Hop' : 'Li.Fi · Squid · Jumper'}</span>
          <span className="route-line" />
          <span className="route-node" style={{ '--c': toChain.color }}>
            <TokenIcon token={toToken} size={22} />
            {toToken.symbol}
          </span>
        </div>

        <p className="muted small gas-note">
          Gas paid on {fromChain.name}. Protocol fee {(fee * 100).toFixed(2)}%, slippage tolerance {(slip * 100).toFixed(2)}%.
          Demo mode updates balances locally. In production this opens MetaMask to sign a
          {sameToken ? ' bridge' : ' cross-chain swap'} transaction via the Li.Fi API.
        </p>

        <div className="modal-actions">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={confirm}>
            Confirm {kind}
          </button>
        </div>
      </div>
    </div>
  );
}

function TransferSide({ label, token, chain, balance }) {
  return (
    <div className="side" style={{ '--c': chain.color }}>
      <div className="muted small">{label}</div>
      <div className="side-main">
        <TokenIcon token={token} size={36} />
        <div>
          <div className="big">{token.symbol}</div>
          <div className="muted small">on {chain.name}</div>
        </div>
      </div>
      <div className="muted small">Balance: {fmtAmount(balance)} {token.symbol} · {fmtUsd(balance * (token.price || 0))}</div>
    </div>
  );
}
