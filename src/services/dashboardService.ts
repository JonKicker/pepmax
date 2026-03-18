/**
 * Dashboard service — orchestrates data fetching with 5-minute caching.
 */
import { getTodaysDoses } from './peptideService';
import { getDailyTotals } from './nutritionService';
import { getRecentSessions } from './workoutSessionService';
import { getRecentSessions as getRecentCardio } from './cardioService';
import { getWeightHistory } from './bodyWeightService';
import { computeStreak } from './streakService';
import { getDocument, mergeDocument, COLLECTIONS } from './firebase/firestore';
import { auth } from './firebase/index';
import { toLocalDateKey } from '../utils/nutrition';
import type { DashboardData, DashboardPreferences } from '../types/dashboard';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Keyed by UID so cached data from user A is never served to user B.
const cache = new Map<string, { data: DashboardData; ts: number }>();

export function invalidateCache(): void {
  const uid = auth.currentUser?.uid;
  if (uid) cache.delete(uid);
}

export function getCacheAge(): number {
  const uid = auth.currentUser?.uid;
  if (!uid) return Infinity;
  const entry = cache.get(uid);
  return entry ? Date.now() - entry.ts : Infinity;
}

export async function fetchDashboardData(opts?: {
  forceRefresh?: boolean;
}): Promise<DashboardData> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('fetchDashboardData called without authenticated user');

  const entry = cache.get(uid);
  if (!opts?.forceRefresh && entry && Date.now() - entry.ts < CACHE_TTL) {
    return entry.data;
  }

  // 90-day window for weight history — avoids unbounded fetch.
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const weightStartDate = ninetyDaysAgo.toISOString().slice(0, 10);

  const [dosesResult, nutritionResult, sessionsResult, cardioResult, weightsResult, prefsResult] =
    await Promise.all([
      getTodaysDoses(),
      getDailyTotals(toLocalDateKey()),
      // 100 sessions covers ~20 weeks of 5x/week training — sufficient for streak computation.
      getRecentSessions(100),
      // 50 cardio sessions covers ~10 weeks of daily cardio — sufficient for streak computation.
      getRecentCardio(50),
      getWeightHistory(weightStartDate),
      getDashboardPreferences(),
    ]);

  const data: DashboardData = {
    doses: dosesResult.error ? null : (dosesResult.data ?? null),
    totals: nutritionResult.error ? null : (nutritionResult.data ?? null),
    recentSessions: sessionsResult.error ? null : (sessionsResult.data ?? null),
    recentCardio: cardioResult.error ? null : (cardioResult.data ?? null),
    recentWeights: weightsResult.error ? null : (weightsResult.data ?? null),
    preferences: prefsResult,
    streak: null,
  };

  data.streak = computeStreak(data);

  // Only cache if user is still authenticated (guard against sign-out mid-fetch)
  if (auth.currentUser?.uid === uid) {
    cache.set(uid, { data, ts: Date.now() });
  }
  return data;
}

export async function getDashboardPreferences(): Promise<DashboardPreferences | null> {
  const result = await getDocument<DashboardPreferences>(
    COLLECTIONS.DASHBOARD_PREFERENCES,
    'data',
  );
  if (result.error) return null;
  return result.data ?? null;
}

export async function saveDashboardPreferences(
  prefs: Partial<DashboardPreferences>,
): Promise<void> {
  // Partial<> is compatible with merge semantics; cast avoids WithFieldValue<T> mismatch
  await mergeDocument(COLLECTIONS.DASHBOARD_PREFERENCES, 'data', prefs as DashboardPreferences);
}
