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
    // Pre-seed the cache with numeric chain ID keys.
    storage.setScanCache(ADDR, {
      balances: { eth: { '1': 1.5, '8453': 0.25 }, usdc: { '1': 1200 } },
      prices: { ETH: { price: 3200, change: 1.2 }, USDC: { price: 1, change: 0 } },
    });
    const fetchSpy = vi.fn().mockRejectedValue(new Error('should not hit the network'));
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    renderWithProviders(routes, [`/address/${ADDR}`]);

    expect(await screen.findByText(/0xaaaa…aaaa/)).toBeInTheDocument();
    expect(await screen.findByText('CACHED')).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('refresh button calls fetch to re-scan the chains', async () => {
    storage.setScanCache(ADDR, {
      balances: {},
      prices: {},
    });
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: '0x0' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    const user = userEvent.setup();
    renderWithProviders(routes, [`/address/${ADDR}`]);

    const btn = await screen.findByRole('button', { name: /Refresh/ });
    await user.click(btn);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
    });
  });

  it('refresh preserves user-visible chains when balances are zero', async () => {
    storage.setScanCache(ADDR, { balances: {}, prices: {} });
    // hiddenChains defaults to empty in storage, so all chains start visible.
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: '0x0' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    ) as unknown as typeof fetch;

    const user = userEvent.setup();
    renderWithProviders(routes, [`/address/${ADDR}`]);

    // Ethereum (chain id 1) is visible after hydrating from cache.
    expect(await screen.findByText('Ethereum Mainnet')).toBeInTheDocument();

    const btn = await screen.findByRole('button', { name: /Refresh/ });
    await user.click(btn);

    // After a refresh with zero balances everywhere, the Ethereum column
    // must still be visible — the old auto-hide pass used to remove it on
    // every refresh.
    await waitFor(() => {
      expect(screen.getByText('Ethereum Mainnet')).toBeInTheDocument();
    });
  });
});
