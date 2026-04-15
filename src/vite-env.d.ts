/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ALCHEMY_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// MetaMask provider on window.
interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
}

interface Window {
  ethereum?: EthereumProvider;
}
