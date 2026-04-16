import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useWallet } from '../state/WalletContext';
import { CHAINS_BY_ID } from '../lib/chains';
import { TokenIcon, ChainIcon } from './Icons';
import { fmtAmount, fmtUsd } from '../lib/format';
import { useToast } from './Toast';
import { executeQuote, fetchQuote, type TxStage } from '../lib/execute';
import { resolveTokenDecimals } from '../lib/tokenAddresses';
import { formatUnits as formatBigIntUnits } from '../lib/rpc';
import type { Chain, Token, TransferIntent } from '../lib/types';

const btnBase = 'font-sans font-semibold border rounded-xl cursor-pointer transition-transform active:translate-y-px disabled:opacity-60 disabled:cursor-not-allowed';

export function TransferModal({ intent, onClose }: { intent: TransferIntent; onClose: () => void }) {
  const { tokens, balances, prices, applyTransfer, demo, address, realTxEnabled, refreshBalances } = useWallet();
  const { push } = useToast();

  const fromToken = tokens.find((t) => t.id === intent.fromTid);
  const toToken = tokens.find((t) => t.id === intent.toTid);
  const fromChain = CHAINS_BY_ID[intent.fromNid] as Chain | undefined;
  const toChain = CHAINS_BY_ID[intent.toNid] as Chain | undefined;

  const ready = !!(fromToken && toToken && fromChain && toChain);
  const sameToken = intent.fromTid === intent.toTid;
  const kind = sameToken ? 'Bridge' : 'Cross-Chain Swap';
  const fromPrice = ready ? prices[fromToken!.symbol]?.price ?? fromToken!.price ?? 0 : 0;
  const toPrice = ready ? prices[toToken!.symbol]?.price ?? toToken!.price ?? 1 : 1;
  const mockSlip = sameToken ? 0.001 : 0.004;
  const mockFee = sameToken ? 0.003 : 0.006;
  const fromBalance = balances[intent.fromTid]?.[intent.fromNid] ?? 0;
  const toBalance = balances[intent.toTid]?.[intent.toNid] ?? 0;

  const [amount, setAmount] = useState<string>(String(Math.min(fromBalance, intent.fromAmount || 0)));
  const [stage, setStage] = useState<TxStage>({ kind: 'idle' });
  const [quoteBusy, setQuoteBusy] = useState(false);
  const [liveQuote, setLiveQuote] = useState<Awaited<ReturnType<typeof fetchQuote>> | null>(null);
  const useReal = realTxEnabled && !demo && !!address;

  const { received, rate, feeUsd, gasUsd, duration, toolName } = useMemo(() => {
    if (liveQuote && ready) {
      const toDecimals = resolveTokenDecimals(toToken!, intent.toNid);
      const fromDecimals = resolveTokenDecimals(fromToken!, intent.fromNid);
      const toAmt = Number(formatBigIntUnits(BigInt(liveQuote.estimate.toAmount), toDecimals));
      const fromAmt = Number(formatBigIntUnits(BigInt(liveQuote.estimate.fromAmount), fromDecimals)) || 1;
      const fee = (liveQuote.estimate.feeCosts ?? []).reduce((sum, c) => sum + Number(c.amountUSD ?? 0), 0);
      const gas = (liveQuote.estimate.gasCosts ?? []).reduce((sum, c) => sum + Number(c.amountUSD ?? 0), 0);
      return { received: toAmt, rate: toAmt / fromAmt, feeUsd: fee, gasUsd: gas, duration: liveQuote.estimate.executionDuration, toolName: liveQuote.toolDetails?.name ?? liveQuote.tool };
    }
    const n = Number(amount) || 0;
    const r = toPrice > 0 ? (n * fromPrice * (1 - mockSlip - mockFee)) / toPrice : 0;
    const rt = toPrice > 0 ? (fromPrice * (1 - mockSlip - mockFee)) / toPrice : 0;
    return { received: r, rate: rt, feeUsd: 0, gasUsd: 0, duration: 0, toolName: sameToken ? 'Across · Stargate · Hop' : 'Li.Fi · Squid · Jumper' };
  }, [liveQuote, amount, fromPrice, toPrice, mockSlip, mockFee, ready, fromToken, toToken, intent.fromNid, intent.toNid, sameToken]);

  useEffect(() => {
    if (!useReal || !ready) return;
    const n = Number(amount) || 0;
    if (n <= 0 || n > fromBalance) { setLiveQuote(null); return; }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setQuoteBusy(true);
      try {
        const q = await fetchQuote({ address: address!, fromToken: fromToken!, toToken: toToken!, fromChainId: intent.fromNid, toChainId: intent.toNid, amountHuman: amount }, ctrl.signal);
        setLiveQuote(q);
      } catch (e) { if ((e as Error).name !== 'AbortError') { setLiveQuote(null); push((e as Error).message, 'error'); } }
      finally { setQuoteBusy(false); }
    }, 500);
    return () => { ctrl.abort(); clearTimeout(t); };
  }, [useReal, ready, amount, fromBalance, fromToken, toToken, intent.fromNid, intent.toNid, address, push]);

  if (!ready) return null;
  const fromT = fromToken as Token;
  const toT = toToken as Token;
  const fromC = fromChain as Chain;
  const toC = toChain as Chain;
  const isBusy = stage.kind !== 'idle' && stage.kind !== 'error' && stage.kind !== 'done';

  async function confirm() {
    const n = Number(amount) || 0;
    if (n <= 0) return push('Enter an amount greater than zero.', 'error');
    if (n > fromBalance) return push('Amount exceeds balance.', 'error');
    if (!useReal) {
      applyTransfer({ fromTid: intent.fromTid, fromNid: intent.fromNid, toTid: intent.toTid, toNid: intent.toNid, amount: n });
      push(`${kind} submitted: ${fmtAmount(n)} ${fromT.symbol} on ${fromC.name} → ${toT.symbol} on ${toC.name}`, 'success');
      onClose(); return;
    }
    try {
      setStage({ kind: 'quoting' });
      const quote = liveQuote ?? (await fetchQuote({ address: address!, fromToken: fromT, toToken: toT, fromChainId: intent.fromNid, toChainId: intent.toNid, amountHuman: amount }));
      setLiveQuote(quote);
      await executeQuote({ address: address!, fromToken: fromT, toToken: toT, fromChainId: intent.fromNid, toChainId: intent.toNid, amountHuman: amount }, quote, setStage);
      push(`${kind} complete. Refreshing balances…`, 'success');
      await refreshBalances();
      setTimeout(onClose, 2000);
    } catch (e) { push(e instanceof Error ? e.message : String(e), 'error'); }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={isBusy ? undefined : onClose}>
      <div className="bg-surface border border-border rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center gap-2.5">
          <span className={`inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-semibold border ${sameToken ? 'text-accent border-accent/40' : 'text-yellow border-yellow/40'} bg-surface`}>{kind}</span>
          <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-semibold bg-surface-2 border border-border">
            <ChainIcon chainId={fromC.id} size={16} />
            {fromC.short} → {toC.short}
            <ChainIcon chainId={toC.id} size={16} />
          </span>
          {useReal && <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-semibold bg-surface-2 border border-border">LIVE</span>}
          <button className="ml-auto w-8 h-8 rounded-lg border border-border bg-transparent text-text text-lg cursor-pointer hover:border-red hover:text-red disabled:opacity-60" onClick={onClose} aria-label="Close" disabled={isBusy}>×</button>
        </header>

        <div className="grid grid-cols-[1fr_auto_1fr] max-sm:grid-cols-1 items-center gap-3">
          <Side label="From" token={fromT} chain={fromC} balance={fromBalance} />
          <div className="text-2xl text-accent text-center">{sameToken ? '→' : '⇄'}</div>
          <Side label="To" token={toT} chain={toC} balance={toBalance} />
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-muted">Amount</span>
          <div className="flex items-center bg-surface-2 border border-border rounded-xl py-1.5 pl-3.5 pr-1.5">
            <input className="flex-1 border-0 bg-transparent font-mono text-lg py-2.5 outline-none" type="number" min="0" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={isBusy} />
            <button className="bg-transparent border border-border rounded-lg text-accent font-bold py-1.5 px-2.5 cursor-pointer" onClick={() => setAmount(String(fromBalance))} disabled={isBusy}>MAX</button>
          </div>
        </label>

        <div className="bg-surface-2 border border-border rounded-xl p-3.5 flex items-center justify-between gap-3">
          <div>
            <div className="text-muted text-xs">{quoteBusy ? 'Fetching Li.Fi quote…' : liveQuote ? 'Live Li.Fi estimate' : 'Estimated receive'}</div>
            <div className="text-lg font-semibold font-mono text-green">{fmtAmount(received)} {toT.symbol}</div>
          </div>
          <div className="text-muted font-mono text-xs text-right">1 {fromT.symbol} ≈ {fmtAmount(rate)} {toT.symbol}</div>
        </div>

        {liveQuote && (
          <div className="flex flex-wrap gap-3 font-mono text-xs text-muted pt-2 border-t border-dashed border-border">
            <span>Tool: <b className="text-text">{toolName}</b></span>
            <span>Duration: {Math.max(1, Math.round(duration / 60))}m</span>
            {feeUsd > 0 && <span>Fee: {fmtUsd(feeUsd)}</span>}
            {gasUsd > 0 && <span>Gas: {fmtUsd(gasUsd)}</span>}
          </div>
        )}

        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="flex items-center gap-2 py-1.5 px-2.5 rounded-full bg-surface-2 border border-border border-l-[3px] font-semibold" style={{ borderLeftColor: 'var(--color-accent)', '--c': toC.color } as CSSProperties}>
            <TokenIcon token={fromT} size={22} />{fromT.symbol}
          </span>
          <span className="flex-1 h-px bg-border min-w-5" />
          <span className="text-muted font-mono text-xs">{toolName}</span>
          <span className="flex-1 h-px bg-border min-w-5" />
          <span className="flex items-center gap-2 py-1.5 px-2.5 rounded-full bg-surface-2 border border-border border-l-[3px] font-semibold" style={{ borderLeftColor: toC.color }}>
            <TokenIcon token={toT} size={22} />{toT.symbol}
          </span>
        </div>

        {stage.kind !== 'idle' && <StageIndicator stage={stage} />}

        <p className="text-muted text-xs leading-relaxed">
          {useReal ? (
            <>You will be prompted to switch chain, approve the token (ERC-20 only) and sign the transaction. Execution is routed through Li.Fi.</>
          ) : (
            <>{demo ? 'Demo mode: ' : 'Real-tx mode disabled: '}balances update locally. Set <code className="bg-surface-2 px-1.5 rounded font-mono text-[11px]">VITE_ENABLE_REAL_TX=true</code> to enable Li.Fi execution.</>
          )}
        </p>

        <div className="flex justify-end gap-2.5">
          <button className={`${btnBase} border-border bg-transparent text-text py-2.5 px-4`} onClick={onClose} disabled={isBusy}>Cancel</button>
          <button className={`${btnBase} border-transparent bg-gradient-to-br from-accent to-[#00a8d8] text-[#041014] py-2.5 px-4`} onClick={confirm} disabled={isBusy || (useReal && quoteBusy)}>
            {isBusy ? 'Running…' : stage.kind === 'done' ? 'Done ✓' : `Confirm ${kind}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function Side({ label, token, chain, balance }: { label: string; token: Token; chain: Chain; balance: number }) {
  return (
    <div className="bg-surface-2 border border-border border-l-[3px] rounded-xl p-3.5 flex flex-col gap-2" style={{ borderLeftColor: chain.color }}>
      <div className="text-muted text-xs">{label}</div>
      <div className="flex items-center gap-2.5">
        <TokenIcon token={token} size={36} />
        <div>
          <div className="text-lg font-semibold">{token.symbol}</div>
          <div className="text-muted text-xs">on {chain.name}</div>
        </div>
      </div>
      <div className="text-muted text-xs">Balance: {fmtAmount(balance)} {token.symbol} · {fmtUsd(balance * (token.price || 0))}</div>
    </div>
  );
}

function StageIndicator({ stage }: { stage: TxStage }) {
  const { label, tone, txHash } = describeStage(stage);
  const dotCls = tone === 'run' ? 'bg-accent animate-pulse-dot' : tone === 'ok' ? 'bg-green' : 'bg-red';
  return (
    <div className={`flex items-center gap-2.5 py-2.5 px-3.5 border rounded-xl bg-surface-2 font-mono text-xs ${tone === 'err' ? 'border-red/35' : 'border-border'}`}>
      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotCls}`} />
      <span className="flex-1">{label}</span>
      {txHash && <a href={`https://scan.li.fi/tx/${txHash}`} target="_blank" rel="noreferrer" className="text-accent no-underline font-bold hover:underline">view tx</a>}
    </div>
  );
}

function describeStage(s: TxStage): { label: string; tone: 'run' | 'ok' | 'err'; txHash?: string } {
  switch (s.kind) {
    case 'idle': return { label: '', tone: 'run' };
    case 'quoting': return { label: 'Fetching Li.Fi quote…', tone: 'run' };
    case 'ready': return { label: 'Quote ready', tone: 'run' };
    case 'switching': return { label: 'Switching network in MetaMask…', tone: 'run' };
    case 'approving': return { label: s.txHash ? 'Waiting for approve to confirm…' : 'Sign approval in MetaMask…', tone: 'run', txHash: s.txHash };
    case 'signing': return { label: 'Sign transaction in MetaMask…', tone: 'run' };
    case 'pending': return { label: s.label, tone: 'run', txHash: s.txHash };
    case 'done': return { label: 'Complete ✓', tone: 'ok', txHash: s.txHash };
    case 'error': return { label: `Error: ${s.message}`, tone: 'err' };
  }
}
