/**
 * Body Weight service — log, fetch, and analyse weight entries.
 *
 * Weight is always stored in kg. Display conversion uses the user's unit preference.
 * Document ID = YYYY-MM-DD (one entry per day — re-logging overwrites).
 */
import { orderBy, where } from 'firebase/firestore';
import {
  COLLECTIONS,
  setDocument,
  getDocument,
  queryDocuments,
  deleteDocument,
  updateDocument,
} from './firebase/firestore';
import { writeBodyWeight } from './healthKitService';
import { HK_WEIGHT_SOURCE_MARKER } from '../constants/healthKit';
import type { ServiceResult } from '../types/service';
import type { BodyWeightEntry, BodyWeightInput } from '../types/bodyTracking';

export { computeWeightStats } from '../utils/bodyTracking';

// ─── Write ──────────────────────────────────────────────────────────────────

export async function logWeight(input: BodyWeightInput): Promise<ServiceResult<void>> {
  const result = await setDocument(COLLECTIONS.BODY_WEIGHT, input.date, {
    weight: input.weight,
    displayUnit: input.displayUnit,
    date: input.date,
    ...(input.note ? { note: input.note } : {}),
  });
  // Fire-and-forget HealthKit write — skip if this entry came from HealthKit itself
  if (!result.error && input.note !== HK_WEIGHT_SOURCE_MARKER) {
    writeBodyWeight(input.weight, new Date(`${input.date}T12:00:00`)).catch(() => {});
  }
  // Sync today's weight to profile body stats (fire-and-forget)
  const today = new Date().toISOString().slice(0, 10);
  if (!result.error && input.date === today) {
    updateDocument(COLLECTIONS.PROFILE, 'data', { weightKg: input.weight }).catch(() => {});
  }
  return result;
}

// ─── Read ───────────────────────────────────────────────────────────────────

export async function getTodaysWeight(
  dateKey: string,
): Promise<ServiceResult<BodyWeightEntry | null>> {
  return getDocument<BodyWeightEntry>(COLLECTIONS.BODY_WEIGHT, dateKey);
}

/**
 * Fetch weight history ordered by date descending.
 * Optionally filter to entries on or after `startDate` (YYYY-MM-DD).
 */
export async function getWeightHistory(
  startDate?: string,
): Promise<ServiceResult<BodyWeightEntry[]>> {
  const constraints = startDate
    ? [where('date', '>=', startDate), orderBy('date', 'asc')]
    : [orderBy('date', 'asc')];
  return queryDocuments<BodyWeightEntry>(COLLECTIONS.BODY_WEIGHT, constraints);
}

// ─── Delete ─────────────────────────────────────────────────────────────────

export async function deleteWeightEntry(date: string): Promise<ServiceResult<void>> {
  return deleteDocument(COLLECTIONS.BODY_WEIGHT, date);
}

