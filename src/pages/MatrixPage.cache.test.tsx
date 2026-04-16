import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Navigate } from 'react-router';
import MatrixPage from './MatrixPage';
import LoginPage from './LoginPage';
import { renderWithProviders } from '../test/renderWithProviders';
import { storage } from '../lib/storage';

const routes = [
  { index: true, element: <LoginPage /> },
  { path: 'address/:addressOrEns', element: <MatrixPage /> },
  { path: '*', element: <Navigate to="/" replace /> },
];

const ADDR = '0x' + 'a'.repeat(40);

describe('MatrixPage — scan cache', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('hydrates from localStorage without calling fetch when a cache exists', async () => {
    // Pre-seed the cache so the component never needs to scan.
    storage.setScanCache(ADDR, {
      balances: { eth: { eth: 1.5, base: 0.25 }, usdc: { eth: 1200 } },
      prices: { ETH: { price: 3200, change: 1.2 }, USDC: { price: 1, change: 0 } },
    });
    const fetchSpy = vi.fn().mockRejectedValue(new Error('should not hit the network'));
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    renderWithProviders(routes, [`/address/${ADDR}`]);

    // A cached row's USD total shows up in the matrix — use the header
    // address badge as a lighter smoke test.
    expect(await screen.findByText(/0xaaaa…aaaa/)).toBeInTheDocument();
    // The CACHED badge is only shown when we hydrated from cache.
    expect(await screen.findByText('CACHED')).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('refresh button calls fetch to re-scan the chains', async () => {
    storage.setScanCache(ADDR, {
      balances: {},
      prices: {},
    });
    // Any 2xx JSON is fine — the scanner short-circuits on 0x0 balances.
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: '0x0' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    const user = userEvent.setup();
    renderWithProviders(routes, [`/address/${ADDR}`]);

    // Wait for cached-mount to render the Refresh button.
    const btn = await screen.findByRole('button', { name: /Refresh/ });
    await user.click(btn);

    // Once the click fires, the scanner hits RPCs for all 15 chains.
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
    });
  });
});
