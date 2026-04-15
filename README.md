# WalletMatrix

A pivot-table view of your crypto wallet across every EVM chain.
**Tokens as rows. Chains as columns. Drag one cell onto another to bridge or cross-chain swap.**

Built as a Vite + **React Router 7 (HashRouter)** + **TypeScript** single-page app with no backend — designed to be deployed as a static bundle to **Swarm / Bee**.

---

## Why HashRouter?

Swarm / Bee gateways serve content-addressed files under `/bzz/<ref>/<path>`. Unlike most web hosts, they do **not** rewrite unknown paths to `index.html` — a request for `/matrix` on a Bee gateway returns a 404, breaking browser-history routing.

HashRouter keeps the whole route inside the URL fragment (`…/#/matrix`), which the gateway never sees, so deep links and refreshes work from any Bee node or ENS gateway.

```ts
// src/router.tsx
createHashRouter([
  { path: '/',                 element: <LoginPage /> },
  { path: 'matrix/:address',   element: <MatrixPage /> },
]);
```

The matrix route carries the wallet address as a URL parameter, so every view is a shareable permalink:

- `…/#/matrix/0x1234…5678` — scan and display that wallet
- `…/#/matrix/demo`        — seeded demo balances

`MatrixPage` reads `useParams<{ address: string }>()`, validates it with `isAddress(…)`, and calls `WalletContext.loadAddress(…)` — which is idempotent (ref-guarded) so refreshes and React StrictMode double-invokes never trigger duplicate scans.

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
- **Network manager** — hide/show any of the 15 chains from the matrix columns. Hidden chains persist across reloads.
- **Scan cache** — the first visit to `/matrix/0x…` scans all 15 chains; subsequent visits hydrate from `localStorage` instantly. A `↻ Refresh` button in the header re-runs the scan on demand.
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
npm test             # vitest run (42 tests)
npm run test:watch   # vitest (watch mode)
npm run build        # tsc -b && vite build -> dist/
```

## Continuous integration

`.github/workflows/ci.yml` runs on every push to `main` and on pull requests:

1. `npm ci`
2. `npm run typecheck`
3. `npm test -- --reporter=verbose`
4. `npm run build`
5. Verifies `dist/index.html` uses relative asset paths (Swarm/Bee compatibility).
6. Uploads the `dist/` directory as a build artifact.

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
    NetworkManager.tsx         Hide/show chain columns, persisted
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

## Scan cache + network visibility

The first time a wallet lands on `/matrix/0x…`, the scanner queries all 15
chain RPCs (native balances) and Alchemy / known-contract fallbacks (ERC-20
balances) in parallel. The resulting `{ balances, prices, updatedAt }`
snapshot is persisted to `localStorage` under
`wm_scan_<lowercaseAddress>` and hydrated synchronously on later visits —
no network calls. The header shows a `CACHED` badge and the last-refreshed
relative time (e.g. *Updated 2m ago*).

Users trigger fresh scans explicitly via the `↻ Refresh` button in the
header. `VITE_ENABLE_REAL_TX` transfers also auto-refresh after a
successful bridge / swap.

The **Network manager** (🌐 Networks) lets users hide individual chains
from the matrix without affecting the underlying scan data — unhiding a
chain brings the column back instantly. The hidden set is stored in
`wm_hidden_chains`.

Storage format (see `src/lib/storage.ts` and `src/lib/types.ts`):
```ts
interface ScanCache {
  version: number;      // bump to invalidate all cached entries
  updatedAt: number;    // epoch ms
  balances: Balances;   // { [tokenId]: { [chainId]: amount } }
  prices:  Prices;      // { [SYMBOL]: { price, change } }
}
```

## Real bridge / cross-chain swap execution

Setting `VITE_ENABLE_REAL_TX=true` switches the Confirm button in the
transfer modal from the in-memory mock to a full Li.Fi + MetaMask flow:

1. **Quote** — on every amount change the modal debounces a call to
   `GET https://li.quest/v1/quote` to get the best route, executable
   `transactionRequest`, live receive amount, fees, gas costs, and
   estimated duration. Shown inline under the "Live Li.Fi estimate" label.
2. **Chain switch** — `wallet_switchEthereumChain` (with
   `wallet_addEthereumChain` fallback for chains the user hasn't added).
3. **Approve** — for ERC-20 sources: read `allowance(owner, spender)` via
   `eth_call`, and if insufficient, send an `approve(spender, amount)`
   transaction using raw calldata. Waits for the approve to confirm via
   `eth_getTransactionReceipt`.
4. **Execute** — `eth_sendTransaction` with the `transactionRequest` from
   the quote. MetaMask prompts the user to sign.
5. **Poll** — `GET https://li.quest/v1/status?txHash=…&bridge=…` every few
   seconds until `DONE` / `FAILED`, labelling progress from the `substatus`
   field.
6. **Refresh** — on `DONE` the scanner re-runs for the connected address so
   the matrix reflects the new on-chain balances.

The orchestrator (`src/lib/execute.ts`) exposes a typed stage machine
(`TxStage`) so the modal can render a single inline indicator that moves
through `quoting → switching → approving → signing → pending → done`.
Errors surface as a terminal `error` stage with the server message.

Known limitations:
- Approvals are exact-amount. USDT on mainnet requires resetting allowance
  to 0 first; the current flow will fail until we add that pre-approve.
- The demo wallet (`/matrix/demo`) always uses the local mock regardless of
  this flag — the fake address cannot sign.

## Production TODO

- Replace mock `genTxHistory()` in `HistoryModal` with `alchemy_getAssetTransfers` per token × chain.
- Spam filtering for discovered tokens via the Uniswap default list.
- Call `wallet_addEthereumChain` automatically for chains not in the user's MetaMask.
- Daily snapshots in `localStorage` for a portfolio-over-time chart.
- WalletConnect and multi-wallet support.
