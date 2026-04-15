# WalletMatrix

A pivot-table view of your crypto wallet across every EVM chain.
**Tokens as rows. Chains as columns. Drag one cell onto another to bridge or cross-chain swap.**

Built as a Vite + **React Router 7 (HashRouter)** + **TypeScript** single-page app with no backend — designed to be deployed as a static bundle to **Swarm / Bee**.

---

## Why HashRouter?

Swarm / Bee gateways serve content-addressed files under `/bzz/<ref>/<path>`. Unlike most web hosts, they do **not** rewrite unknown paths to `index.html` — a request for `/matrix` on a Bee gateway returns a 404, breaking browser-history routing.

HashRouter keeps the whole route inside the URL fragment (`…/#/matrix`), which the gateway never sees, so deep links and refreshes work from any Bee node or ENS gateway.

```js
// src/router.tsx
createHashRouter([
  { path: '/',       element: <LoginPage /> },
  { path: 'matrix',  element: <MatrixPage /> },
]);
```

The Vite config also sets `base: './'` so every asset reference is relative and the bundle works under any `/bzz/<hash>/` prefix without the upload hash being known in advance.

---

## Features

- **MetaMask connect** (`eth_requestAccounts`) with a demo fallback.
- **Parallel scan of 15 EVM chains** via public RPCs (`Promise.allSettled`).
- **Alchemy `alchemy_getTokensForOwner`** for full ERC-20 discovery when a key is provided; keyless fallback probes known contracts via `eth_call balanceOf`.
- **CoinGecko prices** with 24h change, keyless.
- **Trust Wallet Assets CDN** for token and chain logos, with graceful fallbacks.
- **Drag-and-drop** between cells opens a bridge modal (same token) or a cross-chain swap modal (different token) with live Li.Fi-style estimates.
- **Token manager** (hide/show tokens, hide zero-balance, add custom tokens) persisted in `localStorage`.
- **Holding history modal** per token × chain with SVG chart, range tabs and transaction list.

---

## Stack

| Layer | Choice |
|---|---|
| Build | Vite 6 |
| Language | TypeScript 5 (strict) |
| Framework | React 19 + React Router 7 (HashRouter) |
| Wallet | `window.ethereum` (MetaMask) |
| Balances | Alchemy JSON-RPC, public RPCs |
| Prices | CoinGecko `/simple/price` |
| Logos | Trust Wallet Assets GitHub CDN |
| Storage | `localStorage` |
| Host | Swarm / Bee (static) |

No backend. No keys required for a working demo.

---

## Local development

```bash
npm install
npm run dev          # http://localhost:5173
npm run typecheck    # tsc -b --noEmit
npm run build        # tsc -b && vite build -> dist/
```

Optional `.env`:

```
VITE_ALCHEMY_KEY=<your-alchemy-key>
```

Without a key, the scanner still works — it probes a curated list of well-known ERC-20s per chain. With a key, it enumerates every token the wallet has ever held.

---

## Building for Swarm

```bash
npm run build
```

This produces a `dist/` directory with:
- `index.html` — the SPA entry
- `assets/*.js`, `assets/*.css` — hashed bundles
- `favicon.svg` and any public assets

All asset paths are relative (`./assets/…`) so the bundle is portable across any `/bzz/<ref>/` mount point.

### Uploading to a Bee node

```bash
# Using swarm-cli
npm i -g @ethersphere/swarm-cli
swarm-cli upload ./dist --stamp <postage-batch-id>
```

Or via the Bee HTTP API directly:

```bash
curl -X POST "http://localhost:1633/bzz?name=walletmatrix" \
  -H "Content-Type: application/x-tar" \
  -H "Swarm-Postage-Batch-Id: <batch-id>" \
  -H "Swarm-Index-Document: index.html" \
  -H "Swarm-Error-Document: index.html" \
  --data-binary @<(tar -C dist -c .)
```

Setting **`Swarm-Error-Document: index.html`** plus **HashRouter** is what makes deep links survive. The gateway returns `index.html` for anything unresolved, and HashRouter recovers the actual route from the URL fragment.

Once uploaded, the app is reachable at:

```
https://<bee-gateway>/bzz/<reference>/
```

You can then attach an **ENS content hash** (`bzz://<reference>`) to serve it from a human-readable name like `walletmatrix.eth.limo`.

---

## Project layout

```
src/
  main.tsx                     React entry
  router.tsx                   HashRouter + routes
  AppLayout.tsx                Providers + <Outlet />
  state/WalletContext.tsx      Wallet / scanner / balances store
  pages/
    LoginPage.tsx              MetaMask + demo entry
    MatrixPage.tsx             Main pivot view
  components/
    Matrix.tsx                 Grid + drag-and-drop cells
    ScanOverlay.tsx            Parallel-chain progress indicator
    TransferModal.tsx          Bridge / cross-chain swap flow
    HistoryModal.tsx           Per-cell holding history + SVG chart
    TokenManager.tsx           Hide/show, custom tokens
    Toast.tsx                  Toast stack + provider
    Icons.tsx                  Token + chain icon components
  lib/
    chains.ts                  15-chain registry
    tokens.ts                  Default catalog + CoinGecko id map
    knownTokens.ts             ERC-20 fallback contracts per chain
    scanner.ts                 scanAllChains / fetchErc20Balances / fetchPrices
    icons.ts                   Logo URL helpers
    rpc.ts                     Tiny JSON-RPC + bigint helpers
    storage.ts                 localStorage wrapper
    format.ts                  Number + address formatters
    types.ts                   Shared type definitions
  styles.css
```

---

## Production TODO

- `confirmTransfer()` currently only updates local balances; wire the Li.Fi SDK (`@lifi/sdk`) or call `POST /v1/transactions` with a signed quote.
- Replace mock `genTxHistory()` in `HistoryModal` with `alchemy_getAssetTransfers` per token × chain.
- Spam filtering for discovered tokens via the Uniswap default list.
- Call `wallet_addEthereumChain` automatically for chains not in the user's MetaMask.
- Daily snapshots in `localStorage` for a portfolio-over-time chart.
- WalletConnect and multi-wallet support.
