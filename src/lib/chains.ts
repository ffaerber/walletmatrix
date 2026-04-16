// Chain registry — EVM chains scanned sequentially by chain ID on wallet connect.
// rpc endpoints are all keyless public gateways; alchemyNet is used when an
// Alchemy key is available to enumerate all ERC-20s the wallet has held.

import type { Chain, ChainId } from './types';

const twLogo = (slug: string): string =>
  `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${slug}/info/logo.png`;

type ChainSeed = Omit<Chain, 'logo'>;

const SEED: ChainSeed[] = [
  // ── Mainnets ──────────────────────────────────────────────────────────────
  { id: 'eth',   name: 'Ethereum',   short: 'ETH',   chainId: '0x1',      color: '#627eea', icon: 'Ξ',  rpc: 'https://cloudflare-eth.com',              alchemyNet: 'eth-mainnet',     twPath: 'ethereum',     native: 'ETH' },
  { id: 'op',    name: 'Optimism',   short: 'OP',    chainId: '0xa',      color: '#ff0420', icon: 'O',  rpc: 'https://mainnet.optimism.io',             alchemyNet: 'opt-mainnet',     twPath: 'optimism',     native: 'ETH' },
  { id: 'bnb',   name: 'BNB Chain',  short: 'BNB',   chainId: '0x38',     color: '#f0b90b', icon: 'B',  rpc: 'https://bsc-dataseed.binance.org',        alchemyNet: null,              twPath: 'smartchain',   native: 'BNB' },
  { id: 'gno',   name: 'Gnosis',     short: 'GNO',   chainId: '0x64',     color: '#48a9a6', icon: 'G',  rpc: 'https://rpc.gnosischain.com',             alchemyNet: null,              twPath: 'xdai',         native: 'xDAI' },
  { id: 'poly',  name: 'Polygon',    short: 'POLY',  chainId: '0x89',     color: '#8247e5', icon: 'P',  rpc: 'https://polygon-rpc.com',                 alchemyNet: 'polygon-mainnet', twPath: 'polygon',      native: 'MATIC' },
  { id: 'ftm',   name: 'Fantom',     short: 'FTM',   chainId: '0xfa',     color: '#1969ff', icon: 'F',  rpc: 'https://rpc.ftm.tools',                   alchemyNet: null,              twPath: 'fantom',       native: 'FTM' },
  { id: 'zks',   name: 'zkSync Era', short: 'ZKS',   chainId: '0x144',    color: '#8c8dfc', icon: 'Z',  rpc: 'https://mainnet.era.zksync.io',           alchemyNet: 'zksync-mainnet',  twPath: 'zksync',       native: 'ETH' },
  { id: 'mntl',  name: 'Mantle',     short: 'MNTL',  chainId: '0x1388',   color: '#008574', icon: 'M',  rpc: 'https://rpc.mantle.xyz',                  alchemyNet: null,              twPath: 'mantle',       native: 'MNT' },
  { id: 'base',  name: 'Base',       short: 'BASE',  chainId: '0x2105',   color: '#0052ff', icon: 'B',  rpc: 'https://mainnet.base.org',                alchemyNet: 'base-mainnet',    twPath: 'base',         native: 'ETH' },
  { id: 'arb',   name: 'Arbitrum',   short: 'ARB',   chainId: '0xa4b1',   color: '#28a0f0', icon: 'A',  rpc: 'https://arb1.arbitrum.io/rpc',            alchemyNet: 'arb-mainnet',     twPath: 'arbitrum',     native: 'ETH' },
  { id: 'celo',  name: 'Celo',       short: 'CELO',  chainId: '0xa4ec',   color: '#35d07f', icon: 'C',  rpc: 'https://forno.celo.org',                  alchemyNet: 'celo-mainnet',    twPath: 'celo',         native: 'CELO' },
  { id: 'avax',  name: 'Avalanche',  short: 'AVAX',  chainId: '0xa86a',   color: '#e84142', icon: 'A',  rpc: 'https://api.avax.network/ext/bc/C/rpc',   alchemyNet: 'avax-mainnet',    twPath: 'avalanchec',   native: 'AVAX' },
  { id: 'linea', name: 'Linea',      short: 'LINEA', chainId: '0xe708',   color: '#61dfff', icon: 'L',  rpc: 'https://rpc.linea.build',                 alchemyNet: 'linea-mainnet',   twPath: 'linea',        native: 'ETH' },
  { id: 'scrl',  name: 'Scroll',     short: 'SCRL',  chainId: '0x82750',  color: '#ffeeda', icon: 'S',  rpc: 'https://rpc.scroll.io',                   alchemyNet: 'scroll-mainnet',  twPath: 'scroll',       native: 'ETH' },
  { id: 'zora',  name: 'Zora',       short: 'ZORA',  chainId: '0x76adf1', color: '#000000', icon: 'Z',  rpc: 'https://rpc.zora.energy',                 alchemyNet: 'zora-mainnet',    twPath: 'zora',         native: 'ETH' },

  // ── Testnets ──────────────────────────────────────────────────────────────
  { id: 'hol',   name: 'Holesky',         short: 'HOL',   chainId: '0x4268',   color: '#627eea', icon: 'H',  rpc: 'https://ethereum-holesky-rpc.publicnode.com', alchemyNet: null, twPath: 'ethereum', native: 'ETH', testnet: true },
  { id: 'bsep',  name: 'Base Sepolia',    short: 'BSEP',  chainId: '0x14a34',  color: '#0052ff', icon: 'B',  rpc: 'https://sepolia.base.org',                    alchemyNet: null, twPath: 'base',     native: 'ETH', testnet: true },
  { id: 'asep',  name: 'Arbitrum Sepolia', short: 'ASEP', chainId: '0x66eee',  color: '#28a0f0', icon: 'A',  rpc: 'https://sepolia-rollup.arbitrum.io/rpc',      alchemyNet: null, twPath: 'arbitrum', native: 'ETH', testnet: true },
  { id: 'sep',   name: 'Sepolia',         short: 'SEP',   chainId: '0xaa36a7', color: '#627eea', icon: 'S',  rpc: 'https://rpc.sepolia.org',                     alchemyNet: null, twPath: 'ethereum', native: 'ETH', testnet: true },
];

// Sort by numeric chain ID so the scanner proceeds from chain 1 upward.
function numericChainId(c: ChainSeed): number {
  return parseInt(c.chainId, 16);
}

const SORTED = [...SEED].sort((a, b) => numericChainId(a) - numericChainId(b));

export const CHAINS: Chain[] = SORTED.map((c) => ({ ...c, logo: twLogo(c.twPath) }));

export const CHAINS_BY_ID: Record<ChainId, Chain> = Object.fromEntries(
  CHAINS.map((c) => [c.id, c]),
) as Record<ChainId, Chain>;

export function chainByChainId(hex: string): Chain | null {
  return CHAINS.find((c) => c.chainId.toLowerCase() === hex.toLowerCase()) ?? null;
}
