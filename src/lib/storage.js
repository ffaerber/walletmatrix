const HIDDEN_KEY = 'wm_hidden_tokens';
const CUSTOM_KEY = 'wm_custom_tokens';

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode, quota, etc. — silently drop */
  }
}

export const storage = {
  getHidden: () => new Set(read(HIDDEN_KEY, [])),
  setHidden: (set) => write(HIDDEN_KEY, [...set]),
  getCustom: () => read(CUSTOM_KEY, []),
  setCustom: (list) => write(CUSTOM_KEY, list),
};
