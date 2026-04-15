import { useState } from 'react';
import { tokenLogoUrl, chainLogoUrl } from '../lib/icons.js';
import { CHAINS_BY_ID } from '../lib/chains.js';

export function TokenIcon({ token, size = 28 }) {
  const [failed, setFailed] = useState(false);
  const url = tokenLogoUrl(token);
  const style = {
    width: size,
    height: size,
    borderRadius: size / 2,
    background: token?.bg || '#253044',
    fontSize: Math.max(12, size * 0.5),
  };
  if (url && !failed) {
    return (
      <span className="token-icon" style={style}>
        <img src={url} alt={token.symbol} onError={() => setFailed(true)} />
      </span>
    );
  }
  return (
    <span className="token-icon fallback" style={style}>
      {token?.icon || token?.symbol?.[0] || '?'}
    </span>
  );
}

export function ChainIcon({ chainId, size = 22 }) {
  const [failed, setFailed] = useState(false);
  const chain = CHAINS_BY_ID[chainId];
  if (!chain) return null;
  const style = {
    width: size,
    height: size,
    borderRadius: size / 2,
    background: chain.color,
    fontSize: Math.max(10, size * 0.55),
  };
  const url = chainLogoUrl(chainId);
  if (url && !failed) {
    return (
      <span className="chain-icon" style={style}>
        <img src={url} alt={chain.name} onError={() => setFailed(true)} />
      </span>
    );
  }
  return (
    <span className="chain-icon fallback" style={style}>
      {chain.icon}
    </span>
  );
}
