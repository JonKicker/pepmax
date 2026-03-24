/**
 * Body Model service — orchestrate inputs → compute → persist daily snapshot.
 *
 * Design decisions (for Ray):
 * - Partial data failure handling: each data source fetch is run via Promise.allSettled.
 *   Any failed source falls back to a defined safe default. The computation always proceeds.
 *   A body model with some zones approximated is far more useful than no body model.
 * - DEFAULT_RECOVERY_MULTIPLIER (1.0) is applied when no recovery check-in exists for the
 *   target date. This prevents division-by-zero in the recovery curve formula.
 * - calorieTarget is an optional parameter — if not provided, metabolic score defaults to 70.
 *   This keeps the service decoupled from the auth/profile context.
 * - computeAndSaveBodyModel returns ServiceResult<BodyModelSnapshot> — never throws.
 * - getBodyModelRange enforces a BODY_MODEL_MAX_RANGE_DAYS cap via the query limit.
 */

import { serverTimestamp, Timestamp, where, orderBy, limit as firestoreLimit } from 'firebase/firestore';
import {
  setDocument,
  getDocument,
  queryDocuments,
  COLLECTIONS,
} from './firebase/firestore';
import { getCompletedSessions } from './workoutSessionService';
import { getRecentSessions as getRecentCardioSessions } from './cardioService';
import { getRecovery } from './recoveryService';
import { getDailyTotals } from './nutritionService';
import {
  computeAllMuscleZones,
  computeAllSystemScores,
  computeSynergyScore,
  computeBonuses,
  computeAcuteChronicRatio,
  hasConsistencyBonus,
} from '../utils/bodyModelCalc';
import { DEFAULT_RECOVERY_MULTIPLIER, BODY_MODEL_MAX_RANGE_DAYS } from '../constants/bodyModel';
import type { ServiceResult } from '../types/service';
import type { BodyModelSnapshot } from '../types/bodyModel';

// ─── Compute and persist ──────────────────────────────────────────────────────

/**
 * Compute the Body Model for the given date and write it to Firestore.
 *
 * Data sources and their fallbacks:
 *   Workout sessions    → failure: [] (all muscle zones start at 100)
 *   Cardio sessions     → failure: [] (cardiovascular score defaults to neutral 70)
 *   Recovery check-in   → failure/missing: recoveryMultiplier=1.0, sleepHours=7, stress=1
 *   Nutrition totals    → failure/missing: nutritionAdherence=null (metabolic defaults to 70)
 *
 * @param date - YYYY-MM-DD string for the day being computed
 * @param calorieTarget - Optional user calorie target for nutrition adherence calculation.
 *                        Pass 0 or omit to skip (metabolic defaults to neutral 70).
 */
export async function computeAndSaveBodyModel(
  date: string,
  calorieTarget = 0,
): Promise<ServiceResult<BodyModelSnapshot>> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { data: null, error: new Error(`Invalid date format: ${date}`) };
  }

  try {
    // ── Fetch all data sources in parallel; failures fall back to safe defaults ──
    const [workoutResult, cardioResult, recoveryResult, nutritionResult] =
      await Promise.allSettled([
        getCompletedSessions(100), // last 100 completed sessions — covers ~20 weeks at 5x/week
        getRecentCardioSessions(50),
        getRecovery(date),
        getDailyTotals(date),
      ]);

    const workoutSessions =
      workoutResult.status === 'fulfilled' ? (workoutResult.value.data ?? []) : [];

    const cardioSessions =
      cardioResult.status === 'fulfilled' ? (cardioResult.value.data ?? []) : [];

    const recovery =
      recoveryResult.status === 'fulfilled' ? recoveryResult.value.data : null;

    const nutritionTotals =
      nutritionResult.status === 'fulfilled' ? nutritionResult.value.data : null;

    // ── Resolved inputs with safe defaults ──────────────────────────────────────
    // DEFAULT_RECOVERY_MULTIPLIER = 1.0: prevents division-by-zero in recovery curve
    const recoveryMultiplier = recovery?.recoveryMultiplier ?? DEFAULT_RECOVERY_MULTIPLIER;
    const sleepHours = recovery?.sleepHours ?? 7;
    const stressLevel = recovery?.stress ?? 1;

    // Nutrition adherence: calories / calorieTarget, clamped 0–1
    // null when no nutrition logged or no calorie target set
    let nutritionAdherence: number | null = null;
    if (nutritionTotals && calorieTarget > 0) {
      nutritionAdherence = Math.min(1, nutritionTotals.calories / calorieTarget);
    }

    const referenceDate = new Date(`${date}T23:59:59`);

    // ── Compute zone scores ──────────────────────────────────────────────────────
    const muscles = computeAllMuscleZones(workoutSessions, recoveryMultiplier, referenceDate);

    const systems = computeAllSystemScores({
      recoveryMultiplier,
      sleepHours,
      stressLevel,
      recentCardioSessions: cardioSessions,
      recentWorkoutSessions: workoutSessions,
      nutritionAdherence,
      referenceDate,
    });

    // ── Compute bonuses/penalties ────────────────────────────────────────────────
    const ratio = computeAcuteChronicRatio(workoutSessions, cardioSessions, referenceDate);
    const consistencyBonus = hasConsistencyBonus(workoutSessions, cardioSessions, referenceDate);
    const bonuses = computeBonuses(systems, consistencyBonus, ratio);

    // ── Synergy Score ────────────────────────────────────────────────────────────
    const synergyScore = computeSynergyScore(muscles, systems, bonuses);

    // ── Write to Firestore ───────────────────────────────────────────────────────
    const snapshotData = {
      date,
      synergyScore,
      muscles,
      systems,
      bonuses,
      computedAt: serverTimestamp(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const writeResult = await setDocument(COLLECTIONS.BODY_MODEL, date, snapshotData as any);
    if (writeResult.error) return { data: null, error: writeResult.error };

    // Return the snapshot with computedAt approximated (serverTimestamp resolves server-side)
    const snapshot: BodyModelSnapshot = {
      date,
      synergyScore,
      muscles,
      systems,
      bonuses,
      computedAt: Timestamp.now(),
    };

    return { data: snapshot, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e : new Error(String(e)) };
  }
}

// ─── Read ─────────────────────────────────────────────────────────────────────

/** Read the cached Body Model snapshot for a specific date. Returns null if not yet computed. */
export async function getBodyModel(date: string): Promise<ServiceResult<BodyModelSnapshot | null>> {
  return getDocument<BodyModelSnapshot>(COLLECTIONS.BODY_MODEL, date);
}

/**
 * Read Body Model snapshots for a date range (inclusive).
 * Enforces BODY_MODEL_MAX_RANGE_DAYS cap to prevent large reads.
 *
 * @param startDate - YYYY-MM-DD
 * @param endDate   - YYYY-MM-DD
 */
export async function getBodyModelRange(
  startDate: string,
  endDate: string,
): Promise<ServiceResult<BodyModelSnapshot[]>> {
  return queryDocuments<BodyModelSnapshot>(COLLECTIONS.BODY_MODEL, [
    where('date', '>=', startDate),
    where('date', '<=', endDate),
    orderBy('date', 'desc'),
    firestoreLimit(BODY_MODEL_MAX_RANGE_DAYS),
  ]);
}
