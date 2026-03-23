/**
 * Recovery Score service — orchestrates data fetching, calls the pure scoring
 * engine, and persists results to Firestore.
 *
 * Reads from: HealthKit (sleep, HRV, RHR), nutrition service, workout/cardio
 * sessions, and prior recovery docs (for HRV/RHR baselines).
 *
 * Writes to: RECOVERY_LOG/{date} — includes both `recoveryScore` (0–100) and
 * `recoveryMultiplier` (0.5–1.5) for backward compatibility with the Body Model.
 */
import { serverTimestamp } from 'firebase/firestore';
import { orderBy, limit, where } from 'firebase/firestore';
import { setDocument, getDocument, queryDocuments, COLLECTIONS } from './firebase/firestore';
import { fetchRecoveryData, fetchHRVHistory, fetchRHRHistory } from './healthKitService';
import { getDailyTotals } from './nutritionService';
import { computeAndSaveBodyModel } from './bodyModelService';
import { computeAcuteChronicRatio } from '../utils/bodyModelCalc';
import { calculateRecoveryScore } from '../utils/recoveryScore';
import { toLocalDateKey } from '../utils/nutrition';
import { isHKEnabled } from '../utils/hkEnabled';
import type { ServiceResult } from '../types/service';
import type { WorkoutSession } from '../types/workout';
import type { CardioSession } from '../types/cardio';
import type { UserProfile } from '../types/profile';
import type {
  MorningCheckInInput,
  RecoveryScoreResult,
  RecoveryScoreDoc,
  RecoveryScoreInputs,
} from '../types/recoveryScore';

// EMA smoothing factor for HRV/RHR baselines
const BASELINE_ALPHA = 0.1;

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Compute and save a recovery score after a morning check-in.
 * Fetches all available data sources, runs the scoring engine, and writes
 * the result to Firestore.
 */
export async function computeAndSaveRecoveryScore(
  checkIn: MorningCheckInInput,
  userProfile: UserProfile | null,
): Promise<ServiceResult<RecoveryScoreResult>> {
  // Validate inputs at the system boundary (Ray blocking item #1)
  const validationError = validateCheckIn(checkIn);
  if (validationError) return { data: null, error: validationError };

  try {
    const todayKey = toLocalDateKey();

    // 1. Gather all data sources in parallel
    const [hkData, nutritionResult, workoutsResult, cardioResult, priorDoc] = await Promise.all([
      fetchHKData(todayKey),
      getDailyTotals(todayKey),
      queryDocuments<WorkoutSession>(COLLECTIONS.WORKOUT_SESSIONS, [
        where('status', '==', 'completed'),
        orderBy('startedAt', 'desc'),
        limit(100),
      ]),
      queryDocuments<CardioSession>(COLLECTIONS.CARDIO_SESSIONS, [
        where('status', '==', 'completed'),
        orderBy('startedAt', 'desc'),
        limit(50),
      ]),
      getLastRecoveryDoc(),
    ]);

    // 2. Resolve HRV/RHR baselines
    const baselines = await resolveBaselines(
      hkData.hrv,
      hkData.restingHR,
      priorDoc,
    );

    // 3. Build score inputs
    const inputs: RecoveryScoreInputs = {};

    // Sleep
    if (hkData.sleep) {
      const totalMinutes =
        (hkData.sleep.deepSleepMinutes ?? 0) + (hkData.sleep.remSleepMinutes ?? 0);
      const deepPct =
        hkData.sleep.totalHours > 0 && totalMinutes > 0
          ? (hkData.sleep.deepSleepMinutes ?? 0) / (hkData.sleep.totalHours * 60) * 100
          : 0;
      inputs.sleep = { durationHours: hkData.sleep.totalHours, deepSleepPct: deepPct };
    }

    // HRV / RHR
    if (hkData.hrv != null && baselines.hrvBaseline != null) {
      inputs.hrv = { value: hkData.hrv, thirtyDayAvg: baselines.hrvBaseline };
    }
    if (hkData.restingHR != null && baselines.rhrBaseline != null) {
      inputs.restingHR = { value: hkData.restingHR, thirtyDayAvg: baselines.rhrBaseline };
    }

    // Training load
    const workouts = workoutsResult.data ?? [];
    const cardio = cardioResult.data ?? [];
    if (workouts.length > 0 || cardio.length > 0) {
      const ratio = computeAcuteChronicRatio(workouts, cardio, new Date());
      // Convert ratio back to acute/chronic for the input shape
      inputs.trainingLoad = { acuteLoad: ratio, chronicLoad: 1 };
    }

    // Nutrition
    if (nutritionResult.data && userProfile) {
      const totals = nutritionResult.data;
      const target = userProfile.calorieTarget ?? 0;
      const proteinTarget = userProfile.macros?.proteinG ?? 0;

      if (target > 0 || proteinTarget > 0) {
        const caloriesInRange = target > 0
          ? Math.abs(totals.calories - target) / target <= 0.15
          : false;
        const proteinHit = proteinTarget > 0
          ? totals.protein >= proteinTarget * 0.8
          : false;
        inputs.nutrition = { proteinHit, caloriesInRange };
      }
    }

    // Subjective
    inputs.subjective = {
      rating: checkIn.feelingRating,
      stress: checkIn.stress,
    };

    // 4. Compute score
    const result = calculateRecoveryScore(inputs);

    // 5. Update baselines via EMA
    const newHrvBaseline = updateBaseline(
      hkData.hrv,
      baselines.hrvBaseline,
    );
    const newRhrBaseline = updateBaseline(
      hkData.restingHR,
      baselines.rhrBaseline,
    );

    // 6. Build and write Firestore doc
    const doc: Omit<RecoveryScoreDoc, 'timestamp'> & { timestamp: ReturnType<typeof serverTimestamp> } = {
      recoveryScore: result.score,
      subScores: result.subScores,
      weights: result.weights,
      zone: result.zone,
      label: result.label,
      recommendations: result.recommendations,
      feelingRating: checkIn.feelingRating,
      ...(checkIn.stress != null ? { stress: checkIn.stress } : {}),
      ...(newHrvBaseline != null ? { hrvBaseline30d: newHrvBaseline } : {}),
      ...(newRhrBaseline != null ? { rhrBaseline30d: newRhrBaseline } : {}),
      recoveryMultiplier: result.recoveryMultiplier,
      notes: (checkIn.notes ?? '').trim().slice(0, 500),
      healthKitSynced: !!(hkData.sleep || hkData.hrv != null || hkData.restingHR != null),
      ...(hkData.restingHR != null ? { restingHR: hkData.restingHR } : {}),
      ...(hkData.hrv != null ? { hrv: hkData.hrv } : {}),
      timestamp: serverTimestamp(),
      date: todayKey,
    };

    const writeResult = await setDocument(COLLECTIONS.RECOVERY_LOG, todayKey, doc);
    if (writeResult.error) {
      return { data: null, error: writeResult.error };
    }

    // 7. Fire-and-forget Body Model recompute
    computeAndSaveBodyModel(todayKey).catch(() => {});

    return { data: result, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

/** Fetch today's recovery score doc (if it exists). */
export async function getTodayRecoveryScore(): Promise<ServiceResult<RecoveryScoreDoc | null>> {
  const todayKey = toLocalDateKey();
  return getDocument<RecoveryScoreDoc>(COLLECTIONS.RECOVERY_LOG, todayKey);
}

/** Fetch the last N days of recovery scores for the trend chart. */
export async function getRecoveryScoreHistory(
  days: number,
): Promise<ServiceResult<Array<{ date: string; score: number }>>> {
  try {
    // Filter by date range to skip old pre-upgrade docs (Ray blocking item #3)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateKey = toLocalDateKey(startDate);

    const result = await queryDocuments<RecoveryScoreDoc>(COLLECTIONS.RECOVERY_LOG, [
      where('date', '>=', startDateKey),
      orderBy('date', 'desc'),
      limit(days),
    ]);
    if (result.error) return { data: null, error: result.error };

    const history = (result.data ?? [])
      .filter((doc) => doc.recoveryScore != null)
      .map((doc) => ({ date: doc.date, score: doc.recoveryScore }))
      .reverse(); // Oldest first for chart display

    return { data: history, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── Internal helpers ───────────────────────────────────────────────────────

async function fetchHKData(date: string) {
  const hkEnabled = isHKEnabled();
  if (!hkEnabled) {
    return { sleep: null, restingHR: null, hrv: null };
  }
  const data = await fetchRecoveryData(date);
  return {
    sleep: data.sleep ?? null,
    restingHR: data.restingHR ?? null,
    hrv: data.hrv ?? null,
  };
}

/** Find the most recent recovery doc that has baseline data. */
async function getLastRecoveryDoc(): Promise<RecoveryScoreDoc | null> {
  const result = await queryDocuments<RecoveryScoreDoc>(COLLECTIONS.RECOVERY_LOG, [
    orderBy('date', 'desc'),
    limit(1),
  ]);
  if (result.error || !result.data?.length) return null;
  return result.data[0];
}

/**
 * Resolve HRV/RHR baselines. Uses prior doc if available, otherwise
 * bootstraps from HealthKit 30-day history.
 */
async function resolveBaselines(
  todayHrv: number | null,
  todayRhr: number | null,
  priorDoc: RecoveryScoreDoc | null,
): Promise<{ hrvBaseline: number | null; rhrBaseline: number | null }> {
  let hrvBaseline = priorDoc?.hrvBaseline30d ?? null;
  let rhrBaseline = priorDoc?.rhrBaseline30d ?? null;

  // Bootstrap from HealthKit history if no prior baseline
  if (hrvBaseline == null && todayHrv != null) {
    const history = await fetchHRVHistory(30);
    if (history && history.length > 0) {
      hrvBaseline = Math.round(
        history.reduce((sum, h) => sum + h.value, 0) / history.length,
      );
    } else {
      // Use today's value as initial baseline
      hrvBaseline = todayHrv;
    }
  }

  if (rhrBaseline == null && todayRhr != null) {
    const history = await fetchRHRHistory(30);
    if (history && history.length > 0) {
      rhrBaseline = Math.round(
        history.reduce((sum, h) => sum + h.value, 0) / history.length,
      );
    } else {
      rhrBaseline = todayRhr;
    }
  }

  return { hrvBaseline, rhrBaseline };
}

/** Validate morning check-in input at system boundary. */
function validateCheckIn(input: MorningCheckInInput): Error | null {
  const r = input.feelingRating;
  if (!Number.isFinite(r) || r < 1 || r > 5 || Math.round(r) !== r) {
    return new Error(`feelingRating must be integer 1–5, got ${r}`);
  }
  if (input.stress != null) {
    const s = input.stress;
    if (!Number.isFinite(s) || s < 1 || s > 3 || Math.round(s) !== s) {
      return new Error(`stress must be integer 1–3, got ${s}`);
    }
  }
  return null;
}

/** Update a baseline via exponential moving average. Returns null if no data. */
function updateBaseline(
  todayValue: number | null,
  currentBaseline: number | null,
): number | null {
  if (todayValue == null) return currentBaseline;
  if (currentBaseline == null) return todayValue;
  return Math.round(BASELINE_ALPHA * todayValue + (1 - BASELINE_ALPHA) * currentBaseline);
}
