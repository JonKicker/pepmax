/**
 * Data export service — serializes all user collections to JSON or CSV and shares via OS share sheet.
 *
 * Design notes (for Ray):
 * - Premium-only — caller must check usePremium().isPremium before calling.
 * - Exports to app-scoped documentDirectory, not user-accessible media.
 * - Files are NOT cleaned up after sharing — expo-sharing closes the file after the OS
 *   share sheet completes. Files remain in documentDirectory; acceptable for the payloads involved.
 * - JSON: Firestore Timestamps serialize as objects ({_seconds, _nanoseconds}) — expected for JSON.
 * - CSV: Timestamps are pre-processed to ISO strings before serialization for readability.
 * - CSV key union: all rows are scanned to union all possible keys — handles docs with different fields.
 * - Profile doc is included in export (user is exporting their own data).
 */
import { documentDirectory, writeAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import JSZip from 'jszip';
import { queryDocuments, getDocument, COLLECTIONS } from './firebase/firestore';
import type { ServiceResult } from '../types/service';

const EXPORT_COLLECTIONS = [
  COLLECTIONS.DOSES,
  COLLECTIONS.FOOD_LOG,
  COLLECTIONS.FAVORITE_FOODS,
  COLLECTIONS.WORKOUTS,
  COLLECTIONS.WORKOUT_SESSIONS,
  COLLECTIONS.CARDIO_SESSIONS,
  COLLECTIONS.CUSTOM_EXERCISES,
  COLLECTIONS.WORKOUT_TEMPLATES,
  COLLECTIONS.PERSONAL_RECORDS,
  COLLECTIONS.BODY_WEIGHT,
  COLLECTIONS.BODY_WEIGHT_LOGS,
  COLLECTIONS.PROGRESS_PHOTOS,
  COLLECTIONS.SIDE_EFFECTS,
  COLLECTIONS.AI_INSIGHTS,
  COLLECTIONS.CONSISTENCY,
  COLLECTIONS.CYCLES,
  COLLECTIONS.RECIPES,
  COLLECTIONS.BODY_MEASUREMENTS,
  COLLECTIONS.INVENTORY,
  COLLECTIONS.RECOVERY,      // legacy — kept for export of pre-M16a docs
  COLLECTIONS.RECOVERY_LOG,  // new path — M16a onwards
  COLLECTIONS.BODY_MODEL,    // daily body model snapshots — M20
  COLLECTIONS.RECON_PROTOCOLS,
  COLLECTIONS.EQUIPMENT_PROFILES,
  COLLECTIONS.NUTRITION,
  COLLECTIONS.PEPTIDES,
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Convert a Firestore Timestamp-like object or Date to an ISO string.
 * Falls through to the original value if it doesn't look like a Timestamp.
 */
function normalizeTimestamp(value: unknown): unknown {
  if (value !== null && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    // Firestore Timestamp shape
    if (typeof obj._seconds === 'number') {
      return new Date(obj._seconds * 1000).toISOString();
    }
    // Native Date
    if (value instanceof Date) {
      return value.toISOString();
    }
    // Firestore Timestamp with toDate()
    if (typeof (obj as { toDate?: () => Date }).toDate === 'function') {
      return (obj as { toDate: () => Date }).toDate().toISOString();
    }
  }
  return value;
}

/** Deep-walk a record and normalize all Timestamp-like values to ISO strings. */
function normalizeDoc(doc: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(doc)) {
    const val = doc[key];
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      const normalized = normalizeTimestamp(val);
      // If normalizeTimestamp returned the same object, recurse into it
      result[key] = normalized === val ? normalizeDoc(val as Record<string, unknown>) : normalized;
    } else if (Array.isArray(val)) {
      result[key] = val.map((item) =>
        item !== null && typeof item === 'object' ? normalizeDoc(item as Record<string, unknown>) : item,
      );
    } else {
      result[key] = val;
    }
  }
  return result;
}

/**
 * Convert an array of objects to CSV string.
 * Unions all keys across all rows to handle documents with different fields.
 */
function objectsToCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';

  // Union all keys across every row
  const allKeys = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));

  const escapeCell = (val: unknown): string => {
    const str = val === null || val === undefined ? '' : String(val);
    // Wrap in quotes if contains comma, newline, or quote
    if (str.includes(',') || str.includes('\n') || str.includes('"')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const header = allKeys.map(escapeCell).join(',');
  const dataRows = rows.map((row) =>
    allKeys.map((key) => escapeCell(row[key])).join(','),
  );

  return [header, ...dataRows].join('\n');
}

// ─── Export functions ─────────────────────────────────────────────────────────

export async function exportUserDataAsJSON(): Promise<ServiceResult<string>> {
  try {
    const exportPayload: Record<string, unknown[]> = {};

    // Include profile doc
    const { data: profile } = await getDocument(COLLECTIONS.PROFILE, 'data');
    if (profile) exportPayload[COLLECTIONS.PROFILE] = [profile];

    for (const col of EXPORT_COLLECTIONS) {
      const { data, error } = await queryDocuments(col);
      if (!error && data) {
        exportPayload[col] = data;
      }
      // Silently skip failed collections — user still gets partial export
    }

    const json = JSON.stringify(exportPayload, null, 2);
    const filename = `pepmax-export-${Date.now()}.json`;
    const fileUri = `${documentDirectory}${filename}`;

    await writeAsStringAsync(fileUri, json, { encoding: EncodingType.UTF8 });

    const sharingAvailable = await Sharing.isAvailableAsync();
    if (!sharingAvailable) {
      return { data: null, error: new Error('Sharing is not available on this device.') };
    }

    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/json',
      dialogTitle: 'Export PepMax Data',
    });

    return { data: fileUri, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

export async function exportUserDataAsCSV(): Promise<ServiceResult<string>> {
  try {
    const zip = new JSZip();

    // Include profile doc
    const { data: profile } = await getDocument(COLLECTIONS.PROFILE, 'data');
    if (profile) {
      const normalized = normalizeDoc(profile as Record<string, unknown>);
      zip.file(`${COLLECTIONS.PROFILE}.csv`, objectsToCSV([normalized]));
    }

    for (const col of EXPORT_COLLECTIONS) {
      const { data, error } = await queryDocuments(col);
      if (!error && data && data.length > 0) {
        const normalized = data.map((doc) => normalizeDoc(doc as Record<string, unknown>));
        zip.file(`${col}.csv`, objectsToCSV(normalized));
      }
      // Skip empty or failed collections
    }

    const zipBase64 = await zip.generateAsync({ type: 'base64' });
    const filename = `pepmax-export-${Date.now()}.zip`;
    const fileUri = `${documentDirectory}${filename}`;

    await writeAsStringAsync(fileUri, zipBase64, { encoding: EncodingType.Base64 });

    const sharingAvailable = await Sharing.isAvailableAsync();
    if (!sharingAvailable) {
      return { data: null, error: new Error('Sharing is not available on this device.') };
    }

    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/zip',
      dialogTitle: 'Export PepMax Data (CSV)',
    });

    return { data: fileUri, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// Keep old export name as alias so existing callers don't break during migration
export const exportUserData = exportUserDataAsJSON;
