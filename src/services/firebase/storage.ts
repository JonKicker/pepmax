/**
 * Firebase Storage helpers — upload, delete, get URL.
 *
 * Error pattern: ServiceResult<T> — same as firestore.ts. Never throws.
 */
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage, auth } from './index';
import type { ServiceResult } from '../../types/service';

function requireAuth(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Storage operation attempted without authenticated user');
  return uid;
}

/**
 * Upload a file from a local URI to Firebase Storage.
 * @param path - Storage path relative to user root (e.g. "progressPhotos/2026-03-18/front.jpg")
 * @param uri - Local file URI (file:// or content://)
 * @param onProgress - Optional callback with upload percentage (0–1)
 * @returns Download URL on success.
 */
export async function uploadFile(
  path: string,
  uri: string,
  onProgress?: (progress: number) => void,
): Promise<ServiceResult<string>> {
  try {
    const uid = requireAuth();
    const storageRef = ref(storage, `users/${uid}/${path}`);

    // Fetch the file as a blob from the local URI
    const response = await fetch(uri);
    const blob = await response.blob();

    return await new Promise<ServiceResult<string>>((resolve) => {
      const task = uploadBytesResumable(storageRef, blob);

      task.on(
        'state_changed',
        (snapshot) => {
          if (onProgress) {
            onProgress(snapshot.bytesTransferred / snapshot.totalBytes);
          }
        },
        (error) => {
          resolve({ data: null, error });
        },
        async () => {
          const url = await getDownloadURL(task.snapshot.ref);
          resolve({ data: url, error: null });
        },
      );
    });
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

/**
 * Delete a file from Firebase Storage.
 * @param path - Storage path relative to user root.
 */
export async function deleteFile(path: string): Promise<ServiceResult<void>> {
  try {
    const uid = requireAuth();
    const storageRef = ref(storage, `users/${uid}/${path}`);
    await deleteObject(storageRef);
    return { data: undefined, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}
