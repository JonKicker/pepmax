/**
 * Account service — user data deletion and account deletion.
 *
 * Design notes (for Ray):
 * - deleteAllUserData deletes Firestore data BEFORE Firebase Auth deletion in deleteAccount.
 *   This prevents orphaned data if auth deletion succeeds but data deletion fails.
 * - deleteAccount catches auth/requires-recent-login specifically and returns a descriptive
 *   error so the UI can prompt the user to sign out and sign back in.
 * - All collection deletions are best-effort (errors logged, not thrown) to ensure the
 *   delete flow completes even if individual collections are already empty or inaccessible.
 * - The profile doc is deleted via deleteDocument('profile', 'data') directly since it
 *   has a known fixed ID, not a generated one.
 */
import { deleteUser } from 'firebase/auth';
import { auth } from './firebase/index';
import {
  queryDocuments,
  deleteDocument,
  COLLECTIONS,
} from './firebase/firestore';
import type { ServiceResult } from '../types/service';

// Collections with auto-generated document IDs (queried before deletion)
const QUERYABLE_COLLECTIONS = [
  COLLECTIONS.PEPTIDES,
  COLLECTIONS.DOSES,
  COLLECTIONS.FOOD_LOG,
  COLLECTIONS.FAVORITE_FOODS,
  COLLECTIONS.WORKOUTS,
  COLLECTIONS.CARDIO_SESSIONS,
  COLLECTIONS.CUSTOM_EXERCISES,
  COLLECTIONS.WORKOUT_TEMPLATES,
  COLLECTIONS.WORKOUT_SESSIONS,
  COLLECTIONS.PERSONAL_RECORDS,
  COLLECTIONS.BODY_WEIGHT,
  COLLECTIONS.BODY_WEIGHT_LOGS,
  COLLECTIONS.DASHBOARD_PREFERENCES,
  COLLECTIONS.PROGRESS_PHOTOS,
  COLLECTIONS.SUBSCRIPTION,
  COLLECTIONS.SIDE_EFFECTS,
  COLLECTIONS.AI_INSIGHTS,
  COLLECTIONS.CONSISTENCY,
  COLLECTIONS.CYCLES,
  COLLECTIONS.RECIPES,
  COLLECTIONS.BODY_MEASUREMENTS,
  COLLECTIONS.INVENTORY,
  COLLECTIONS.RECOVERY,      // legacy — kept for account deletion of pre-M16a docs
  COLLECTIONS.RECOVERY_LOG,  // new path — M16a onwards
  COLLECTIONS.BODY_MODEL,    // daily body model snapshots — M20
  COLLECTIONS.RECON_PROTOCOLS,
  COLLECTIONS.EQUIPMENT_PROFILES,
  COLLECTIONS.NUTRITION,
] as const;

/**
 * Delete all Firestore data for the current user.
 * Best-effort: skips collections that fail to read/delete without aborting the whole operation.
 * Does NOT delete the Firebase Auth account.
 */
export async function deleteAllUserData(): Promise<ServiceResult<void>> {
  try {
    // Delete the profile document (fixed known ID)
    await deleteDocument(COLLECTIONS.PROFILE, 'data');

    // Delete all auto-ID documents in all other collections
    for (const col of QUERYABLE_COLLECTIONS) {
      const { data: docs } = await queryDocuments<{ id: string }>(col);
      if (!docs) continue; // collection read failed — skip, best-effort

      for (const docItem of docs) {
        // Best-effort: ignore individual delete failures
        await deleteDocument(col, docItem.id).catch(() => {});
      }
    }

    return { data: undefined, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

/**
 * Permanently delete all user data AND the Firebase Auth account.
 *
 * Order: Firestore data first → auth account second.
 * This ensures no orphaned data if auth deletion fails.
 *
 * Returns a specific error message for auth/requires-recent-login so the
 * UI can instruct the user to sign out and sign back in.
 */
export async function deleteAccount(): Promise<ServiceResult<void>> {
  // Step 1: Delete all Firestore data first
  const deleteDataResult = await deleteAllUserData();
  if (deleteDataResult.error) return deleteDataResult;

  // Step 2: Delete the Firebase Auth account
  const user = auth.currentUser;
  if (!user) return { data: null, error: new Error('No authenticated user.') };

  try {
    await deleteUser(user);
    return { data: undefined, error: null };
  } catch (e) {
    const err = e as Error & { code?: string };
    if (err.code === 'auth/requires-recent-login') {
      return {
        data: null,
        error: new Error(
          'For security, please sign out and sign back in before deleting your account.',
        ),
      };
    }
    return { data: null, error: err };
  }
}
