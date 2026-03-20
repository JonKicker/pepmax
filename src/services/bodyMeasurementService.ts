/**
 * Body Measurement service — log, fetch, and delete comprehensive body measurement snapshots.
 *
 * All circumference values stored in cm. Weight stored in kg.
 * When a measurement includes weight, also upserts into bodyWeight for the weight trend chart.
 */
import { orderBy, limit, where } from 'firebase/firestore';
import {
  COLLECTIONS,
  addDocument,
  queryDocuments,
  deleteDocument,
} from './firebase/firestore';
import { setDocument } from './firebase/firestore';
import { uploadFile, deleteFile } from './firebase/storage';
import type { ServiceResult } from '../types/service';
import type { BodyMeasurement, BodyMeasurementInput } from '../types/bodyMeasurement';
import * as ImageManipulator from 'expo-image-manipulator';

// ─── Write ───────────────────────────────────────────────────────────────────

export async function logMeasurement(
  input: BodyMeasurementInput,
): Promise<ServiceResult<string>> {
  const result = await addDocument<Omit<BodyMeasurementInput, 'id'>>(
    COLLECTIONS.BODY_MEASUREMENTS,
    { ...input },
  );

  // Sync weight to bodyWeight collection if present
  if (result.data && input.weight != null) {
    await setDocument(COLLECTIONS.BODY_WEIGHT, input.date, {
      weight: input.weight,
      displayUnit: input.weightUnit,
      date: input.date,
    });
  }

  return result;
}

// ─── Read ────────────────────────────────────────────────────────────────────

export async function getMeasurementHistory(
  startDate?: string,
): Promise<ServiceResult<BodyMeasurement[]>> {
  const constraints = startDate
    ? [where('date', '>=', startDate), orderBy('date', 'asc')]
    : [orderBy('date', 'asc')];
  return queryDocuments<BodyMeasurement>(COLLECTIONS.BODY_MEASUREMENTS, constraints);
}

export async function getLatestMeasurement(): Promise<ServiceResult<BodyMeasurement | null>> {
  const result = await queryDocuments<BodyMeasurement>(COLLECTIONS.BODY_MEASUREMENTS, [
    orderBy('date', 'desc'),
    limit(1),
  ]);
  if (result.error) return result;
  return { data: result.data?.[0] ?? null, error: null };
}

// ─── Delete ──────────────────────────────────────────────────────────────────

export async function deleteMeasurement(
  id: string,
  photoUrl?: string,
  photoThumbUrl?: string,
): Promise<ServiceResult<void>> {
  // Clean up storage files if present
  if (photoUrl) {
    const path = extractStoragePath(photoUrl);
    if (path) await deleteFile(path);
  }
  if (photoThumbUrl) {
    const path = extractStoragePath(photoThumbUrl);
    if (path) await deleteFile(path);
  }
  return deleteDocument(COLLECTIONS.BODY_MEASUREMENTS, id);
}

// ─── Photo upload ─────────────────────────────────────────────────────────────

export async function uploadMeasurementPhoto(
  date: string,
  uri: string,
  onProgress?: (progress: number) => void,
): Promise<ServiceResult<{ photoUrl: string; photoThumbUrl: string }>> {
  try {
    // Compress full image to 1200px wide
    const fullResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1200 } }],
      { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG },
    );

    // Compress thumbnail to 200px wide
    const thumbResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 200 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
    );

    const photoPath = `bodyMeasurements/${date}/photo.jpg`;
    const thumbPath = `bodyMeasurements/${date}/thumb.jpg`;

    const uploadFull = await uploadFile(photoPath, fullResult.uri, onProgress);
    if (uploadFull.error) return { data: null, error: uploadFull.error };

    const uploadThumb = await uploadFile(thumbPath, thumbResult.uri);
    if (uploadThumb.error) {
      // Rollback full photo
      await deleteFile(photoPath);
      return { data: null, error: uploadThumb.error };
    }

    return {
      data: { photoUrl: uploadFull.data!, photoThumbUrl: uploadThumb.data! },
      error: null,
    };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Extract relative storage path from a Firebase Storage download URL */
function extractStoragePath(url: string): string | null {
  try {
    const match = url.match(/\/o\/(.+?)\?/);
    if (!match) return null;
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}
