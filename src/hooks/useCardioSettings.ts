import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CardioSettings } from '../types/cardio';

const STORAGE_KEY = 'pepmax_cardio_settings';

const DEFAULTS: CardioSettings = {
  audioCuesEnabled: true,
  audioCueFrequency: '1mi',
  audioCueContent: ['distance', 'pace', 'time'],
  distanceUnit: 'mi',
  autoPauseRun: true,
  autoPauseCycle: false,
};

export function useCardioSettings() {
  const [settings, setSettings] = useState<CardioSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          setSettings({ ...DEFAULTS, ...JSON.parse(raw) });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const updateSettings = useCallback(async (patch: Partial<CardioSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { settings, updateSettings, loading };
}
