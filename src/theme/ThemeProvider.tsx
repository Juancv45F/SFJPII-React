import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as SystemUI from 'expo-system-ui';
import { updatePreferences } from '../services/auth';
import { storage } from '../services/storage';
import { palettes, ThemeMode, Palette } from './colors';

type ThemeContextValue = {
  colors: Palette;
  mode: ThemeMode;
  isDark: boolean;
  // persist=true guarda la preferencia en el backend (igual que toggleTheme/onThemeChange).
  setMode: (mode: ThemeMode, persist?: boolean) => void;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(storage.get('theme') === 'dark' ? 'dark' : 'light');

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(palettes[mode].background).catch(() => {});
  }, [mode]);

  const setMode = useCallback((next: ThemeMode, persist = false) => {
    setModeState(next);
    storage.set('theme', next);
    if (persist && storage.get('token')) updatePreferences({ theme: next }).catch(() => {});
  }, []);

  const value = useMemo<ThemeContextValue>(() => ({
    colors: palettes[mode],
    mode,
    isDark: mode === 'dark',
    setMode,
    toggle: () => setMode(mode === 'dark' ? 'light' : 'dark', true),
  }), [mode, setMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de ThemeProvider');
  return ctx;
}
