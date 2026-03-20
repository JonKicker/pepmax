/**
 * Recovery service — daily check-in for sleep, soreness, stress, and readiness.
 * Computes a recoveryMultiplier (0.5–1.5) for the Body Model and a
 * readinessScore (0–100) for display. Persists to recoveryLog keyed by date.
 */
import { serverTimestamp } from 'firebase/firestore';
import { setDocument, getDocument, COLLECTIONS } from './firebase/firestore';
import { toLocalDateKey } from '../utils/nutrition';
import {
  calculateRecoveryMultiplier,
  multiplierToDisplayScore,
} from '../utils/recoveryCalc';
import type { RecoveryInput } from '../types/recovery';
import type { ServiceResult } from '../types/service';

function validateRecoveryInput(input: {
  sleepHours: number;
  sleepQuality: number;
  muscleSoreness: number;
  stressLevel: number;
  overallReadiness: number;
}): void {
  if (!Number.isFinite(input.sleepHours) || input.sleepHours < 0 || input.sleepHours > 12) {
    throw new Error(`sleepHours must be 0–12, got ${input.sleepHours}`);
  }
  for (const field of ['sleepQuality', 'muscleSoreness', 'stressLevel'] as const) {
    const v = input[field];
    if (!Number.isFinite(v) || v < 1 || v > 5) {
      throw new Error(`${field} must be 1–5, got ${v}`);
    }
  }
  if (
    !Number.isFinite(input.overallReadiness) ||
    input.overallReadiness < 0 ||
    input.overallReadiness > 10
  ) {
    throw new Error(`overallReadiness must be 0–10, got ${input.overallReadiness}`);
  }
}

export async function saveRecovery(input: {
  sleepHours: number;
  sleepQuality: number;
  muscleSoreness: number;
  stressLevel: number;
  overallReadiness: number;
  notes: string;
}): Promise<ServiceResult<void>> {
  try {
    validateRecoveryInput(input);
  } catch (e) {
    return { data: null, error: e as Error };
  }

  const recoveryMultiplier = calculateRecoveryMultiplier(
    input.sleepHours,
    input.sleepQuality,
    input.muscleSoreness,
    input.stressLevel,
    input.overallReadiness,
  );
  const readinessScore = multiplierToDisplayScore(recoveryMultiplier);
  const date = toLocalDateKey();

  // Truncate notes to 500 chars — never throw, never drop the entry (Ray M16a item 2)
  const notes = input.notes.trim().slice(0, 500);

  return setDocument(COLLECTIONS.RECOVERY_LOG, date, {
    sleepHours: input.sleepHours,
    sleepQuality: input.sleepQuality,
    muscleSoreness: input.muscleSoreness,
    stressLevel: input.stressLevel,
    overallReadiness: input.overallReadiness,
    notes,
    healthKitSynced: false, // hardcoded until HealthKit milestone (Ray M16a item 3)
    recoveryMultiplier,
    readinessScore,
    timestamp: serverTimestamp(),
    date,
  });
}

/**
 * Fetch recovery log for a given date.
 * Tries new RECOVERY_LOG collection first; falls back to legacy RECOVERY
 * collection for backward compat with pre-M16a documents.
 */
export async function getRecovery(
  date: string,
): Promise<ServiceResult<RecoveryInput | null>> {
  const result = await getDocument<RecoveryInput>(COLLECTIONS.RECOVERY_LOG, date);
  if (result.error === null && result.data !== null) return result;
  // Fall back to legacy collection — old docs have energyLevel/effortScore
  // but callers only read known fields so the cast is safe
  return getDocument<RecoveryInput>(COLLECTIONS.RECOVERY, date);
}

export async function getTodayRecovery(): Promise<ServiceResult<RecoveryInput | null>> {
  return getRecovery(toLocalDateKey());
}
