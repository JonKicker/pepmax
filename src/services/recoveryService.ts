/**
 * Recovery service — daily check-in for sleep quality, hours, and energy.
 * Computes an effort score (10-100) and persists it keyed by local date.
 */
import { serverTimestamp } from 'firebase/firestore';
import { setDocument, getDocument, COLLECTIONS } from './firebase/firestore';
import { toLocalDateKey } from '../utils/nutrition';
import type { RecoveryEntry } from '../types/recovery';
import type { ServiceResult } from '../types/service';

export function calculateEffortScore(
  sleepQuality: number,
  sleepHours: number,
  energyLevel: number,
): number {
  const raw =
    sleepQuality * 10 +
    (Math.min(sleepHours, 9) / 9) * 30 +
    energyLevel * 10 +
    10;
  return Math.round(Math.min(100, Math.max(10, raw)));
}

export async function saveRecovery(input: {
  sleepQuality: number;
  sleepHours: number;
  energyLevel: number;
}): Promise<ServiceResult<void>> {
  const effortScore = calculateEffortScore(
    input.sleepQuality,
    input.sleepHours,
    input.energyLevel,
  );
  const dateKey = toLocalDateKey();
  return setDocument(COLLECTIONS.RECOVERY, dateKey, {
    ...input,
    effortScore,
    timestamp: serverTimestamp(),
  });
}

export async function getTodayRecovery(): Promise<ServiceResult<RecoveryEntry | null>> {
  const dateKey = toLocalDateKey();
  return getDocument<RecoveryEntry>(COLLECTIONS.RECOVERY, dateKey);
}

export async function getRecoveryByDate(dateKey: string): Promise<RecoveryEntry | null> {
  const result = await getDocument<RecoveryEntry>(COLLECTIONS.RECOVERY, dateKey);
  if (result.error || !result.data) return null;
  return result.data;
}
