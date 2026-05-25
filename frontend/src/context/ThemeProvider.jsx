import { useEffect, useMemo, useState } from 'react';
import { ThemeContext } from './themeContext';

const STORAGE_KEY = 'stockThemeMode';
const isThemeOption = (value) => value === 'light' || value === 'dark' || value === 'system';

const getStoredThemeMode = () => {
  if (typeof window === 'undefined') return 'system';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (isThemeOption(stored)) return stored;
  return 'system';
};

const getSystemTheme = () => {
  if (typeof window === 'undefined' || !window.matchMedia) return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export function ThemeProvider({ children }) {
  const [themeMode, setThemeMode] = useState(() => getStoredThemeMode());
  const [systemTheme, setSystemTheme] = useState(() => getSystemTheme());
  const theme = themeMode === 'system' ? systemTheme : themeMode;

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const updateTheme = (event) => {
      setSystemTheme(event.matches ? 'dark' : 'light');
    };
    setSystemTheme(mediaQuery.matches ? 'dark' : 'light');
    mediaQuery.addEventListener('change', updateTheme);
    return () => mediaQuery.removeEventListener('change', updateTheme);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, themeMode);
  }, [theme, themeMode]);

  const value = useMemo(() => ({
    theme,
    themeMode,
    toggleTheme: () => {
      setThemeMode((prev) => {
        if (prev === 'system') return theme === 'dark' ? 'light' : 'dark';
        return prev === 'dark' ? 'light' : 'dark';
      });
    },
    setThemeMode,
    cycleThemeMode: () => {
      setThemeMode((prev) => {
        if (prev === 'system') return 'light';
        if (prev === 'light') return 'dark';
        return 'system';
      });
    },
  }), [theme, themeMode]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
