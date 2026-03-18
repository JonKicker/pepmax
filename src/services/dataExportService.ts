/**
 * Data export service — serializes all user collections to JSON and shares via OS share sheet.
 *
 * Design notes (for Ray):
 * - Premium-only — caller must check usePremium().isPremium before calling.
 * - Exports to app-scoped documentDirectory, not user-accessible media.
 * - File is NOT cleaned up after sharing — expo-sharing closes the file after the OS
 *   share sheet completes. The file remains in documentDirectory; this is acceptable
 *   for the small JSON payloads involved. Clean-up can be added if storage becomes a concern.
 * - Firestore Timestamp fields serialize as objects ({_seconds, _nanoseconds}). This is
 *   expected behaviour for JSON export — not a data loss issue.
 * - Collections exported: doses, foodLog, workoutSessions, cardioSessions, bodyWeightLogs.
 *   Excludes: profile (contains PII — user can view in Settings), subscription,
 *   and template/library collections that contain no personal health logs.
 */
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { queryDocuments, COLLECTIONS } from './firebase/firestore';
import type { ServiceResult } from '../types/service';

const EXPORT_COLLECTIONS = [
  COLLECTIONS.DOSES,
  COLLECTIONS.FOOD_LOG,
  COLLECTIONS.WORKOUT_SESSIONS,
  COLLECTIONS.CARDIO_SESSIONS,
  COLLECTIONS.BODY_WEIGHT_LOGS,
] as const;

export async function exportUserData(): Promise<ServiceResult<string>> {
  try {
    const exportPayload: Record<string, unknown[]> = {};

    for (const col of EXPORT_COLLECTIONS) {
      const { data, error } = await queryDocuments(col);
      if (!error && data) {
        exportPayload[col] = data;
      }
      // Silently skip failed collections — user still gets partial export
    }

    const json = JSON.stringify(exportPayload, null, 2);
    const filename = `pepmax-export-${Date.now()}.json`;
    const fileUri = `${FileSystem.documentDirectory}${filename}`;

    await FileSystem.writeAsStringAsync(fileUri, json, {
      encoding: FileSystem.EncodingType.UTF8,
    });

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
