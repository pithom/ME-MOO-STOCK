const STORAGE_KEY = 'stockUser';

const getSessionStorage = () => {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage;
};

const clearLegacyStorage = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
};

export const getStoredAuthUser = () => {
  const storage = getSessionStorage();
  clearLegacyStorage();

  if (!storage) return null;

  try {
    const stored = storage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    storage.removeItem(STORAGE_KEY);
    return null;
  }
};

export const setStoredAuthUser = (user) => {
  const storage = getSessionStorage();
  clearLegacyStorage();

  if (!storage) return;
  storage.setItem(STORAGE_KEY, JSON.stringify(user));
};

export const clearStoredAuthUser = () => {
  const storage = getSessionStorage();
  clearLegacyStorage();

  if (!storage) return;
  storage.removeItem(STORAGE_KEY);
};
