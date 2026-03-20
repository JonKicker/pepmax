/**
 * Dashboard service — orchestrates data fetching with 5-minute caching.
 */
import { getTodaysDoses, getDoses } from './peptideService';
import { getDailyTotals, getLogsForDateRange } from './nutritionService';
import { getRecentSessions } from './workoutSessionService';
import { getRecentSessions as getRecentCardio } from './cardioService';
import { getWeightHistory } from './bodyWeightService';
import { computeStreak } from './streakService';
import {
  computeConsistency,
  getConsistencyDocs,
  persistConsistencyDay,
} from './consistencyService';
import { getRecovery } from './recoveryService';
import { getDocument, mergeDocument, COLLECTIONS } from './firebase/firestore';
import { auth } from './firebase/index';
import { toLocalDateKey } from '../utils/nutrition';
import type { DashboardData, DashboardPreferences } from '../types/dashboard';
import type { UserProfile } from '../types/profile';

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
  userProfile?: UserProfile | null;
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

  // 30-day window for consistency computation.
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoKey = toLocalDateKey(thirtyDaysAgo);
  const todayKey = toLocalDateKey();

  const [
    dosesResult,
    nutritionResult,
    sessionsResult,
    cardioResult,
    weightsResult,
    prefsResult,
    allDosesResult,
    nutritionLogsResult,
    savedConsistencyResult,
    recoveryResult,
  ] = await Promise.all([
    getTodaysDoses(),
    getDailyTotals(todayKey),
    // 100 sessions covers ~20 weeks of 5x/week training.
    getRecentSessions(100),
    // 50 cardio sessions covers ~10 weeks of daily cardio.
    getRecentCardio(50),
    getWeightHistory(weightStartDate),
    getDashboardPreferences(),
    getDoses({ startDate: thirtyDaysAgo }),
    getLogsForDateRange(thirtyDaysAgoKey, todayKey),
    getConsistencyDocs(thirtyDaysAgoKey, todayKey),
    getRecovery(todayKey),
  ]);

  const data: DashboardData = {
    doses: dosesResult.error ? null : (dosesResult.data ?? null),
    totals: nutritionResult.error ? null : (nutritionResult.data ?? null),
    recentSessions: sessionsResult.error ? null : (sessionsResult.data ?? null),
    recentCardio: cardioResult.error ? null : (cardioResult.data ?? null),
    recentWeights: weightsResult.error ? null : (weightsResult.data ?? null),
    preferences: prefsResult,
    streak: null,
    allDoses: allDosesResult.error ? null : (allDosesResult.data ?? null),
    nutritionLogs: nutritionLogsResult.error ? null : (nutritionLogsResult.data ?? null),
    consistency: null,
    recovery: recoveryResult.error ? null : (recoveryResult.data ?? null),
  };

  data.streak = computeStreak(data);

  // Build nutrition calories-by-date map for consistency computation
  const nutritionByDate = new Map<string, number>();
  if (data.nutritionLogs) {
    for (const entry of data.nutritionLogs) {
      if (entry.date) {
        nutritionByDate.set(entry.date, (nutritionByDate.get(entry.date) ?? 0) + entry.calories);
      }
    }
  }

  const userProfile = opts?.userProfile;
  data.consistency = computeConsistency({
    recentSessions: data.recentSessions,
    recentCardio: data.recentCardio,
    allDoses: data.allDoses,
    nutritionLogsByDate: nutritionByDate,
    savedDocs: savedConsistencyResult.error ? [] : (savedConsistencyResult.data ?? []),
    calorieTarget: userProfile?.calorieTarget ?? 0,
    trainingDays: userProfile?.trainingDays ?? [],
    userGoals: userProfile?.goals ?? [],
  });

  // Fire-and-forget: persist today + yesterday for cross-device sync.
  // Only write days that have real activity — skip gap-filled placeholder entries (updatedAt === 0
  // with no activity means the day was never computed from real data, just defaulted to 'missed').
  const days = data.consistency.days;
  const todayEntry = days[days.length - 1];
  const yesterdayEntry = days[days.length - 2];
  const hasActivity = (d: (typeof days)[number]) =>
    d.workoutLogged || d.nutritionPercent > 0 || d.peptideLogged || d.restDayOverride;
  if (todayEntry && hasActivity(todayEntry)) persistConsistencyDay(todayEntry).catch(() => {});
  if (yesterdayEntry && hasActivity(yesterdayEntry)) persistConsistencyDay(yesterdayEntry).catch(() => {});

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
