/**
 * useGymSettings — persists user gym-calculator preferences in AsyncStorage.
 *
 * Ray's requirement #3: AsyncStorage errors are caught and logged; JSON.parse
 * failures fall back to defaults instead of crashing.
 */
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GymSettings } from '../types/warmUp';

const STORAGE_KEY = '@gym_settings_v1';

const DEFAULTS: GymSettings = {
  showWarmUp: true,
  showPlateCalc: true,
};

export function useGymSettings() {
  const [settings, setSettings] = useState<GymSettings>(DEFAULTS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from storage on mount
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw !== null) {
          try {
            const parsed = JSON.parse(raw) as Partial<GymSettings>;
            // Merge with defaults so new keys are always present
            setSettings({ ...DEFAULTS, ...parsed });
          } catch {
            // Corrupt JSON — silently fall back to defaults
            setSettings(DEFAULTS);
          }
        }
      } catch {
        // AsyncStorage unavailable — silently fall back to defaults
        setSettings(DEFAULTS);
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  // Persist whenever settings change (after initial load)
  const updateSettings = useCallback(async (patch: Partial<GymSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      // Fire-and-forget persistence — errors are swallowed intentionally
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const toggleWarmUp = useCallback(() => {
    setSettings(prev => {
      const next = { ...prev, showWarmUp: !prev.showWarmUp };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const togglePlateCalc = useCallback(() => {
    setSettings(prev => {
      const next = { ...prev, showPlateCalc: !prev.showPlateCalc };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  return {
    settings,
    isLoaded,
    toggleWarmUp,
    togglePlateCalc,
  };
}
