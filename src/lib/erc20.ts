// Minimal ERC-20 calldata encoding — enough for allowance reads and approve
// calls. Avoids pulling in ethers.js just for two functions.

import { CHAINS_BY_ID } from './chains';
import { jsonRpc } from './rpc';
import type { ChainId } from './types';

// keccak256 4-byte selectors
const SEL_ALLOWANCE = '0xdd62ed3e'; // allowance(address,address)
const SEL_APPROVE   = '0x095ea7b3'; // approve(address,uint256)

function pad32(hex: string): string {
  const stripped = hex.replace(/^0x/, '').toLowerCase();
  if (stripped.length > 64) throw new Error(`hex overflow: ${hex}`);
  return stripped.padStart(64, '0');
}

export function encodeAllowance(owner: string, spender: string): string {
  return SEL_ALLOWANCE + pad32(owner) + pad32(spender);
}

export function encodeApprove(spender: string, amount: bigint): string {
  if (amount < 0n) throw new Error('approve amount must be non-negative');
  return SEL_APPROVE + pad32(spender) + pad32(amount.toString(16));
}

export async function readAllowance(
  chainId: ChainId,
  tokenContract: string,
  owner: string,
  spender: string,
): Promise<bigint> {
  const chain = CHAINS_BY_ID[chainId];
  if (!chain) throw new Error(`Unknown chain ${chainId}`);
  const hex = await jsonRpc<string>(chain.rpc, 'eth_call', [
    { to: tokenContract, data: encodeAllowance(owner, spender) },
    'latest',
  ]);
  return hex && hex !== '0x' ? BigInt(hex) : 0n;
}
