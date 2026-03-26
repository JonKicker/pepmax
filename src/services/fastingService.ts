/**
 * Fasting service — CRUD for fasting config and log entries.
 *
 * Config stored at users/{uid}/settings/fasting (merged doc).
 * Log entries stored at users/{uid}/fastingLog/{autoId}.
 *
 * Weekly completion count = count of last 7 calendar days where
 * fastCompleted === true and breakTime === null (user completed the
 * full fasting window).
 *
 * Never throws — all errors return as ServiceResult.error.
 *
 * userId parameter note: consistent with nutritionService and peptideService,
 * these functions do NOT accept a userId — authentication is handled internally
 * by requireAuth() inside the Firestore helpers. Breadcrumbs are emitted
 * without a userId parameter.
 */
import { serverTimestamp, where, orderBy } from 'firebase/firestore';
import {
  getDocument,
  mergeDocument,
  addDocument,
  queryDocuments,
  COLLECTIONS,
} from './firebase/firestore';
import { addBreadcrumb } from './errorReporting';
import type { ServiceResult } from '../types/service';
import type { FastingConfig, FastingLogEntry } from '../types/fasting';

// ─── Config ───────────────────────────────────────────────────────────────────

const FASTING_CONFIG_DOC_ID = 'fasting';

/**
 * Reads the user's fasting config from settings/fasting.
 * Returns null data (not an error) if the user has not configured fasting yet.
 */
export async function getFastingConfig(): Promise<ServiceResult<FastingConfig | null>> {
  addBreadcrumb('fasting', 'getFastingConfig', {});
  return getDocument<FastingConfig>(COLLECTIONS.SETTINGS, FASTING_CONFIG_DOC_ID);
}

/**
 * Saves (merges) the user's fasting config into settings/fasting.
 * Creates the doc if it doesn't exist (adds createdAt on first save);
 * preserves existing fields not in `config`.
 */
export async function saveFastingConfig(
  config: Omit<FastingConfig, 'createdAt' | 'updatedAt'>,
): Promise<ServiceResult<void>> {
  addBreadcrumb('fasting', 'saveFastingConfig', { protocol: config.protocol });

  // Read first to determine whether createdAt needs to be set.
  // mergeDocument does not auto-add createdAt, so we inject it on first save.
  const existing = await getDocument<FastingConfig>(COLLECTIONS.SETTINGS, FASTING_CONFIG_DOC_ID);
  const isNew = existing.error != null || existing.data == null;

  return mergeDocument(COLLECTIONS.SETTINGS, FASTING_CONFIG_DOC_ID, {
    ...config,
    ...(isNew ? { createdAt: serverTimestamp() } : {}),
    updatedAt: serverTimestamp(),
  });
}

// ─── Log entries ──────────────────────────────────────────────────────────────

/**
 * Returns true if a fasting log entry already exists for today's date
 * (fastCompleted=true). Used to prevent double-writing from the manual
 * "Mark Fasting Complete" button when the automatic transition also fired.
 */
export async function hasTodayFastingLog(date: string): Promise<boolean> {
  const result = await queryDocuments<FastingLogEntry>(COLLECTIONS.FASTING_LOG, [
    where('date', '==', date),
    where('fastCompleted', '==', true),
  ]);
  return !result.error && (result.data?.length ?? 0) > 0;
}

/**
 * Logs a successfully completed fasting window for `date`.
 * fastCompleted = true, breakTime = null, completedAt = serverTimestamp.
 */
export async function logFastComplete(
  date: string,
): Promise<ServiceResult<string>> {
  addBreadcrumb('fasting', 'logFastComplete', { date });
  return addDocument<Omit<FastingLogEntry, 'createdAt' | 'updatedAt'>>(COLLECTIONS.FASTING_LOG, {
    date,
    fastCompleted: true,
    breakTime: null,
    completedAt: serverTimestamp() as unknown as null,
  } as Omit<FastingLogEntry, 'createdAt' | 'updatedAt'>);
}

/**
 * Logs a broken fast for `date`.
 * fastCompleted = false, breakTime = serverTimestamp, completedAt = null.
 */
export async function logBreakFast(
  date: string,
): Promise<ServiceResult<string>> {
  addBreadcrumb('fasting', 'logBreakFast', { date });
  return addDocument<Omit<FastingLogEntry, 'createdAt' | 'updatedAt'>>(COLLECTIONS.FASTING_LOG, {
    date,
    fastCompleted: false,
    breakTime: serverTimestamp() as unknown as null,
    completedAt: null,
  } as Omit<FastingLogEntry, 'createdAt' | 'updatedAt'>);
}

// ─── Weekly completion count ──────────────────────────────────────────────────

/**
 * Computes the weekly fasting completion count: total number of the last 7
 * calendar days where the user completed the full window
 * (fastCompleted === true && breakTime === null).
 *
 * Note: this is a count of completed days in the 7-day window, NOT a
 * consecutive-day streak. Renamed from getWeeklyStreak to make this clear.
 *
 * Queries FASTING_LOG for entries in the past 7 days and deduplicates by date
 * (takes the most favorable entry per day — if any entry for a day has
 * fastCompleted=true and breakTime=null, that day counts).
 *
 * Firestore composite index required (see firestore.indexes.json):
 *   fastingLog: date ASC + date DESC  (range filter + orderBy on same field)
 */
export async function getWeeklyCompletionCount(): Promise<ServiceResult<number>> {
  addBreadcrumb('fasting', 'getWeeklyCompletionCount', {});

  // Build array of last 7 date strings (YYYY-MM-DD), today inclusive
  const dates: string[] = [];
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    dates.push(`${yyyy}-${mm}-${dd}`);
  }

  const oldest = dates[dates.length - 1]; // earliest date in window
  const newest = dates[0];                // today

  const result = await queryDocuments<FastingLogEntry>(COLLECTIONS.FASTING_LOG, [
    where('date', '>=', oldest),
    where('date', '<=', newest),
    orderBy('date', 'desc'),
  ]);

  if (result.error) return { data: null, error: result.error };

  const entries = result.data ?? [];

  // Per day, check if any entry marks the day as successfully completed
  const completedDays = new Set<string>();
  for (const entry of entries) {
    if (entry.fastCompleted === true && entry.breakTime === null) {
      completedDays.add(entry.date);
    }
  }

  // Count only dates within our 7-day window
  let count = 0;
  for (const date of dates) {
    if (completedDays.has(date)) count++;
  }

  return { data: count, error: null };
}

// ─── Recent logs ─────────────────────────────────────────────────────────────

/**
 * Retrieves fasting log entries for the most recent `days` calendar days.
 */
export async function getRecentLogs(
  days: number,
): Promise<ServiceResult<FastingLogEntry[]>> {
  addBreadcrumb('fasting', 'getRecentLogs', { days });

  const now = new Date();
  const oldest = new Date(now);
  oldest.setDate(now.getDate() - (days - 1));
  const yyyy = oldest.getFullYear();
  const mm = String(oldest.getMonth() + 1).padStart(2, '0');
  const dd = String(oldest.getDate()).padStart(2, '0');
  const oldestKey = `${yyyy}-${mm}-${dd}`;

  return queryDocuments<FastingLogEntry>(COLLECTIONS.FASTING_LOG, [
    where('date', '>=', oldestKey),
    orderBy('date', 'desc'),
  ]);
}
