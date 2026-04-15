# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install
npm run dev          # Vite dev server at http://localhost:5173
npm run typecheck    # tsc -b --noEmit  (strict TS, no test runner configured)
npm run build        # tsc -b && vite build -> dist/
npm run preview      # serve the built dist/
npm run deploy:swarm # swarm-cli upload ./dist --stamp $SWARM_STAMP
```

There is **no test runner, linter, or formatter** configured. `npm run typecheck` is the only automated check — run it before committing.

Optional env (`.env`): `VITE_ALCHEMY_KEY=<key>`. Without it the scanner still works via keyless public RPCs and a known-contract probe.

## Deployment target shapes the architecture

The app is a static SPA deployed to **Swarm / Bee** (content-addressed storage). Two non-obvious consequences touch almost every file:

1. **HashRouter is mandatory** (`src/router.tsx`). Bee gateways serve `/bzz/<ref>/<path>` literally and do not rewrite 404s to `index.html`, so browser-history routing would break deep links. All routes live in the URL fragment (`#/matrix`). Do not switch to `createBrowserRouter`.
2. **`base: './'` in `vite.config.ts`** produces relative asset paths (`./assets/…`) so the bundle runs under any `/bzz/<hash>/` prefix the uploader gets back. Do not hardcode absolute paths to assets.
3. **No backend.** Every data source (balances, prices, logos) is a public HTTP/JSON-RPC endpoint called directly from the browser. Keep dependencies minimal — bundle size is Swarm upload cost.

When uploading to Bee, both `Swarm-Index-Document` and `Swarm-Error-Document` must be set to `index.html` so HashRouter can recover the route from the fragment (documented in README.md).

## Architecture

### Data flow on wallet connect

`WalletContext.startScan(address)` in `src/state/WalletContext.tsx` orchestrates everything:

1. `scanAllChains` (scanner.ts) — `eth_getBalance` against all 15 chains in parallel via `Promise.allSettled`. One dead RPC never wedges the scan.
2. `fetchErc20Balances` — if `VITE_ALCHEMY_KEY` is set **and** the chain has an `alchemyNet`, call `alchemy_getTokensForOwner`. Otherwise fall back to `eth_call balanceOf` (selector `0x70a08231`) against `KNOWN_TOKENS[chainId]` from `src/lib/knownTokens.ts`.
3. Results are folded into `Balances` shaped as `{ [tokenId]: { [chainId]: amount } }`. Native balances route to `eth` or `matic` token rows when applicable; other natives (BNB, AVAX, FTM, CELO, MNT, xDAI) create ad-hoc token rows keyed by lowercase native symbol.
4. `fetchPrices` — keyless CoinGecko `/simple/price` call, driven by `CG_IDS` in `src/lib/tokens.ts`. Symbols without a CoinGecko mapping are silently skipped.

A demo mode (`connectDemo`) bypasses the scan and hydrates from `DEMO_BALANCES` / `DEMO_CHANGES` in `lib/tokens.ts`.

### State ownership

`WalletContext` is the single source of truth. Components read via `useWallet()`; they never call RPCs directly. Mutations go through the context (`toggleHide`, `applyTransfer`, `addCustomToken`, …) which also persists to `localStorage` via `lib/storage.ts` under keys `wm_hidden_tokens` and `wm_custom_tokens`.

`applyTransfer` is intentionally mock — it adjusts local balances with fixed slippage/fee constants. Wiring a real bridge (Li.Fi SDK) is listed as a production TODO in README.md.

### Adding a chain

Add a row to `SEED` in `src/lib/chains.ts` (including `native`, `rpc`, optional `alchemyNet`, and `twPath` for the Trust Wallet logo CDN), then extend the `ChainId` union in `src/lib/types.ts`. If the chain has well-known ERC-20s you want to probe without Alchemy, add entries under that chain's key in `src/lib/knownTokens.ts`. If the native symbol isn't `ETH` or `MATIC`, the scanner's fallthrough in `WalletContext.startScan` will surface it as an ad-hoc token row automatically.

### Adding a token

Default tokens live in `DEFAULT_TOKENS` in `src/lib/tokens.ts`. A CoinGecko id mapping in `CG_IDS` is required for price lookup. User-added tokens go through `addCustomToken` and are tagged `custom: true`.

### RPC helper

`src/lib/rpc.ts` is a deliberately dependency-free JSON-RPC client with `hexToBigInt` / `formatUnits` / `toNumberSafe`. Do not pull in `ethers` or `viem` for this — it would balloon the bundle. If you need more RPC surface, extend `rpc.ts`.

### UI layer

- `pages/LoginPage.tsx` — MetaMask connect + demo entry.
- `pages/MatrixPage.tsx` — pivot grid (tokens as rows, chains as columns).
- `components/Matrix.tsx` — cell rendering, drag-and-drop. Dropping a cell onto another opens `TransferModal` (bridge if same token, cross-chain swap if different).
- `components/{HistoryModal,TokenManager,ScanOverlay,Toast,Icons}.tsx` — per-feature UI.

Toast + Wallet providers wrap the router outlet in `AppLayout.tsx`.

## Conventions

- **TypeScript strict mode** with `noUnusedLocals`/`noUnusedParameters` on — unused imports/args will fail typecheck.
- Token ids are lowercase (`eth`, `usdc`); chain ids are lowercase short codes from the `ChainId` union; symbols in `Prices` are uppercase.
- RPC / fetch failures must be swallowed at the scan layer (use `Promise.allSettled`, try/catch with `/* fall through */`) so a single bad endpoint doesn't break the whole view.
- `structuredClone` the `balances` object before mutating (see `applyTransfer`) — it's nested and consumers rely on referential change to re-render.
