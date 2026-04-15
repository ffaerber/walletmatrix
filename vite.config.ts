// Use `vitest/config`'s `defineConfig` (a superset of Vite's) so the `test`
// option is type-checked alongside the regular Vite config.
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Swarm/Bee deployment notes:
// - base: './' produces relative asset paths so the bundle works from any
//   /bzz/<hash>/ reference without the operator knowing the hash in advance.
// - HashRouter (see src/router.tsx) keeps routing inside the URL fragment so
//   deep links survive Bee gateways that don't rewrite 404s to index.html.
// - assetsInlineLimit kept small so Bee caches each asset separately.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 4096,
    sourcemap: false,
    rollupOptions: {
      output: {
        // Hashed filenames under assets/ — Bee content-addresses each chunk.
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
  server: {
    port: 5173,
  },
  // Vitest config lives in the Vite config so everything shares the same
  // transform pipeline (React JSX, TS, etc.).
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    restoreMocks: true,
    clearMocks: true,
  },
});
