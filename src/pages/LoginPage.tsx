import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useWallet } from '../state/WalletContext';
import { useToast } from '../components/Toast';
import { DEMO_ADDRESS_PARAM } from '../lib/format';

export default function LoginPage() {
  const navigate = useNavigate();
  const { connectMetaMask } = useWallet();
  const { push } = useToast();
  const [busy, setBusy] = useState(false);

  async function handleConnect() {
    if (busy) return;
    setBusy(true);
    try {
      if (!window.ethereum) {
        push('MetaMask not detected. Install it or use the demo wallet.', 'error');
        return;
      }
      const address = await connectMetaMask();
      navigate(`/address/${address}`);
    } catch (e: unknown) {
      const err = e as { code?: number; message?: string };
      if (err?.code === 4001) push('Connection request was rejected.', 'info');
      else push(err?.message ?? 'Failed to connect wallet.', 'error');
    } finally {
      setBusy(false);
    }
  }

  function handleDemo() {
    push('Loaded demo wallet.', 'success');
    navigate(`/address/${DEMO_ADDRESS_PARAM}`);
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 gap-6">
      <div className="bg-surface border border-border rounded-2xl p-10 max-w-md w-full flex flex-col gap-3 items-stretch text-center">
        <div className="mx-auto grid grid-cols-3 gap-[3px]">
          {[1,0.5,0.2,0.5,1,0.5,0.2,0.5,1].map((o, i) => (
            <span key={i} className="w-3.5 h-3.5 bg-accent rounded-sm" style={{ opacity: o }} />
          ))}
        </div>
        <h1 className="font-sans font-extrabold text-3xl mt-3 -tracking-wide">WalletMatrix</h1>
        <p className="text-muted mb-4">
          A pivot-table view of your crypto wallet across every EVM chain.
        </p>
        <button
          className="font-sans font-semibold border border-transparent bg-gradient-to-br from-accent to-[#00a8d8] text-[#041014] py-3 px-4 rounded-xl cursor-pointer text-[15px] transition-transform active:translate-y-px disabled:opacity-60 disabled:cursor-not-allowed"
          onClick={handleConnect}
          disabled={busy}
        >
          {busy ? 'Connecting…' : 'Connect MetaMask'}
        </button>
        <button
          className="font-sans font-semibold border border-border bg-transparent text-text py-3 px-4 rounded-xl cursor-pointer text-[15px] transition-transform active:translate-y-px hover:border-accent"
          onClick={handleDemo}
        >
          Continue with demo wallet
        </button>
        <p className="text-muted text-xs mt-2">
          Read-only. No signing is requested on connect. Keys never leave your wallet.
          Share a deep link like <code className="bg-surface-2 px-1.5 rounded font-mono text-[11px]">#/address/0x…</code> or <code className="bg-surface-2 px-1.5 rounded font-mono text-[11px]">#/address/vitalik</code> to view any wallet.
        </p>
      </div>
      <footer className="text-muted text-xs">
        Deployable to <a href="https://www.ethswarm.org" target="_blank" rel="noreferrer">Swarm</a> as a static site.
      </footer>
    </main>
  );
}
