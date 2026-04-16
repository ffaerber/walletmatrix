// On-chain ENS name resolution via the public ENS registry.
// Uses keccak-256 for the namehash algorithm — the only reason
// @noble/hashes is in the bundle.

import { keccak_256 } from '@noble/hashes/sha3.js';
import { jsonRpc } from './rpc';

const ENS_REGISTRY = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e';
// Mainnet RPC used for ENS lookups (same one chains.ts uses for Ethereum).
const ETH_RPC = 'https://cloudflare-eth.com';

function toHex(bytes: Uint8Array): string {
  return '0x' + Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// EIP-137 namehash: recursively hash each label with keccak-256.
function namehash(name: string): string {
  let node = new Uint8Array(32); // 32 zero bytes
  if (!name) return toHex(node);

  const labels = name.split('.');
  for (let i = labels.length - 1; i >= 0; i--) {
    const label = new TextEncoder().encode(labels[i]);
    const labelHash = keccak_256(label);
    const combined = new Uint8Array(64);
    combined.set(node, 0);
    combined.set(labelHash, 32);
    node = keccak_256(combined);
  }
  return toHex(node);
}

// Resolve an ENS name to an 0x address. Returns null when the name
// has no resolver or the resolver returns the zero address.
// If the input has no dot, `.eth` is appended automatically.
export async function resolveEns(name: string): Promise<string | null> {
  const fullName = name.includes('.') ? name : `${name}.eth`;
  const node = namehash(fullName);

  // 1. resolver(bytes32 node) — selector 0x0178b8bf
  const resolverData = '0x0178b8bf' + node.slice(2);
  const resolverResult = await jsonRpc<string>(ETH_RPC, 'eth_call', [
    { to: ENS_REGISTRY, data: resolverData },
    'latest',
  ]);
  const resolverAddr = '0x' + resolverResult.slice(26);
  if (resolverAddr === '0x' + '0'.repeat(40)) return null;

  // 2. addr(bytes32 node) — selector 0x3b3b57de
  const addrData = '0x3b3b57de' + node.slice(2);
  const addrResult = await jsonRpc<string>(ETH_RPC, 'eth_call', [
    { to: resolverAddr, data: addrData },
    'latest',
  ]);
  const address = '0x' + addrResult.slice(26);
  if (address === '0x' + '0'.repeat(40)) return null;

  return address;
}
