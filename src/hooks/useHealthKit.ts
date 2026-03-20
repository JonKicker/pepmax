/**
 * useHealthKit — HealthKit permission state, sync triggers, and foreground refresh.
 *
 * - Reads healthKitEnabled from userProfile (Firestore-backed via AuthContext)
 * - enable() requests permissions + writes flag to Firestore
 * - disable() clears flag in Firestore
 * - Foreground AppState listener debounced to 5-minute minimum interval
 */
import { useEffect, useRef, useCallback } from 'react';
import { AppState, Platform } from 'react-native';
import { updateDocument, COLLECTIONS } from '../services/firebase/firestore';
import {
  isAvailable,
  requestPermissions,
  fetchRecoveryData,
  fetchStepCount,
  fetchLatestWeight,
} from '../services/healthKitService';
import { logWeight } from '../services/bodyWeightService';
import { getDocument } from '../services/firebase/firestore';
import { toLocalDateKey } from '../utils/nutrition';
import { useAuth } from '../contexts/AuthContext';
import type { HealthKitRecoveryData } from '../types/healthKit';
import type { BodyWeightEntry } from '../types/bodyTracking';

const DEBOUNCE_MS = 5 * 60 * 1000; // 5 minutes

export function useHealthKit() {
  const { userProfile, updateProfile } = useAuth();
  const isEnabled = !!(userProfile?.healthKitEnabled);
  const lastSyncRef = useRef<number>(0);

  // ─── enable / disable ────────────────────────────────────────────────────

  const enable = useCallback(async (): Promise<void> => {
    if (Platform.OS !== 'ios') return;
    const available = await isAvailable();
    if (!available) return;
    // Only persist enabled flag if the user actually grants permissions
    const granted = await requestPermissions();
    if (!granted) return;
    await updateDocument(COLLECTIONS.PROFILE, 'data', { healthKitEnabled: true });
    updateProfile({ healthKitEnabled: true });
  }, [updateProfile]);

  const disable = useCallback(async (): Promise<void> => {
    await updateDocument(COLLECTIONS.PROFILE, 'data', { healthKitEnabled: false });
    updateProfile({ healthKitEnabled: false });
  }, [updateProfile]);

  // ─── sync helpers ────────────────────────────────────────────────────────

  const syncRecoveryData = useCallback(
    async (date: string): Promise<HealthKitRecoveryData> => {
      if (!isEnabled || Platform.OS !== 'ios') return {};
      return fetchRecoveryData(date);
    },
    [isEnabled],
  );

  const syncSteps = useCallback(
    async (date: string): Promise<number> => {
      if (!isEnabled || Platform.OS !== 'ios') return 0;
      return (await fetchStepCount(date)) ?? 0;
    },
    [isEnabled],
  );

  const syncWeight = useCallback(async (): Promise<void> => {
    if (!isEnabled || Platform.OS !== 'ios') return;
    try {
      const hkWeight = await fetchLatestWeight();
      if (!hkWeight) return;

      const dateKey = toLocalDateKey(hkWeight.date);
      // Check if we already have a Firestore entry for that day
      const existing = await getDocument<BodyWeightEntry>(COLLECTIONS.BODY_WEIGHT, dateKey);
      if (existing.data) return; // already logged for that day

      await logWeight({
        weight: hkWeight.kg,
        displayUnit: 'metric',
        date: dateKey,
        note: 'healthkit',
      });
    } catch {
      // fire-and-forget: never surface to user
    }
  }, [isEnabled]);

  // ─── foreground AppState sync ─────────────────────────────────────────────

  useEffect(() => {
    if (!isEnabled || Platform.OS !== 'ios') return;

    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      const now = Date.now();
      if (now - lastSyncRef.current < DEBOUNCE_MS) return;
      lastSyncRef.current = now;
      syncWeight();
    });

    return () => subscription.remove();
  }, [isEnabled, syncWeight]);

  return {
    isAvailable: Platform.OS === 'ios',
    isEnabled,
    enable,
    disable,
    syncRecoveryData,
    syncSteps,
  };
}
