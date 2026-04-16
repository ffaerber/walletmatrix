import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { initChains } from './lib/chains';
import { router } from './router';
import './styles.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

// Load chain metadata from the ethereum-lists/chains registry before
// rendering so every component sees populated CHAINS / CHAINS_BY_ID.
initChains().then(() => {
  createRoot(rootEl).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
});
