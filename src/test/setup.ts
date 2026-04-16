import '@testing-library/jest-dom/vitest';
import { afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import { initChains } from '../lib/chains';

// Populate CHAINS before any test runs. In the test environment the
// registry fetch will fail, so chains are built from fallback data.
beforeAll(async () => {
  await initChains();
});

// Flush mounted components between tests so DOM queries stay scoped.
afterEach(() => {
  cleanup();
});
