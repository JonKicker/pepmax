/**
 * Profile picture service — upload/remove avatar via Firebase Storage.
 *
 * Upload flow:
 *   1. Compress image to 400px-wide JPEG via expo-image-manipulator
 *   2. Upload to users/{uid}/profilePicture/avatar.jpg
 *   3. Update profile doc with download URL
 *   4. Mirror URL to publicProfiles/{uid} via direct Firestore write
 *
 * Deletion flow:
 *   1. Delete from Storage
 *   2. Clear profilePictureUrl from both profile doc and publicProfiles/{uid}
 *
 * Error pattern: ServiceResult<T> — never throws.
 */
import * as ImageManipulator from 'expo-image-manipulator';
import { doc, updateDoc, serverTimestamp, deleteField } from 'firebase/firestore';
import { db, auth } from './firebase/index';
import { uploadFile, deleteFile } from './firebase/storage';
import { updateDocument, COLLECTIONS } from './firebase/firestore';
import { addBreadcrumb } from './errorReporting';
import { analytics, AnalyticsEvent } from './analytics';
import type { ServiceResult } from '../types/service';

const AVATAR_STORAGE_PATH = 'profilePicture/avatar.jpg';
const PUBLIC_PROFILES_COLLECTION = 'publicProfiles';

// ─── Upload ─────────────────────────────────────────────────────────────────

/**
 * Compress and upload a new profile picture.
 * Returns the public download URL on success.
 */
export async function uploadProfilePicture(
  localUri: string,
): Promise<ServiceResult<string>> {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');

    addBreadcrumb('profilePictureService', 'uploadProfilePicture start', { uid });

    // Compress: resize to 400px wide, JPEG quality 0.85
    const compressed = await ImageManipulator.manipulateAsync(
      localUri,
      [{ resize: { width: 400 } }],
      { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG },
    );

    addBreadcrumb('profilePictureService', 'compressed, uploading', { uid });

    const uploadResult = await uploadFile(AVATAR_STORAGE_PATH, compressed.uri);
    if (uploadResult.error || !uploadResult.data) {
      return { data: null, error: uploadResult.error ?? new Error('Upload returned no URL') };
    }

    const downloadUrl = uploadResult.data;

    // Update user profile doc — critical; propagate error on failure
    const profileResult = await updateDocument(COLLECTIONS.PROFILE, 'data', { profilePictureUrl: downloadUrl });
    if (profileResult.error) {
      return { data: null, error: profileResult.error };
    }

    // Mirror to publicProfiles/{uid} via direct Firestore write (root collection)
    addBreadcrumb('profilePictureService', 'mirroring to publicProfiles', { uid });
    const publicRef = doc(db, PUBLIC_PROFILES_COLLECTION, uid);
    await updateDoc(publicRef, {
      profilePictureUrl: downloadUrl,
      updatedAt: serverTimestamp(),
    }).catch(() => {});

    analytics.track(AnalyticsEvent.PROFILE_PICTURE_UPLOADED);

    return { data: downloadUrl, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── Remove ─────────────────────────────────────────────────────────────────

/**
 * Delete the current profile picture and clear it from both docs.
 */
export async function removeProfilePicture(): Promise<ServiceResult<void>> {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');

    addBreadcrumb('profilePictureService', 'removeProfilePicture start', { uid });

    // Delete from Storage — non-fatal if it doesn't exist
    await deleteFile(AVATAR_STORAGE_PATH).catch(() => {});

    // Clear from user profile doc — critical; propagate error on failure
    const profileResult = await updateDocument(COLLECTIONS.PROFILE, 'data', {
      profilePictureUrl: deleteField() as unknown as string,
    });
    if (profileResult.error) {
      return { data: null, error: profileResult.error };
    }

    // Clear from publicProfiles
    const publicRef = doc(db, PUBLIC_PROFILES_COLLECTION, uid);
    await updateDoc(publicRef, {
      profilePictureUrl: deleteField(),
      updatedAt: serverTimestamp(),
    }).catch(() => {});

    analytics.track(AnalyticsEvent.PROFILE_PICTURE_REMOVED);

    return { data: undefined, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}
