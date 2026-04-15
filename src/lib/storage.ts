import type { Token } from './types';

const HIDDEN_KEY = 'wm_hidden_tokens';
const CUSTOM_KEY = 'wm_custom_tokens';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode, quota, etc. — silently drop */
  }
}

export const storage = {
  getHidden: (): Set<string> => new Set(read<string[]>(HIDDEN_KEY, [])),
  setHidden: (set: Set<string>): void => write(HIDDEN_KEY, [...set]),
  getCustom: (): Token[] => read<Token[]>(CUSTOM_KEY, []),
  setCustom: (list: Token[]): void => write(CUSTOM_KEY, list),
};
