/**
 * ThemeContext — user-overridable dark mode preference.
 *
 * Design notes (for Ray):
 * - Preference is stored in AsyncStorage (not Firestore) so it loads before
 *   auth resolves, preventing a theme flash on startup.
 * - ThemeProvider must wrap AuthProvider in _layout.tsx.
 * - useTheme() (existing hook) delegates here — all callsites unchanged.
 * - 'system' defers to useColorScheme(). 'light'/'dark' override it.
 * - setThemePreference is async (persists to AsyncStorage) but the UI update
 *   is synchronous (setState fires immediately), so the theme switches instantly.
 */
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import { LightTheme, DarkTheme, Theme } from '../constants/theme';

const STORAGE_KEY = '@pepmax_theme_preference';

export type ThemePreference = 'light' | 'dark' | 'system';

type ThemeContextValue = {
  theme: Theme;
  themePreference: ThemePreference;
  setThemePreference: (pref: ThemePreference) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [themePreference, setPreference] = useState<ThemePreference>('system');

  // Load persisted preference on mount — before auth resolves
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (value === 'light' || value === 'dark' || value === 'system') {
        setPreference(value);
      }
    });
  }, []);

  const setThemePreference = useCallback(async (pref: ThemePreference): Promise<void> => {
    setPreference(pref); // Synchronous UI update
    await AsyncStorage.setItem(STORAGE_KEY, pref);
  }, []);

  const resolvedDark =
    themePreference === 'dark' ||
    (themePreference === 'system' && systemScheme === 'dark');

  const theme = resolvedDark ? DarkTheme : LightTheme;

  return (
    <ThemeContext.Provider value={{ theme, themePreference, setThemePreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeContext must be used within ThemeProvider');
  return ctx;
}
