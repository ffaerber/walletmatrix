import { createHashRouter, Navigate } from 'react-router';
import { AppLayout } from './AppLayout';
import LoginPage from './pages/LoginPage';
import MatrixPage from './pages/MatrixPage';

// HashRouter is required for Swarm/Bee static deploys: gateways serve the
// exact path requested and don't rewrite unknown paths back to index.html, so
// routing has to live inside the URL fragment (`#/0x…`, `#/`).
//
// The matrix route takes a wallet address (or the literal `demo` sentinel)
// as a URL parameter. Deep-linking to `#/0xabc…` triggers a scan for
// that address on load; sharing `#/demo` boots the demo wallet.
// The legacy `#/matrix/0x…` form is kept for backward compatibility.
export const router = createHashRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <LoginPage /> },
      // Short deeplink: /#/0xabc… or /#/demo
      { path: ':address', element: <MatrixPage /> },
      // Legacy long form kept for backward compat.
      { path: 'matrix/:address', element: <MatrixPage /> },
      { path: 'matrix', element: <Navigate to="/" replace /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
