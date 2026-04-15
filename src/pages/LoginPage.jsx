import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useWallet } from '../state/WalletContext.jsx';
import { useToast } from '../components/Toast.jsx';

export default function LoginPage() {
  const navigate = useNavigate();
  const { connectMetaMask, connectDemo } = useWallet();
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
      // Kick off the scan and navigate immediately so the overlay shows.
      navigate('/matrix');
      await connectMetaMask();
    } catch (e) {
      // Code 4001 = user rejected the request.
      if (e?.code === 4001) push('Connection request was rejected.', 'info');
      else push(e.message || 'Failed to connect wallet.', 'error');
      navigate('/');
    } finally {
      setBusy(false);
    }
  }

  function handleDemo() {
    connectDemo();
    push('Loaded demo wallet.', 'success');
    navigate('/matrix');
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
        </p>
      </div>
      <footer className="login-footer">
        Deployable to <a href="https://www.ethswarm.org" target="_blank" rel="noreferrer">Swarm</a> as a static site.
      </footer>
    </main>
  );
}
