import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Flush mounted components between tests so DOM queries stay scoped.
afterEach(() => {
  cleanup();
});
