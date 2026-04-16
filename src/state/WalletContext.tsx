import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { DEFAULT_TOKENS, DEMO_BALANCES, DEMO_CHANGES } from '../lib/tokens';
import { CHAINS } from '../lib/chains';
import { scanChainsSequential, fetchPrices } from '../lib/scanner';
import { KNOWN_TOKENS } from '../lib/knownTokens';
import { storage } from '../lib/storage';
import { DEMO_ADDRESS_PARAM, isAddress } from '../lib/format';
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

// Opt-in flag: when true, bridge/swap confirmations call Li.Fi + MetaMask
// instead of mutating balances locally. Demo wallets always stay local.
const REAL_TX_ENABLED: boolean =
  String(import.meta.env.VITE_ENABLE_REAL_TX ?? '').toLowerCase() === 'true';

interface WalletState {
  address: string | null;
  demo: boolean;
  scanning: boolean;
  // Chain currently being scanned (sequential scan).
  activeChain: ChainId | null;
  scanProgress: Partial<Record<ChainId, number>>;
  balances: Balances;
  prices: Prices;
  hidden: Set<string>;
  hiddenChains: Set<ChainId>;
  customTokens: Token[];
  // Epoch ms of the most recent scan (or cache hit). `null` before any load.
  lastRefreshedAt: number | null;
  // True when the current data came from localStorage rather than a fresh
  // scan. Lets the UI show a 'cached' indicator + prompt to refresh.
  fromCache: boolean;
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
  realTxEnabled: boolean;
  connectDemo: () => void;
  connectMetaMask: () => Promise<string>;
  // Total number of chains being scanned (for progress display).
  totalChains: number;
  // Reconciles state with the URL. Accepts a concrete 0x address or the
  // literal `demo` sentinel. Idempotent — if the same address is already
  // loaded, does nothing. Will use cached balances if present.
  loadAddress: (addressOrDemo: string) => Promise<void>;
  // Re-scans the current address (native + ERC-20) without resetting UI
  // state. Used after a real bridge/swap completes, or when the user
  // clicks the refresh button to bypass cache.
  refreshBalances: () => Promise<void>;
  disconnect: () => void;
  toggleHide: (tid: string) => void;
  hideZeroBalance: () => void;
  showAll: () => void;
  toggleHideChain: (chainId: ChainId) => void;
  showAllChains: () => void;
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
    activeChain: null,
    scanProgress: {},
    balances: {},
    prices: {},
    hidden: storage.getHidden(),
    hiddenChains: storage.getHiddenChains(),
    customTokens: storage.getCustom(),
    lastRefreshedAt: null,
    fromCache: false,
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
  // Tracks the last key we loaded for (lowercase address or 'demo') so we
  // don't re-scan when MatrixPage re-renders or StrictMode double-invokes
  // our effects.
  const loadedKeyRef = useRef<string | null>(null);

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
    setState((s) => ({ ...s, address, demo: false, scanning: true, activeChain: null, scanProgress: {} }));

    // Scan chains sequentially, ordered by numeric chain ID (Ethereum first).
    const results = await scanChainsSequential(
      address,
      ALCHEMY_KEY,
      KNOWN_TOKENS,
      (chainId) => {
        setState((s) => ({ ...s, activeChain: chainId }));
      },
      (result) => {
        setState((s) => ({
          ...s,
          scanProgress: { ...s.scanProgress, [result.chainId]: result.native },
        }));
      },
    );

    // Merge into the token/balance shape the matrix expects.
    const balances: Balances = {};
    DEFAULT_TOKENS.forEach((t) => {
      balances[t.id] = {};
    });

    // Track which chains have any value (native or ERC-20).
    const chainsWithValue = new Set<ChainId>();

    // Build a lookup: uppercase symbol/alias → token id.
    const symToId: Record<string, string> = {};
    DEFAULT_TOKENS.forEach((t) => {
      symToId[t.symbol.toUpperCase()] = t.id;
      t.aliases?.forEach((a) => { symToId[a.toUpperCase()] = t.id; });
    });

    results.forEach((r) => {
      const chain = CHAINS.find((c) => c.id === r.chainId);
      if (!chain) return;

      // Native balance assignment — look up the token row by native symbol
      // or alias (e.g. XDAI → dai, POL → matic, WETH → eth).
      if (r.native > 0) {
        chainsWithValue.add(r.chainId);
        const id = symToId[chain.native.toUpperCase()] ?? chain.native.toLowerCase();
        balances[id] ??= {};
        balances[id][r.chainId] = r.native;
      }

      // ERC-20 assignments.
      r.erc20.forEach((t) => {
        const id = (t.id ?? t.symbol ?? '').toLowerCase();
        if (!id) return;
        balances[id] ??= {};
        balances[id][r.chainId] = (balances[id][r.chainId] ?? 0) + t.balance;
        if (t.balance > 0) chainsWithValue.add(r.chainId);
      });
    });

    // Prices (CoinGecko, keyless).
    const symbols = Object.keys(balances).map(
      (id) => DEFAULT_TOKENS.find((t) => t.id === id)?.symbol ?? id.toUpperCase(),
    );
    const prices = await fetchPrices(symbols);

    // Persist so repeat visits don't need to re-scan all chains.
    storage.setScanCache(address, { balances, prices });

    // Auto-hide chains that have no tokens of value.
    const autoHidden = new Set<ChainId>();
    CHAINS.forEach((c) => {
      if (!chainsWithValue.has(c.id)) autoHidden.add(c.id);
    });

    setState((s) => ({
      ...s,
      balances,
      prices,
      scanning: false,
      activeChain: null,
      hiddenChains: autoHidden,
      lastRefreshedAt: Date.now(),
      fromCache: false,
    }));
  }, []);

  // Central URL-reconciling entry point. Callers (typically MatrixPage via
  // useParams) pass whatever is in the :address slot. The `loadedKeyRef`
  // guard makes this idempotent so StrictMode double-invokes, re-renders,
  // and identical navigations don't trigger duplicate scans.
  //
  // If a cached snapshot for this address exists in localStorage we
  // hydrate from it synchronously and skip the scan entirely — the user
  // can explicitly refresh via the header button to get fresh data.
  const loadAddress = useCallback(async (addressOrDemo: string): Promise<void> => {
    if (addressOrDemo === DEMO_ADDRESS_PARAM) {
      if (loadedKeyRef.current === 'demo') return;
      loadedKeyRef.current = 'demo';
      connectDemo();
      return;
    }
    if (!isAddress(addressOrDemo)) return;
    const key = addressOrDemo.toLowerCase();
    if (loadedKeyRef.current === key) return;
    loadedKeyRef.current = key;

    const cached = storage.getScanCache(addressOrDemo);
    if (cached) {
      setState((s) => ({
        ...s,
        address: addressOrDemo,
        demo: false,
        scanning: false,
        scanProgress: {},
        balances: cached.balances,
        prices: cached.prices,
        lastRefreshedAt: cached.updatedAt,
        fromCache: true,
      }));
      return;
    }
    await startScan(addressOrDemo);
  }, [connectDemo, startScan]);

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

  // --- Chain visibility ---------------------------------------------------
  const toggleHideChain = useCallback((chainId: ChainId) => {
    setState((s) => {
      const next = new Set(s.hiddenChains);
      if (next.has(chainId)) next.delete(chainId);
      else next.add(chainId);
      storage.setHiddenChains(next);
      return { ...s, hiddenChains: next };
    });
  }, []);

  const showAllChains = useCallback(() => {
    setState((s) => {
      const empty = new Set<ChainId>();
      storage.setHiddenChains(empty);
      return { ...s, hiddenChains: empty };
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

  // Re-run the scanner for the current live (non-demo) address so the
  // matrix reflects on-chain state after a real transfer completes. We
  // drop loadedKeyRef first so startScan actually runs.
  const refreshBalances = useCallback(async (): Promise<void> => {
    const addr = loadedKeyRef.current;
    if (!addr || addr === 'demo') return;
    await startScan(addr);
  }, [startScan]);

  const disconnect = useCallback(() => {
    loadedKeyRef.current = null;
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
      totalChains: CHAINS.length,
      alchemyKey: ALCHEMY_KEY,
      realTxEnabled: REAL_TX_ENABLED,
      connectDemo,
      connectMetaMask,
      loadAddress,
      refreshBalances,
      disconnect,
      toggleHide,
      hideZeroBalance,
      showAll,
      toggleHideChain,
      showAllChains,
      addCustomToken,
      removeCustomToken,
      applyTransfer,
    }),
    [
      state,
      tokens,
      connectDemo,
      connectMetaMask,
      loadAddress,
      refreshBalances,
      disconnect,
      toggleHide,
      hideZeroBalance,
      showAll,
      toggleHideChain,
      showAllChains,
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
