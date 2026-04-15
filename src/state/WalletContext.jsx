import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_TOKENS, DEMO_BALANCES, DEMO_CHANGES } from '../lib/tokens.js';
import { CHAINS } from '../lib/chains.js';
import { scanAllChains, fetchErc20Balances, fetchPrices } from '../lib/scanner.js';
import { KNOWN_TOKENS } from '../lib/knownTokens.js';
import { storage } from '../lib/storage.js';

const WalletCtx = createContext(null);

// Alchemy key is optional — when absent we use known-contract probing.
// Swarm bundles are static so this is read from Vite's build-time env.
const ALCHEMY_KEY = import.meta.env.VITE_ALCHEMY_KEY || '';

const initialState = {
  address: null,
  demo: false,
  scanning: false,
  scanProgress: {}, // { chainId: nativeAmount }
  tokens: DEFAULT_TOKENS,
  balances: {}, // { tokenId: { chainId: amount } }
  prices: {},   // { SYMBOL: { price, change } }
  hidden: new Set(),
  customTokens: [],
};

export function WalletProvider({ children }) {
  const [state, setState] = useState(() => ({
    ...initialState,
    hidden: storage.getHidden(),
    customTokens: storage.getCustom(),
  }));

  // Merge custom tokens into the visible catalog.
  const tokens = useMemo(() => {
    return [...DEFAULT_TOKENS, ...state.customTokens.map((c) => ({ ...c, custom: true }))];
  }, [state.customTokens]);

  const connectDemo = useCallback(() => {
    const prices = {};
    DEFAULT_TOKENS.forEach((t) => {
      prices[t.symbol] = { price: t.price, change: DEMO_CHANGES[t.symbol] ?? 0 };
    });
    setState((s) => ({
      ...s,
      address: '0xDEMO000000000000000000000000000000000000',
      demo: true,
      balances: structuredClone(DEMO_BALANCES),
      prices,
      scanning: false,
    }));
  }, []);

  const startScan = useCallback(async (address) => {
    setState((s) => ({ ...s, address, demo: false, scanning: true, scanProgress: {} }));

    // 1. Native balances on every chain, in parallel.
    const native = await scanAllChains(address, (chainId, amount) => {
      setState((s) => ({ ...s, scanProgress: { ...s.scanProgress, [chainId]: amount } }));
    });

    // 2. ERC-20 discovery (Alchemy if keyed, else known-contract probe).
    const erc = await fetchErc20Balances(address, ALCHEMY_KEY, KNOWN_TOKENS);

    // 3. Merge into the token/balance shape the matrix expects.
    const balances = {};
    DEFAULT_TOKENS.forEach((t) => {
      balances[t.id] = {};
    });

    // Native assignments by chain.
    CHAINS.forEach((c) => {
      const amt = native[c.id] || 0;
      if (amt <= 0) return;
      if (c.native === 'ETH') balances.eth[c.id] = amt;
      else if (c.native === 'MATIC') balances.matic[c.id] = amt;
      else {
        // Non-ETH/MATIC natives (BNB, AVAX, FTM, CELO, MNT, xDAI) surface as
        // ad-hoc tokens keyed off the chain's native symbol.
        const id = c.native.toLowerCase();
        if (!balances[id]) balances[id] = {};
        balances[id][c.id] = amt;
      }
    });

    // ERC-20 assignments.
    Object.entries(erc).forEach(([chainId, list]) => {
      list.forEach((t) => {
        const id = (t.id || t.symbol || '').toLowerCase();
        if (!id) return;
        if (!balances[id]) balances[id] = {};
        balances[id][chainId] = (balances[id][chainId] || 0) + t.balance;
      });
    });

    // 4. Prices (CoinGecko, keyless).
    const symbols = Object.keys(balances)
      .map((id) => (DEFAULT_TOKENS.find((t) => t.id === id)?.symbol) || id.toUpperCase());
    const prices = await fetchPrices(symbols);

    setState((s) => ({ ...s, balances, prices, scanning: false }));
  }, []);

  const connectMetaMask = useCallback(async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('MetaMask not detected');
    }
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    const address = accounts?.[0];
    if (!address) throw new Error('No account returned');
    await startScan(address);
    return address;
  }, [startScan]);

  // React to MetaMask account/chain changes.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return;
    const onAccounts = (accts) => {
      if (!accts || !accts.length) setState((s) => ({ ...s, address: null }));
      else startScan(accts[0]);
    };
    window.ethereum.on?.('accountsChanged', onAccounts);
    return () => window.ethereum.removeListener?.('accountsChanged', onAccounts);
  }, [startScan]);

  // --- Mutations used by the UI -------------------------------------------
  const toggleHide = useCallback((tid) => {
    setState((s) => {
      const next = new Set(s.hidden);
      if (next.has(tid)) next.delete(tid);
      else next.add(tid);
      storage.setHidden(next);
      return { ...s, hidden: next };
    });
  }, []);

  const hideZeroBalance = useCallback(() => {
    setState((s) => {
      const next = new Set(s.hidden);
      tokens.forEach((t) => {
        const row = s.balances[t.id] || {};
        const total = Object.values(row).reduce((a, b) => a + b, 0);
        if (!total) next.add(t.id);
      });
      storage.setHidden(next);
      return { ...s, hidden: next };
    });
  }, [tokens]);

  const showAll = useCallback(() => {
    setState((s) => {
      storage.setHidden(new Set());
      return { ...s, hidden: new Set() };
    });
  }, []);

  const addCustomToken = useCallback((draft) => {
    setState((s) => {
      const id = draft.symbol.toLowerCase();
      const token = {
        id,
        symbol: draft.symbol.toUpperCase(),
        name: draft.name,
        icon: draft.icon || draft.symbol[0]?.toUpperCase() || '?',
        bg: '#253044',
        price: Number(draft.price) || 0,
        address: draft.address || null,
        custom: true,
      };
      const list = [...s.customTokens.filter((c) => c.id !== id), token];
      storage.setCustom(list);
      const balances = { ...s.balances, [id]: s.balances[id] || {} };
      const prices = { ...s.prices, [token.symbol]: { price: token.price, change: 0 } };
      return { ...s, customTokens: list, balances, prices };
    });
  }, []);

  const removeCustomToken = useCallback((tid) => {
    setState((s) => {
      const list = s.customTokens.filter((c) => c.id !== tid);
      storage.setCustom(list);
      const { [tid]: _dropped, ...rest } = s.balances;
      return { ...s, customTokens: list, balances: rest };
    });
  }, []);

  const applyTransfer = useCallback(({ fromTid, fromNid, toTid, toNid, amount }) => {
    setState((s) => {
      const balances = structuredClone(s.balances);
      balances[fromTid] ??= {};
      balances[toTid] ??= {};
      const fromAmt = balances[fromTid][fromNid] || 0;
      const usedAmount = Math.min(amount, fromAmt);
      balances[fromTid][fromNid] = +(fromAmt - usedAmount).toFixed(8);

      const fromPrice = s.prices[tokenSymbol(s.tokens, s.customTokens, fromTid)]?.price || 0;
      const toPrice = s.prices[tokenSymbol(s.tokens, s.customTokens, toTid)]?.price || 1;
      const sameToken = fromTid === toTid;
      const slip = sameToken ? 0.001 : 0.004;
      const fee = sameToken ? 0.003 : 0.006;
      const received = (usedAmount * fromPrice * (1 - slip - fee)) / toPrice;

      balances[toTid][toNid] = +((balances[toTid][toNid] || 0) + received).toFixed(8);
      return { ...s, balances };
    });
  }, []);

  const disconnect = useCallback(() => {
    setState((s) => ({ ...s, address: null, demo: false, balances: {}, scanProgress: {} }));
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      tokens,
      alchemyKey: ALCHEMY_KEY,
      connectDemo,
      connectMetaMask,
      disconnect,
      toggleHide,
      hideZeroBalance,
      showAll,
      addCustomToken,
      removeCustomToken,
      applyTransfer,
    }),
    [
      state,
      tokens,
      connectDemo,
      connectMetaMask,
      disconnect,
      toggleHide,
      hideZeroBalance,
      showAll,
      addCustomToken,
      removeCustomToken,
      applyTransfer,
    ],
  );

  return <WalletCtx.Provider value={value}>{children}</WalletCtx.Provider>;
}

function tokenSymbol(tokens, customTokens, tid) {
  const hit = tokens.find((t) => t.id === tid) || customTokens.find((t) => t.id === tid);
  return hit?.symbol || tid.toUpperCase();
}

export function useWallet() {
  const ctx = useContext(WalletCtx);
  if (!ctx) throw new Error('useWallet must be used inside WalletProvider');
  return ctx;
}
