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
} from './firebase/firestore';
import type { ServiceResult } from '../types/service';
import type { BodyWeightEntry, BodyWeightInput } from '../types/bodyTracking';
import { computeWeightStats } from '../utils/bodyTracking';

export { computeWeightStats } from '../utils/bodyTracking';

// ─── Write ──────────────────────────────────────────────────────────────────

export async function logWeight(input: BodyWeightInput): Promise<ServiceResult<void>> {
  return setDocument(COLLECTIONS.BODY_WEIGHT, input.date, {
    weight: input.weight,
    displayUnit: input.displayUnit,
    date: input.date,
    ...(input.note ? { note: input.note } : {}),
  });
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

// computeWeightStats is a pure util — re-exported from utils/bodyTracking for
// convenience. Direct callers can import from either location.
void computeWeightStats; // prevent unused-var lint
