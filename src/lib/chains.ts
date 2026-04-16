// Chain registry — the ONLY thing you edit is the chain ID lists below.
// Name, RPC, native currency, etc. are fetched from the ethereum-lists/chains
// registry at startup. Optional overrides handle UI properties (color, logos)
// and Alchemy network names that the registry doesn't provide.

import type { Chain, ChainId } from './types';

// ── Chain IDs to scan ───────────────────────────────────────────────────────
// Add or remove numeric EVM chain IDs here. Everything else is automatic.

export const MAINNET_IDS: number[] = [
  1, 10, 56, 100, 137, 250, 324, 5000, 8453,
  42161, 42220, 43114, 59144, 534352, 7777777,
];

export const TESTNET_IDS: number[] = [
  17000, 84532, 421614, 11155111,
];

// ── Per-chain overrides (UI + Alchemy) ──────────────────────────────────────

interface ChainOverride {
  color?: string;
  short?: string;        // Display abbreviation (auto-derived if omitted)
  alchemyNet?: string;   // Alchemy subdomain for alchemy_getTokensForOwner
  twPath?: string;       // Trust Wallet CDN slug for chain logo
}

const OVERRIDES: Record<number, ChainOverride> = {
  1:        { color: '#627eea', alchemyNet: 'eth-mainnet',     twPath: 'ethereum' },
  10:       { color: '#ff0420', alchemyNet: 'opt-mainnet',     twPath: 'optimism',    short: 'OP' },
  56:       { color: '#f0b90b',                                twPath: 'smartchain',  short: 'BNB' },
  100:      { color: '#48a9a6',                                twPath: 'xdai',        short: 'GNO' },
  137:      { color: '#8247e5', alchemyNet: 'polygon-mainnet', twPath: 'polygon',     short: 'POLY' },
  250:      { color: '#1969ff',                                twPath: 'fantom',      short: 'FTM' },
  324:      { color: '#8c8dfc', alchemyNet: 'zksync-mainnet',  twPath: 'zksync',      short: 'ZKS' },
  5000:     { color: '#008574',                                twPath: 'mantle',      short: 'MNTL' },
  8453:     { color: '#0052ff', alchemyNet: 'base-mainnet',    twPath: 'base' },
  42161:    { color: '#28a0f0', alchemyNet: 'arb-mainnet',     twPath: 'arbitrum',    short: 'ARB' },
  42220:    { color: '#35d07f', alchemyNet: 'celo-mainnet',    twPath: 'celo' },
  43114:    { color: '#e84142', alchemyNet: 'avax-mainnet',    twPath: 'avalanchec',  short: 'AVAX' },
  59144:    { color: '#61dfff', alchemyNet: 'linea-mainnet',   twPath: 'linea' },
  534352:   { color: '#ffeeda', alchemyNet: 'scroll-mainnet',  twPath: 'scroll',      short: 'SCRL' },
  7777777:  { color: '#000000', alchemyNet: 'zora-mainnet',    twPath: 'zora' },
  // Testnets — reuse parent chain logos
  17000:    { color: '#627eea', twPath: 'ethereum', short: 'HOL' },
  84532:    { color: '#0052ff', twPath: 'base',     short: 'BSEP' },
  421614:   { color: '#28a0f0', twPath: 'arbitrum', short: 'ASEP' },
  11155111: { color: '#627eea', twPath: 'ethereum', short: 'SEP' },
};

// ── Fallback RPCs (used when the registry fetch fails) ──────────────────────

const FALLBACK_RPCS: Record<number, string> = {
  1:        'https://cloudflare-eth.com',
  10:       'https://mainnet.optimism.io',
  56:       'https://bsc-dataseed.binance.org',
  100:      'https://rpc.gnosischain.com',
  137:      'https://polygon-rpc.com',
  250:      'https://rpc.ftm.tools',
  324:      'https://mainnet.era.zksync.io',
  5000:     'https://rpc.mantle.xyz',
  8453:     'https://mainnet.base.org',
  42161:    'https://arb1.arbitrum.io/rpc',
  42220:    'https://forno.celo.org',
  43114:    'https://api.avax.network/ext/bc/C/rpc',
  59144:    'https://rpc.linea.build',
  534352:   'https://rpc.scroll.io',
  7777777:  'https://rpc.zora.energy',
  17000:    'https://ethereum-holesky-rpc.publicnode.com',
  84532:    'https://sepolia.base.org',
  421614:   'https://sepolia-rollup.arbitrum.io/rpc',
  11155111: 'https://rpc.sepolia.org',
};

// ── Runtime state — populated by initChains() before first render ───────────

export const CHAINS: Chain[] = [];
export const CHAINS_BY_ID: Record<ChainId, Chain> = {};

// ── Registry fetch ──────────────────────────────────────────────────────────

interface RegistryEntry {
  name: string;
  shortName: string;
  chainId: number;
  rpc: string[];
  nativeCurrency: { name: string; symbol: string; decimals: number };
}

const REGISTRY_BASE =
  'https://raw.githubusercontent.com/ethereum-lists/chains/master/_data/chains';

function pickRpc(rpcs: string[]): string {
  // Filter out templated URLs and WebSockets, pick first public HTTPS.
  return (
    rpcs.find((u) => u.startsWith('https://') && !u.includes('${')) ?? ''
  );
}

async function fetchRegistryEntry(numId: number): Promise<RegistryEntry | null> {
  try {
    const res = await fetch(`${REGISTRY_BASE}/eip155-${numId}.json`);
    if (!res.ok) return null;
    return (await res.json()) as RegistryEntry;
  } catch {
    return null;
  }
}

const twLogo = (slug: string): string =>
  `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${slug}/info/logo.png`;

function buildChain(
  numId: number,
  entry: RegistryEntry | null,
  testnet: boolean,
): Chain {
  const ov = OVERRIDES[numId] ?? {};
  const fallback = FALLBACK_RPCS[numId] ?? '';
  const id = String(numId);

  if (!entry) {
    return {
      id,
      name: `Chain ${numId}`,
      short: ov.short ?? id,
      chainId: '0x' + numId.toString(16),
      color: ov.color ?? '#888',
      icon: id[0],
      rpc: fallback,
      alchemyNet: ov.alchemyNet ?? null,
      twPath: ov.twPath ?? '',
      native: 'ETH',
      logo: ov.twPath ? twLogo(ov.twPath) : '',
      testnet,
    };
  }

  return {
    id,
    name: entry.name,
    short: ov.short ?? entry.shortName.toUpperCase().slice(0, 5),
    chainId: '0x' + entry.chainId.toString(16),
    color: ov.color ?? '#888',
    icon: entry.nativeCurrency.symbol[0],
    rpc: pickRpc(entry.rpc) || fallback,
    alchemyNet: ov.alchemyNet ?? null,
    twPath: ov.twPath ?? '',
    native: entry.nativeCurrency.symbol,
    logo: ov.twPath ? twLogo(ov.twPath) : '',
    testnet,
  };
}

// Call once before rendering the app. Fetches chain metadata from the
// ethereum-lists/chains registry in parallel, falls back to hardcoded
// RPCs when the fetch fails.
export async function initChains(): Promise<void> {
  const allIds = [...MAINNET_IDS, ...TESTNET_IDS];
  const testnetSet = new Set(TESTNET_IDS);

  const entries = await Promise.all(
    allIds.map(async (numId) => ({
      numId,
      entry: await fetchRegistryEntry(numId),
    })),
  );

  const loaded = entries
    .sort((a, b) => a.numId - b.numId)
    .map(({ numId, entry }) => buildChain(numId, entry, testnetSet.has(numId)));

  // Populate mutable exports in place so every importer sees the data.
  CHAINS.length = 0;
  CHAINS.push(...loaded);
  for (const k of Object.keys(CHAINS_BY_ID)) delete CHAINS_BY_ID[k];
  for (const c of loaded) CHAINS_BY_ID[c.id] = c;
}

export function chainByChainId(hex: string): Chain | null {
  return CHAINS.find((c) => c.chainId.toLowerCase() === hex.toLowerCase()) ?? null;
}
