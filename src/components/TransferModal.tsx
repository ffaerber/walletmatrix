import { useMemo, useState, type CSSProperties } from 'react';
import { useWallet } from '../state/WalletContext';
import { CHAINS_BY_ID } from '../lib/chains';
import { TokenIcon, ChainIcon } from './Icons';
import { fmtAmount, fmtUsd } from '../lib/format';
import { useToast } from './Toast';
import type { Chain, Token, TransferIntent } from '../lib/types';

interface TransferModalProps {
  intent: TransferIntent;
  onClose: () => void;
}

// One modal serves both bridge (same token, different chains) and
// cross-chain swap (different token). Labels, fees and the center glyph
// adapt based on whether fromTid === toTid.
export function TransferModal({ intent, onClose }: TransferModalProps) {
  const { tokens, balances, prices, applyTransfer } = useWallet();
  const { push } = useToast();

  const fromToken = tokens.find((t) => t.id === intent.fromTid);
  const toToken = tokens.find((t) => t.id === intent.toTid);
  const fromChain = CHAINS_BY_ID[intent.fromNid] as Chain | undefined;
  const toChain = CHAINS_BY_ID[intent.toNid] as Chain | undefined;

  const ready = !!(fromToken && toToken && fromChain && toChain);
  const sameToken = intent.fromTid === intent.toTid;
  const slip = sameToken ? 0.001 : 0.004;
  const fee = sameToken ? 0.003 : 0.006;
  const fromPrice = ready
    ? prices[fromToken!.symbol]?.price ?? fromToken!.price ?? 0
    : 0;
  const toPrice = ready
    ? prices[toToken!.symbol]?.price ?? toToken!.price ?? 1
    : 1;

  const fromBalance = balances[intent.fromTid]?.[intent.fromNid] ?? 0;
  const toBalance = balances[intent.toTid]?.[intent.toNid] ?? 0;

  const [amount, setAmount] = useState<string>(
    String(Math.min(fromBalance, intent.fromAmount || 0)),
  );

  const { received, rate } = useMemo(() => {
    const n = Number(amount) || 0;
    const r = toPrice > 0 ? (n * fromPrice * (1 - slip - fee)) / toPrice : 0;
    const rt = toPrice > 0 ? (fromPrice * (1 - slip - fee)) / toPrice : 0;
    return { received: r, rate: rt };
  }, [amount, fromPrice, toPrice, slip, fee]);

  if (!ready) return null;
  // Non-null locals for convenience; by this point the guard above ensures
  // all four values exist.
  const fromT = fromToken as Token;
  const toT = toToken as Token;
  const fromC = fromChain as Chain;
  const toC = toChain as Chain;

  const kind = sameToken ? 'Bridge' : 'Cross-Chain Swap';

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
      `${kind} submitted: ${fmtAmount(n)} ${fromT.symbol} on ${fromC.name} → ${toT.symbol} on ${toC.name}`,
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
            <ChainIcon chainId={fromC.id} size={16} />
            {fromC.short} → {toC.short}
            <ChainIcon chainId={toC.id} size={16} />
          </span>
          <button className="icon-btn" onClick={onClose} aria-label="Close">×</button>
        </header>

        <div className="transfer-grid">
          <TransferSide label="From" token={fromT} chain={fromC} balance={fromBalance} />
          <div className="arrow">{sameToken ? '→' : '⇄'}</div>
          <TransferSide label="To" token={toT} chain={toC} balance={toBalance} />
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
            <div className="big">{fmtAmount(received)} {toT.symbol}</div>
          </div>
          <div className="rate">
            1 {fromT.symbol} ≈ {fmtAmount(rate)} {toT.symbol}
          </div>
        </div>

        <div className="route-viz">
          <span className="route-node">
            <TokenIcon token={fromT} size={22} />
            {fromT.symbol}
          </span>
          <span className="route-line" />
          <span className="route-router">
            {sameToken ? 'Across · Stargate · Hop' : 'Li.Fi · Squid · Jumper'}
          </span>
          <span className="route-line" />
          <span className="route-node" style={{ '--c': toC.color } as CSSProperties}>
            <TokenIcon token={toT} size={22} />
            {toT.symbol}
          </span>
        </div>

        <p className="muted small gas-note">
          Gas paid on {fromC.name}. Protocol fee {(fee * 100).toFixed(2)}%, slippage
          tolerance {(slip * 100).toFixed(2)}%. Demo mode updates balances locally. In
          production this opens MetaMask to sign a{sameToken ? ' bridge' : ' cross-chain swap'}{' '}
          transaction via the Li.Fi API.
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

interface TransferSideProps {
  label: string;
  token: Token;
  chain: Chain;
  balance: number;
}

function TransferSide({ label, token, chain, balance }: TransferSideProps) {
  const style = { '--c': chain.color } as CSSProperties;
  return (
    <div className="side" style={style}>
      <div className="muted small">{label}</div>
      <div className="side-main">
        <TokenIcon token={token} size={36} />
        <div>
          <div className="big">{token.symbol}</div>
          <div className="muted small">on {chain.name}</div>
        </div>
      </div>
      <div className="muted small">
        Balance: {fmtAmount(balance)} {token.symbol} · {fmtUsd(balance * (token.price || 0))}
      </div>
    </div>
  );
}
