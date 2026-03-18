/**
 * useSmartInsights — fetches supplementary data lazily and computes Smart Insights.
 * Does not block dashboard load; runs after dashboardData is populated.
 */
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLogsForDateRange } from '../services/nutritionService';
import { getPeptides, getDoses } from '../services/peptideService';
import { computeInsights } from '../services/insightService';
import { toLocalDateKey } from '../utils/nutrition';
import type { DashboardData } from '../types/dashboard';
import type { UserProfile } from '../types/profile';
import type { Insight, DismissedInsights } from '../types/insight';

const STORAGE_KEY = '@pepmax_dismissed_insights';
const DISMISS_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

async function loadDismissed(): Promise<DismissedInsights> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as DismissedInsights;
  } catch {
    return {};
  }
}

async function saveDismissed(record: DismissedInsights): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // non-critical
  }
}

export function useSmartInsights(
  dashboardData: DashboardData | null,
  userProfile: UserProfile | null,
): { insights: Insight[]; loading: boolean; dismiss: (id: string) => void } {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState<DismissedInsights>({});

  // Compute insights whenever dashboardData is populated
  useEffect(() => {
    if (!dashboardData) return;

    const snapshot = dashboardData;
    let cancelled = false;
    setLoading(true);

    async function run() {
      try {
        // Fetch supplementary data in parallel; each wrapped to avoid blocking
        const today = toLocalDateKey();
        const fourteenDaysAgo = toLocalDateKey(new Date(Date.now() - 13 * 24 * 60 * 60 * 1000));
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const [nutritionResult, peptidesResult, dosesResult, dismissedRecord] = await Promise.all([
          getLogsForDateRange(fourteenDaysAgo, today).catch(() => ({ data: [], error: null })),
          getPeptides().catch(() => ({ data: [], error: null })),
          getDoses().catch(() => ({ data: [], error: null })),
          loadDismissed(),
        ]);

        if (cancelled) return;

        const nutritionLogs = nutritionResult.data ?? [];
        const peptides = peptidesResult.data ?? [];
        // Filter doses to last 30 days client-side
        const allDoses = dosesResult.data ?? [];
        const doses = allDoses.filter(
          (d) => d.timestamp.toDate().getTime() >= thirtyDaysAgo.getTime(),
        );

        const proteinTargetG = userProfile?.macros?.proteinG ?? 0;

        const computed = computeInsights({
          nutritionLogs,
          proteinTargetG,
          peptides,
          doses,
          sessions: snapshot.recentSessions ?? [],
          cardioSessions: snapshot.recentCardio ?? [],
          weights: snapshot.recentWeights ?? [],
        });

        // Expire dismissed entries older than 7 days
        const now = Date.now();
        const validDismissed: DismissedInsights = {};
        for (const [id, ts] of Object.entries(dismissedRecord)) {
          if (now - ts < DISMISS_EXPIRY_MS) validDismissed[id] = ts;
        }

        const filtered = computed.filter((ins) => !validDismissed[ins.id]);

        if (!cancelled) {
          setInsights(filtered);
          setDismissed(validDismissed);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => { cancelled = true; };
  }, [dashboardData, userProfile]);

  const dismiss = useCallback((id: string) => {
    setInsights((prev) => prev.filter((ins) => ins.id !== id));
    setDismissed((prev) => {
      const updated = { ...prev, [id]: Date.now() };
      saveDismissed(updated);
      return updated;
    });
  }, []);

  return { insights, loading, dismiss };
}
