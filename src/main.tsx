import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { initChains } from './lib/chains';
import { preloadLifiTokens } from './lib/lifiTokens';
import { router } from './router';
import './app.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

// Load chain metadata + Li.Fi token list before rendering so every
// component sees populated data from the start.
Promise.all([initChains(), preloadLifiTokens()]).then(() => {
  createRoot(rootEl).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
});
