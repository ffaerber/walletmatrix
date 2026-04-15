import { Outlet } from 'react-router';
import { WalletProvider } from './state/WalletContext';
import { ToastProvider, ToastStack } from './components/Toast';

export function AppLayout() {
  return (
    <ToastProvider>
      <WalletProvider>
        <div className="app-bg">
          <Outlet />
          <ToastStack />
        </div>
      </WalletProvider>
    </ToastProvider>
  );
}
