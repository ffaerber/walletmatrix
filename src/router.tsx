import { createHashRouter, Navigate } from 'react-router';
import { AppLayout } from './AppLayout';
import LoginPage from './pages/LoginPage';
import MatrixPage from './pages/MatrixPage';

// HashRouter is required for Swarm/Bee static deploys: gateways serve the
// exact path requested and don't rewrite unknown paths back to index.html, so
// routing has to live inside the URL fragment (`#/address/0x…`, `#/`).
//
// The address route accepts a 0x address, an ENS name (e.g. "vitalik"),
// or the literal `demo` sentinel. ENS names are resolved on-chain by
// MatrixPage before scanning.
// Legacy `#/matrix/0x…` form is kept for backward compatibility.
export const router = createHashRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <LoginPage /> },
      // Primary deeplink: /#/address/0xabc… or /#/address/vitalik or /#/address/demo
      { path: 'address/:addressOrEns', element: <MatrixPage /> },
      // Legacy long form kept for backward compat.
      { path: 'matrix/:address', element: <MatrixPage /> },
      { path: 'matrix', element: <Navigate to="/" replace /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
