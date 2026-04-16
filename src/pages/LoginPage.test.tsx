import { describe, it, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import LoginPage from './LoginPage';
import MatrixPage from './MatrixPage';
import { Navigate } from 'react-router';
import { renderWithProviders } from '../test/renderWithProviders';

describe('LoginPage', () => {
  it('renders the connect + demo buttons', () => {
    renderWithProviders([{ index: true, element: <LoginPage /> }]);
    expect(screen.getByRole('button', { name: /Connect MetaMask/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continue with demo wallet/i })).toBeInTheDocument();
  });

  it('navigates to /address/demo when the demo button is clicked', async () => {
    const user = userEvent.setup();
    const { router } = renderWithProviders([
      { index: true, element: <LoginPage /> },
      { path: 'address/:addressOrEns', element: <MatrixPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ]);

    await user.click(screen.getByRole('button', { name: /Continue with demo wallet/i }));

    // After the click we're on /address/demo and the matrix header is mounted.
    expect(router.state.location.pathname).toBe('/address/demo');
    expect(await screen.findByText(/WalletMatrix/i)).toBeInTheDocument();
    expect(screen.getByText(/DEMO/)).toBeInTheDocument();
  });
});
