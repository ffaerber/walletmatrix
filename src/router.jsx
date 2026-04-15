import { createHashRouter, Navigate } from 'react-router';
import { AppLayout } from './AppLayout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import MatrixPage from './pages/MatrixPage.jsx';

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
