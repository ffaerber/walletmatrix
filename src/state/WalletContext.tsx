import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { DEFAULT_TOKENS, DEMO_BALANCES, DEMO_CHANGES } from '../lib/tokens';
import { CHAINS } from '../lib/chains';
import { scanAllChains, fetchErc20Balances } from '../lib/scanner';
import { fetchPrices } from '../lib/scanner';
import { KNOWN_TOKENS } from '../lib/knownTokens';
import { storage } from '../lib/storage';
import type {
  Balances,
  ChainId,
  CustomTokenDraft,
  Prices,
  Token,
} from '../lib/types';

// Alchemy key is optional — when absent we use known-contract probing.
// Swarm bundles are static so this is read from Vite's build-time env.
const ALCHEMY_KEY: string = import.meta.env.VITE_ALCHEMY_KEY ?? '';

interface WalletState {
  address: string | null;
  demo: boolean;
  scanning: boolean;
  scanProgress: Partial<Record<ChainId, number>>;
  balances: Balances;
  prices: Prices;
  hidden: Set<string>;
  customTokens: Token[];
}

interface TransferArgs {
  fromTid: string;
  fromNid: ChainId;
  toTid: string;
  toNid: ChainId;
  amount: number;
}

interface WalletContextValue extends WalletState {
  tokens: Token[];
  alchemyKey: string;
  connectDemo: () => void;
  connectMetaMask: () => Promise<string>;
  disconnect: () => void;
  toggleHide: (tid: string) => void;
  hideZeroBalance: () => void;
  showAll: () => void;
  addCustomToken: (draft: CustomTokenDraft) => void;
  removeCustomToken: (tid: string) => void;
  applyTransfer: (args: TransferArgs) => void;
}

const WalletCtx = createContext<WalletContextValue | null>(null);

function makeInitial(): WalletState {
  return {
    address: null,
    demo: false,
    scanning: false,
    scanProgress: {},
    balances: {},
    prices: {},
    hidden: storage.getHidden(),
    customTokens: storage.getCustom(),
  };
}

function tokenSymbol(
  tokens: Token[],
  customTokens: Token[],
  tid: string,
): string {
  const hit = tokens.find((t) => t.id === tid) ?? customTokens.find((t) => t.id === tid);
  return hit?.symbol ?? tid.toUpperCase();
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>(makeInitial);

  // Merge custom tokens into the visible catalog.
  const tokens = useMemo<Token[]>(
    () => [
      ...DEFAULT_TOKENS,
      ...state.customTokens.map((c) => ({ ...c, custom: true })),
    ],
    [state.customTokens],
  );

  const connectDemo = useCallback(() => {
    const prices: Prices = {};
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

  const startScan = useCallback(async (address: string) => {
    setState((s) => ({ ...s, address, demo: false, scanning: true, scanProgress: {} }));

    // 1. Native balances on every chain, in parallel.
    const native = await scanAllChains(address, (chainId, amount) => {
      setState((s) => ({ ...s, scanProgress: { ...s.scanProgress, [chainId]: amount } }));
    });

    // 2. ERC-20 discovery (Alchemy if keyed, else known-contract probe).
    const erc = await fetchErc20Balances(address, ALCHEMY_KEY, KNOWN_TOKENS);

    // 3. Merge into the token/balance shape the matrix expects.
    const balances: Balances = {};
    DEFAULT_TOKENS.forEach((t) => {
      balances[t.id] = {};
    });

    // Native assignments by chain.
    CHAINS.forEach((c) => {
      const amt = native[c.id] ?? 0;
      if (amt <= 0) return;
      if (c.native === 'ETH') balances.eth[c.id] = amt;
      else if (c.native === 'MATIC') balances.matic[c.id] = amt;
      else {
        // Non-ETH/MATIC natives (BNB, AVAX, FTM, CELO, MNT, xDAI) surface as
        // ad-hoc tokens keyed off the chain's native symbol.
        const id = c.native.toLowerCase();
        balances[id] ??= {};
        balances[id][c.id] = amt;
      }
    });

    // ERC-20 assignments.
    (Object.entries(erc) as [ChainId, typeof erc[ChainId]][]).forEach(([chainId, list]) => {
      (list ?? []).forEach((t) => {
        const id = (t.id ?? t.symbol ?? '').toLowerCase();
        if (!id) return;
        balances[id] ??= {};
        balances[id][chainId] = (balances[id][chainId] ?? 0) + t.balance;
      });
    });

    // 4. Prices (CoinGecko, keyless).
    const symbols = Object.keys(balances).map(
      (id) => DEFAULT_TOKENS.find((t) => t.id === id)?.symbol ?? id.toUpperCase(),
    );
    const prices = await fetchPrices(symbols);

    setState((s) => ({ ...s, balances, prices, scanning: false }));
  }, []);

  const connectMetaMask = useCallback(async (): Promise<string> => {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('MetaMask not detected');
    }
    const accounts = (await window.ethereum.request({
      method: 'eth_requestAccounts',
    })) as string[];
    const address = accounts?.[0];
    if (!address) throw new Error('No account returned');
    await startScan(address);
    return address;
  }, [startScan]);

  // React to MetaMask account/chain changes.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return;
    const onAccounts = (...args: unknown[]) => {
      const accts = args[0] as string[] | undefined;
      if (!accts || !accts.length) setState((s) => ({ ...s, address: null }));
      else startScan(accts[0]);
    };
    window.ethereum.on?.('accountsChanged', onAccounts);
    return () => window.ethereum?.removeListener?.('accountsChanged', onAccounts);
  }, [startScan]);

  // --- Mutations used by the UI -------------------------------------------
  const toggleHide = useCallback((tid: string) => {
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
        const row = s.balances[t.id] ?? {};
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
      return { ...s, hidden: new Set<string>() };
    });
  }, []);

  const addCustomToken = useCallback((draft: CustomTokenDraft) => {
    setState((s) => {
      const id = draft.symbol.toLowerCase();
      const token: Token = {
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
      const balances: Balances = { ...s.balances, [id]: s.balances[id] ?? {} };
      const prices: Prices = { ...s.prices, [token.symbol]: { price: token.price, change: 0 } };
      return { ...s, customTokens: list, balances, prices };
    });
  }, []);

  const removeCustomToken = useCallback((tid: string) => {
    setState((s) => {
      const list = s.customTokens.filter((c) => c.id !== tid);
      storage.setCustom(list);
      const rest: Balances = { ...s.balances };
      delete rest[tid];
      return { ...s, customTokens: list, balances: rest };
    });
  }, []);

  const applyTransfer = useCallback(({ fromTid, fromNid, toTid, toNid, amount }: TransferArgs) => {
    setState((s) => {
      const balances = structuredClone(s.balances);
      balances[fromTid] ??= {};
      balances[toTid] ??= {};
      const fromAmt = balances[fromTid][fromNid] ?? 0;
      const usedAmount = Math.min(amount, fromAmt);
      balances[fromTid][fromNid] = +(fromAmt - usedAmount).toFixed(8);

      const fromSym = tokenSymbol(tokens, s.customTokens, fromTid);
      const toSym = tokenSymbol(tokens, s.customTokens, toTid);
      const fromPrice = s.prices[fromSym]?.price ?? 0;
      const toPrice = s.prices[toSym]?.price ?? 1;
      const sameToken = fromTid === toTid;
      const slip = sameToken ? 0.001 : 0.004;
      const fee = sameToken ? 0.003 : 0.006;
      const received = (usedAmount * fromPrice * (1 - slip - fee)) / toPrice;

      balances[toTid][toNid] = +((balances[toTid][toNid] ?? 0) + received).toFixed(8);
      return { ...s, balances };
    });
  }, [tokens]);

  const disconnect = useCallback(() => {
    setState((s) => ({
      ...s,
      address: null,
      demo: false,
      balances: {},
      scanProgress: {},
    }));
  }, []);

  const value = useMemo<WalletContextValue>(
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

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletCtx);
  if (!ctx) throw new Error('useWallet must be used inside WalletProvider');
  return ctx;
}
