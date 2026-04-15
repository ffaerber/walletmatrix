import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Swarm/Bee deployment notes:
// - base: './' produces relative asset paths so the bundle works from any
//   /bzz/<hash>/ reference without the operator knowing the hash in advance.
// - HashRouter (see src/router.jsx) keeps routing inside the URL fragment so
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
});
