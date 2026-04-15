import { createHashRouter, Navigate } from 'react-router';
import { AppLayout } from './AppLayout';
import LoginPage from './pages/LoginPage';
import MatrixPage from './pages/MatrixPage';

// HashRouter is required for Swarm/Bee static deploys: gateways serve the
// exact path requested and don't rewrite unknown paths back to index.html, so
// routing has to live inside the URL fragment (`#/matrix/0x…`, `#/`).
//
// The matrix route takes a wallet address (or the literal `demo` sentinel)
// as a URL parameter. Deep-linking to `#/matrix/0xabc…` triggers a scan for
// that address on load; sharing `#/matrix/demo` boots the demo wallet.
export const router = createHashRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <LoginPage /> },
      { path: 'matrix/:address', element: <MatrixPage /> },
      // Bare /matrix with no address -> back to the login gate.
      { path: 'matrix', element: <Navigate to="/" replace /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
