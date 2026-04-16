// Resolves { tokenId, chainId } → (contract address, decimals) for the
// Li.Fi quote request. Native assets use the zero-address sentinel that
// Li.Fi and most aggregators expect.

import { CHAINS_BY_ID } from './chains';
import { KNOWN_TOKENS } from './knownTokens';
import type { ChainId, Token } from './types';

export const NATIVE_ADDRESS = '0x0000000000000000000000000000000000000000';

// A token is native on a chain when its symbol matches the chain's native
// symbol. xDAI on Gnosis is a special case — bridges treat DAI as the
// native token there.
function isNativeOnChain(token: Token, chainId: ChainId): boolean {
  const chain = CHAINS_BY_ID[chainId];
  if (!chain) return false;
  const sym = token.symbol.toUpperCase();
  const nat = chain.native.toUpperCase();
  if (sym === nat) return true;
  // POL/MATIC rebrand — both symbols refer to the same native asset.
  if ((sym === 'MATIC' && nat === 'POL') || (sym === 'POL' && nat === 'MATIC')) return true;
  // DAI is the native asset on Gnosis (xDAI chain).
  if (nat === 'XDAI' && sym === 'DAI') return true;
  return false;
}

export function resolveTokenAddress(token: Token, chainId: ChainId): string | null {
  if (isNativeOnChain(token, chainId)) return NATIVE_ADDRESS;
  if (token.address) return token.address; // custom tokens bring their own
  const known = KNOWN_TOKENS[chainId]?.find((t) => t.id === token.id);
  return known?.contract ?? null;
}

export function resolveTokenDecimals(token: Token, chainId: ChainId): number {
  // All EVM natives are 18 decimals (WBTC excepted — but WBTC is never native).
  if (isNativeOnChain(token, chainId)) return 18;
  const known = KNOWN_TOKENS[chainId]?.find((t) => t.id === token.id);
  return known?.decimals ?? 18;
}

// Li.Fi uses decimal chain IDs, our registry keeps them as hex strings.
export function decimalChainId(chainId: ChainId): number {
  const chain = CHAINS_BY_ID[chainId];
  if (!chain) throw new Error(`Unknown chain ${chainId}`);
  return parseInt(chain.chainId, 16);
}
