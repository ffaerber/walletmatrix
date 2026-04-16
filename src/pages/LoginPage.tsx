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
      // Connect, then navigate to the address-scoped route. MatrixPage's
      // loadAddress effect will dedupe against the scan we just kicked off.
      const address = await connectMetaMask();
      navigate(`/address/${address}`);
    } catch (e: unknown) {
      const err = e as { code?: number; message?: string };
      // Code 4001 = user rejected the request.
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
    <main className="login-screen">
      <div className="login-card">
        <div className="logo-mark">
          <span /><span /><span />
          <span /><span /><span />
          <span /><span /><span />
        </div>
        <h1>WalletMatrix</h1>
        <p className="tagline">
          A pivot-table view of your crypto wallet across every EVM chain.
        </p>
        <button className="btn primary" onClick={handleConnect} disabled={busy}>
          {busy ? 'Connecting…' : 'Connect MetaMask'}
        </button>
        <button className="btn ghost" onClick={handleDemo}>
          Continue with demo wallet
        </button>
        <p className="disclaimer">
          Read-only. No signing is requested on connect. Keys never leave your wallet.
          Share a deep link like <code>#/address/0x…</code> or <code>#/address/vitalik</code> to view any wallet.
        </p>
      </div>
      <footer className="login-footer">
        Deployable to <a href="https://www.ethswarm.org" target="_blank" rel="noreferrer">Swarm</a> as a static site.
      </footer>
    </main>
  );
}
