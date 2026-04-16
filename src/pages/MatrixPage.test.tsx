import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import LoginPage from './LoginPage';
import MatrixPage from './MatrixPage';
import { Navigate } from 'react-router';
import { renderWithProviders } from '../test/renderWithProviders';

const routes = [
  { index: true, element: <LoginPage /> },
  { path: 'address/:addressOrEns', element: <MatrixPage /> },
  // Legacy route still supported.
  { path: 'matrix/:address', element: <MatrixPage /> },
  { path: '*', element: <Navigate to="/" replace /> },
];

describe('MatrixPage deep linking', () => {
  it('loads demo balances when the URL is /address/demo', async () => {
    renderWithProviders(routes, ['/address/demo']);

    // The demo wallet populates ETH across multiple chains; the token-head
    // cell is specific to the matrix view, so its presence means we scanned.
    expect(await screen.findByText(/DEMO/)).toBeInTheDocument();
    expect(await screen.findByText('Ether')).toBeInTheDocument();
  });

  it('loads demo balances via legacy /matrix/demo route', async () => {
    renderWithProviders(routes, ['/matrix/demo']);

    expect(await screen.findByText(/DEMO/)).toBeInTheDocument();
    expect(await screen.findByText('Ether')).toBeInTheDocument();
  });

  it('redirects to / when the address is a malformed 0x string', async () => {
    const { router } = renderWithProviders(routes, ['/address/0xinvalid']);
    // After the guard kicks in, LoginPage mounts.
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/');
    });
    expect(screen.getByRole('button', { name: /Connect MetaMask/i })).toBeInTheDocument();
  });

  it('renders the matrix header with a shortened address for a valid 0x URL', async () => {
    // Stub fetch so the scan resolves immediately with empty balances, which
    // is enough to render the header + toolbar.
    const addr = '0x' + 'a'.repeat(40);
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: '0x0' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });

    renderWithProviders(routes, [`/address/${addr}`]);

    // Header shows a shortened form of the URL address.
    expect(await screen.findByText(/0xaaaa…aaaa/)).toBeInTheDocument();
  });
});
