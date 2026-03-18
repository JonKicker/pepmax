/**
 * Progress Photo service — upload, fetch, delete photo entries.
 *
 * Each entry = one date with up to 3 poses (front/side/back).
 * Photos stored in Firebase Storage; metadata in Firestore.
 */
import { orderBy, limit as firestoreLimit, startAfter, getDocs, query, collection } from 'firebase/firestore';
import * as ImageManipulator from 'expo-image-manipulator';
import {
  COLLECTIONS,
  setDocument,
  getDocument,
  queryDocuments,
  deleteDocument,
} from './firebase/firestore';
import { uploadFile, deleteFile } from './firebase/storage';
import type { ServiceResult } from '../types/service';
import type {
  ProgressPhotoEntry,
  ProgressPhotoInput,
  CapturedPhoto,
  PhotoPose,
  PoseUrls,
} from '../types/bodyTracking';

// ─── Image processing ───────────────────────────────────────────────────────

async function compressImage(uri: string, maxWidth: number): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: maxWidth } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
  );
  return result.uri;
}

// ─── Upload ─────────────────────────────────────────────────────────────────

export type UploadProgress = {
  currentPose: PhotoPose;
  overall: number; // 0–1
};

/**
 * Compress, generate thumbnails, upload all poses, then write Firestore metadata.
 */
export async function uploadProgressPhotos(
  date: string,
  captures: CapturedPhoto[],
  weight?: number,
  note?: string,
  onProgress?: (p: UploadProgress) => void,
): Promise<ServiceResult<ProgressPhotoEntry>> {
  // Track uploaded paths so we can roll back on partial failure
  const uploadedPaths: string[] = [];

  async function rollback() {
    await Promise.allSettled(uploadedPaths.map((p) => deleteFile(p)));
  }

  try {
    const poses: Partial<Record<PhotoPose, PoseUrls>> = {};
    const totalSteps = captures.length * 2; // full + thumb per pose
    let completedSteps = 0;

    for (const capture of captures) {
      // Compress full-size
      const fullUri = await compressImage(capture.uri, 1200);
      const fullPath = `progressPhotos/${date}/${capture.pose}.jpg`;

      if (onProgress) {
        onProgress({ currentPose: capture.pose, overall: completedSteps / totalSteps });
      }

      const fullResult = await uploadFile(fullPath, fullUri);
      if (fullResult.error) {
        await rollback();
        return { data: null, error: fullResult.error };
      }
      uploadedPaths.push(fullPath);
      completedSteps++;

      // Generate and upload thumbnail
      const thumbUri = await compressImage(capture.uri, 200);
      const thumbPath = `progressPhotos/${date}/${capture.pose}_thumb.jpg`;

      if (onProgress) {
        onProgress({ currentPose: capture.pose, overall: completedSteps / totalSteps });
      }

      const thumbResult = await uploadFile(thumbPath, thumbUri);
      if (thumbResult.error) {
        await rollback();
        return { data: null, error: thumbResult.error };
      }
      uploadedPaths.push(thumbPath);
      completedSteps++;

      poses[capture.pose] = {
        fullUrl: fullResult.data!,
        thumbUrl: thumbResult.data!,
      };
    }

    if (onProgress) onProgress({ currentPose: captures[captures.length - 1].pose, overall: 1 });

    // Write Firestore metadata
    const input: Omit<ProgressPhotoInput, 'date'> & { date: string } = {
      date,
      poses,
      ...(weight != null ? { weight } : {}),
      ...(note ? { note } : {}),
    };

    const writeResult = await setDocument(COLLECTIONS.PROGRESS_PHOTOS, date, input);
    if (writeResult.error) {
      await rollback();
      return { data: null, error: writeResult.error };
    }

    // Fetch the written document to return full entry
    const fetchResult = await getDocument<ProgressPhotoEntry>(COLLECTIONS.PROGRESS_PHOTOS, date);
    if (fetchResult.error) return { data: null, error: fetchResult.error };
    return { data: { ...fetchResult.data!, id: date }, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── Read ───────────────────────────────────────────────────────────────────

/**
 * Fetch photo entries ordered by date desc.
 */
export async function getPhotoEntries(
  pageSize = 20,
): Promise<ServiceResult<ProgressPhotoEntry[]>> {
  return queryDocuments<ProgressPhotoEntry>(COLLECTIONS.PROGRESS_PHOTOS, [
    orderBy('date', 'desc'),
    firestoreLimit(pageSize),
  ]);
}

/**
 * Fetch a single photo entry by date.
 */
export async function getPhotoEntry(
  date: string,
): Promise<ServiceResult<ProgressPhotoEntry | null>> {
  return getDocument<ProgressPhotoEntry>(COLLECTIONS.PROGRESS_PHOTOS, date);
}

/**
 * Get all dates that have photos (for comparison picker).
 */
export async function getPhotoDates(): Promise<ServiceResult<string[]>> {
  const result = await queryDocuments<ProgressPhotoEntry>(COLLECTIONS.PROGRESS_PHOTOS, [
    orderBy('date', 'desc'),
  ]);
  if (result.error) return { data: null, error: result.error };
  return { data: (result.data ?? []).map((e) => e.date), error: null };
}

// ─── Delete ─────────────────────────────────────────────────────────────────

/**
 * Delete a photo entry — removes Storage files and Firestore metadata.
 */
export async function deletePhotoEntry(date: string): Promise<ServiceResult<void>> {
  try {
    // First fetch the entry to know which files to delete
    const entryResult = await getDocument<ProgressPhotoEntry>(COLLECTIONS.PROGRESS_PHOTOS, date);
    if (entryResult.error) return { data: null, error: entryResult.error };

    if (entryResult.data) {
      const entry = entryResult.data;
      const poses = Object.keys(entry.poses) as PhotoPose[];

      // Delete storage files (best-effort — don't fail if some are missing)
      await Promise.allSettled(
        poses.flatMap((pose) => [
          deleteFile(`progressPhotos/${date}/${pose}.jpg`),
          deleteFile(`progressPhotos/${date}/${pose}_thumb.jpg`),
        ]),
      );
    }

    // Delete Firestore document
    return deleteDocument(COLLECTIONS.PROGRESS_PHOTOS, date);
  } catch (e) {
    return { data: null, error: e as Error };
  }
}
