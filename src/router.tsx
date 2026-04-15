import { createHashRouter, Navigate } from 'react-router';
import { AppLayout } from './AppLayout';
import LoginPage from './pages/LoginPage';
import MatrixPage from './pages/MatrixPage';

// HashRouter is required for Swarm/Bee static deploys: gateways serve the
// exact path requested and don't rewrite unknown paths back to index.html, so
// routing has to live inside the URL fragment (`#/matrix`, `#/`).
export const router = createHashRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <LoginPage /> },
      { path: 'matrix', element: <MatrixPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
