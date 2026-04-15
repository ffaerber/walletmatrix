import type { ReactNode } from 'react';
import {
  createMemoryRouter,
  Outlet,
  RouterProvider,
  type RouteObject,
} from 'react-router';
import { render, type RenderResult } from '@testing-library/react';
import { WalletProvider } from '../state/WalletContext';
import { ToastProvider } from '../components/Toast';

function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <WalletProvider>{children}</WalletProvider>
    </ToastProvider>
  );
}

// Root route element: mounts the providers once and then renders the nested
// <Outlet /> so child routes run inside the same WalletProvider / ToastProvider
// stack as the real app.
function RootLayout() {
  return (
    <Providers>
      <Outlet />
    </Providers>
  );
}

// Test helper that mirrors AppLayout's provider stack but uses MemoryRouter
// instead of HashRouter so tests can drive navigation without touching the
// real window.location.
export function renderWithProviders(
  routes: RouteObject[],
  initialEntries: string[] = ['/'],
): RenderResult & { router: ReturnType<typeof createMemoryRouter> } {
  const router = createMemoryRouter(
    [{ element: <RootLayout />, children: routes }],
    { initialEntries },
  );
  const result = render(<RouterProvider router={router} />);
  return { ...result, router };
}
