/**
 * Adaptive Calorie Coaching service — orchestrates data fetching and writes.
 *
 * Separation of concerns:
 *   - This file: Firebase I/O, profile writes, data assembly.
 *   - src/utils/expenditureAlgorithm.ts: pure math (no Firebase, testable).
 *
 * All profile writes use mergeDocument('profile', 'data', ...) which preserves
 * all existing profile fields and only updates what we pass in.
 */
import { mergeDocument, COLLECTIONS } from './firebase/firestore';
import { getWeightHistory } from './bodyWeightService';
import { getLogsForDateRange } from './nutritionService';
import { toLocalDateKey } from '../utils/nutrition';
import {
  smoothWeight,
  calculateAdaptiveTDEE,
  generateTargets,
  hasEnoughData,
} from '../utils/expenditureAlgorithm';
import type { Glp1Override } from '../utils/expenditureAlgorithm';
import type { ServiceResult } from '../types/service';
import type { UserProfile } from '../types/profile';
import type {
  AdaptiveCoachingState,
  AdaptiveCheckIn,
  WeightTrendPoint,
  AdaptiveTDEEResult,
  AdaptiveTargets,
  DataReadiness,
} from '../types/adaptiveCoaching';

const MAX_CHECK_IN_HISTORY = 12;

// ─── Data fetching ───────────────────────────────────────────────────────────

export type AdaptiveCoachingData = {
  weightTrend: WeightTrendPoint[];
  dailyCalories: { date: string; calories: number }[];
  readiness: DataReadiness;
};

/**
 * Fetch and assemble the data needed to run the adaptive algorithm.
 * Fetches last `lookbackDays` days of weight entries and food logs.
 */
export async function getAdaptiveCoachingData(
  lookbackDays = 30,
): Promise<ServiceResult<AdaptiveCoachingData>> {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - lookbackDays);

  const startKey = toLocalDateKey(startDate);
  const endKey = toLocalDateKey(today);

  // Fetch weight + food logs in parallel
  const [weightResult, foodResult] = await Promise.all([
    getWeightHistory(startKey),
    getLogsForDateRange(startKey, endKey),
  ]);

  if (weightResult.error) return { data: null, error: weightResult.error };
  if (foodResult.error) return { data: null, error: foodResult.error };

  const entries = weightResult.data ?? [];
  const foodLogs = foodResult.data ?? [];

  // Smooth the weight series (entries are already sorted asc by bodyWeightService)
  const weightInputs = entries.map((e) => ({ date: e.date, kg: e.weight }));
  const weightTrend = smoothWeight(weightInputs);

  // Group food logs by date and sum calories
  const calByDate = new Map<string, number>();
  for (const log of foodLogs) {
    calByDate.set(log.date, (calByDate.get(log.date) ?? 0) + log.calories);
  }
  const dailyCalories = Array.from(calByDate.entries())
    .map(([date, calories]) => ({ date, calories }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const weightDates = entries.map((e) => e.date);
  const nutritionDates = Array.from(calByDate.keys());
  const readiness = hasEnoughData(weightDates, nutritionDates);

  return { data: { weightTrend, dailyCalories, readiness }, error: null };
}

// ─── Check-in computation ────────────────────────────────────────────────────

export type CheckInResult = {
  result: AdaptiveTDEEResult;
  targets: AdaptiveTargets;
  coachingData: AdaptiveCoachingData;
};

/**
 * Run the TDEE + target computation from already-fetched coaching data.
 * Callers should fetch via `getAdaptiveCoachingData()` first and pass it in
 * to avoid a redundant Firestore read.
 *
 * Pass `glp1Override` when an active GLP-1 cycle has been detected upstream
 * (from useGlp1Nutrition or similar). The override is forwarded to
 * generateTargets to apply protein and calorie guardrails on top of the
 * standard adaptive logic.
 */
export async function runWeeklyCheckIn(
  userProfile: UserProfile,
  coachingData: AdaptiveCoachingData,
  glp1Override?: Glp1Override,
): Promise<ServiceResult<CheckInResult>> {
  if (!coachingData.readiness.ready) {
    // Not enough data — caller should show the progress state instead
    return {
      data: null,
      error: new Error(`Need ${coachingData.readiness.daysNeeded} days of data; have ${coachingData.readiness.daysWithBothData}`),
    };
  }

  const tdeeResult = calculateAdaptiveTDEE(
    coachingData.weightTrend,
    coachingData.dailyCalories,
  );

  if (!tdeeResult) {
    return { data: null, error: new Error('Insufficient overlapping data for TDEE calculation') };
  }

  const macroPcts =
    userProfile.macros.proteinPct != null &&
    userProfile.macros.carbsPct != null &&
    userProfile.macros.fatPct != null
      ? {
          proteinPct: userProfile.macros.proteinPct,
          carbsPct: userProfile.macros.carbsPct,
          fatPct: userProfile.macros.fatPct,
        }
      : undefined;

  const targets = generateTargets(
    tdeeResult.estimatedTDEE,
    userProfile.goalType ?? 'maintain',
    userProfile.sex,
    macroPcts,
    glp1Override,
  );

  return { data: { result: tdeeResult, targets, coachingData }, error: null };
}

// ─── Profile writes ──────────────────────────────────────────────────────────

/**
 * User tapped "Accept New Targets" — update calorieTarget, macros, and
 * adaptive coaching state.
 *
 * Receives the full existing state so we can preserve `dataStartDate` — Firestore
 * `merge: true` only merges at the document field level, not within nested maps.
 * Writing a partial `adaptiveCoaching` object would overwrite the entire field.
 */
export async function acceptCheckIn(
  result: AdaptiveTDEEResult,
  targets: AdaptiveTargets,
  existing: AdaptiveCoachingState,
): Promise<ServiceResult<void>> {
  const today = toLocalDateKey();

  const newEntry: AdaptiveCheckIn = {
    date: today,
    estimatedTDEE: result.estimatedTDEE,
    recommendedTarget: targets.calorieTarget,
    accepted: true,
    weightTrendKgPerWeek: result.weightChangeKgPerWeek,
  };

  // FIFO cap — keep only the most recent MAX_CHECK_IN_HISTORY entries
  const history = [...existing.checkInHistory, newEntry].slice(-MAX_CHECK_IN_HISTORY);

  // Write the complete adaptive state so no fields are silently erased
  const adaptiveUpdate: AdaptiveCoachingState = {
    ...existing,
    estimatedTDEE: result.estimatedTDEE,
    lastCheckInDate: today,
    checkInHistory: history,
    // dataStartDate preserved from `existing` — never reset after first enable
  };

  return mergeDocument(COLLECTIONS.PROFILE, 'data', {
    calorieTarget: targets.calorieTarget,
    tdee: targets.tdee,
    macros: targets.macros,
    adaptiveCoaching: adaptiveUpdate,
  });
}

/**
 * User tapped "Keep Current" — only advance the last check-in date so the
 * modal doesn't reappear for another 7 days. Targets unchanged.
 *
 * Receives the full existing state for the same reason as acceptCheckIn —
 * partial nested writes overwrite the entire `adaptiveCoaching` map field.
 */
export async function dismissCheckIn(
  existing: AdaptiveCoachingState,
  estimatedTDEE: number,
  recommendedTarget: number,
  weightTrendKgPerWeek: number,
): Promise<ServiceResult<void>> {
  const today = toLocalDateKey();

  const newEntry: AdaptiveCheckIn = {
    date: today,
    estimatedTDEE,
    recommendedTarget,
    accepted: false,
    weightTrendKgPerWeek,
  };

  const history = [...existing.checkInHistory, newEntry].slice(-MAX_CHECK_IN_HISTORY);

  return mergeDocument(COLLECTIONS.PROFILE, 'data', {
    adaptiveCoaching: {
      ...existing,
      lastCheckInDate: today,
      checkInHistory: history,
    },
  });
}

/**
 * Enable adaptive coaching. Sets `enabled = true` and records the start date.
 * Does not overwrite estimatedTDEE or history — safe to toggle on/off.
 */
export async function enableAdaptiveCoaching(
  existing?: AdaptiveCoachingState,
): Promise<ServiceResult<void>> {
  return mergeDocument(COLLECTIONS.PROFILE, 'data', {
    adaptiveCoaching: {
      ...(existing ?? {}),
      enabled: true,
      dataStartDate: existing?.dataStartDate ?? toLocalDateKey(),
      checkInIntervalDays: existing?.checkInIntervalDays ?? 7,
      estimatedTDEE: existing?.estimatedTDEE ?? null,
      lastCheckInDate: existing?.lastCheckInDate ?? null,
      checkInHistory: existing?.checkInHistory ?? [],
    },
  });
}

/**
 * Disable adaptive coaching. Preserves all history and estimatedTDEE for
 * context if the user re-enables later. Calorie targets remain unchanged.
 */
export async function disableAdaptiveCoaching(
  existing?: AdaptiveCoachingState,
): Promise<ServiceResult<void>> {
  return mergeDocument(COLLECTIONS.PROFILE, 'data', {
    adaptiveCoaching: {
      ...(existing ?? {}),
      enabled: false,
    },
  });
}
