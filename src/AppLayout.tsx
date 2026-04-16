import { Outlet } from 'react-router';
import { WalletProvider } from './state/WalletContext';
import { ToastProvider, ToastStack } from './components/Toast';

export function AppLayout() {
  return (
    <ToastProvider>
      <WalletProvider>
        <div className="min-h-screen bg-[length:40px_40px] bg-[linear-gradient(rgba(0,212,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.03)_1px,transparent_1px)]">
          <Outlet />
          <ToastStack />
        </div>
      </WalletProvider>
    </ToastProvider>
  );
}
