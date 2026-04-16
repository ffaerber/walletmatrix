import { useState, type CSSProperties } from 'react';
import { tokenLogoUrl, chainLogoUrl } from '../lib/icons';
import { CHAINS_BY_ID } from '../lib/chains';
import type { ChainId, Token } from '../lib/types';

interface TokenIconProps {
  token: Token | null | undefined;
  size?: number;
}

export function TokenIcon({ token, size = 28 }: TokenIconProps) {
  const [failed, setFailed] = useState(false);
  const url = tokenLogoUrl(token);
  const style: CSSProperties = {
    width: size,
    height: size,
    borderRadius: size / 2,
    background: token?.bg ?? '#253044',
    fontSize: Math.max(12, size * 0.5),
  };
  if (token && url && !failed) {
    return (
      <span className="inline-flex items-center justify-center text-white font-bold font-sans overflow-hidden shrink-0" style={style}>
        <img className="w-full h-full object-cover" src={url} alt={token.symbol} onError={() => setFailed(true)} />
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center text-white font-bold font-sans overflow-hidden shrink-0" style={style}>
      {token?.icon ?? token?.symbol?.[0] ?? '?'}
    </span>
  );
}

interface ChainIconProps {
  chainId: ChainId;
  size?: number;
}

export function ChainIcon({ chainId, size = 22 }: ChainIconProps) {
  const [failed, setFailed] = useState(false);
  const chain = CHAINS_BY_ID[chainId];
  if (!chain) return null;
  const style: CSSProperties = {
    width: size,
    height: size,
    borderRadius: size / 2,
    background: chain.color,
    fontSize: Math.max(10, size * 0.55),
  };
  const url = chainLogoUrl(chainId);
  if (url && !failed) {
    return (
      <span className="inline-flex items-center justify-center text-white font-bold font-sans overflow-hidden shrink-0" style={style}>
        <img className="w-full h-full object-cover" src={url} alt={chain.name} onError={() => setFailed(true)} />
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center text-white font-bold font-sans overflow-hidden shrink-0" style={style}>
      {chain.icon}
    </span>
  );
}
