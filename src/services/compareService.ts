/**
 * Compare service — privacy settings + cross-user score reads.
 *
 * Firestore paths:
 *   users/{uid}/settings/comparePrivacy        — privacy toggles + blocked user list
 *   userStats/{uid}/compareScores/current      — Cloud Function-computed metrics
 *
 * compareScores lives at a TOP-LEVEL collection (userStats/) rather than inside
 * users/{uid}/ so that the wildcard rule `match /users/{uid}/{document=**}` does
 * NOT grant the document owner client-side write access. In Firestore, access is
 * granted if ANY matching rule allows it — a narrower `allow write: if false` rule
 * inside the users hierarchy cannot override the wildcard. Moving to a separate
 * top-level collection is the only clean solution to prevent score spoofing.
 *
 * All functions return ServiceResult<T> and never throw.
 *
 * ─── BLOCK ENFORCEMENT NOTE ─────────────────────────────────────────────────
 * Block checking (isUserBlocked / getCompareScoresForUser) is CLIENT-SIDE ONLY.
 * A determined client can bypass by reading Firestore directly.
 * This is a known v1 limitation. Acceptable because compareScores contains
 * aggregated fitness metrics (not raw sensitive data), and scores are
 * computed server-side so clients cannot fabricate values.
 * Server-side enforcement via Cloud Functions is tracked for v2.
 * ────────────────────────────────────────────────────────────────────────────
 */
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from './firebase/index';
import { COLLECTIONS } from './firebase/firestore';
import { addBreadcrumb } from './errorReporting';
import { analytics, AnalyticsEvent } from './analytics';
import type { ServiceResult } from '../types/service';
import type { ComparePrivacy, CompareScores } from '../types/compare';
import { DEFAULT_COMPARE_PRIVACY } from '../types/compare';

// ─── Constants ────────────────────────────────────────────────────────────────

const COMPARE_PRIVACY_DOC = 'comparePrivacy';
const COMPARE_SCORES_DOC = 'current';

// ─── Internal helpers ─────────────────────────────────────────────────────────

function requireAuth(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');
  return uid;
}

function comparePrivacyRef(uid: string) {
  return doc(db, 'users', uid, COLLECTIONS.SETTINGS, COMPARE_PRIVACY_DOC);
}

function compareScoresRef(uid: string) {
  // userStats/{uid}/compareScores/current — top-level collection so the
  // users/{uid}/{document=**} wildcard cannot grant client write access.
  return doc(db, COLLECTIONS.USER_STATS, uid, 'compareScores', COMPARE_SCORES_DOC);
}

// ─── getComparePrivacy ────────────────────────────────────────────────────────

/**
 * Reads the current user's compare privacy settings.
 * If the document doesn't exist yet, creates it with defaults and returns them.
 */
export async function getComparePrivacy(): Promise<ServiceResult<ComparePrivacy>> {
  try {
    const uid = requireAuth();
    addBreadcrumb('compareService', 'getComparePrivacy', { uid });

    const ref = comparePrivacyRef(uid);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      return { data: snap.data() as ComparePrivacy, error: null };
    }

    // First access — create with defaults
    const defaults: ComparePrivacy = {
      ...DEFAULT_COMPARE_PRIVACY,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(ref, defaults);
    return { data: defaults, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── saveComparePrivacy ───────────────────────────────────────────────────────

/**
 * Fully replaces the current user's compare privacy settings.
 * Used when saving from the settings screen after a toggle change.
 */
export async function saveComparePrivacy(
  privacy: Omit<ComparePrivacy, 'createdAt' | 'updatedAt'>,
): Promise<ServiceResult<void>> {
  try {
    const uid = requireAuth();
    addBreadcrumb('compareService', 'saveComparePrivacy', { uid });

    const ref = comparePrivacyRef(uid);
    await setDoc(
      ref,
      {
        ...privacy,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    analytics.track(AnalyticsEvent.COMPARE_PRIVACY_SAVED);
    return { data: undefined, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── blockUser ────────────────────────────────────────────────────────────────

/**
 * Adds targetUid to the current user's blockedUsers list.
 * Uses arrayUnion so duplicate additions are idempotent.
 */
export async function blockUser(targetUid: string): Promise<ServiceResult<void>> {
  try {
    const uid = requireAuth();

    if (uid === targetUid) {
      return { data: null, error: new Error('Cannot block yourself') };
    }

    addBreadcrumb('compareService', 'blockUser', { uid, targetUid });

    const ref = comparePrivacyRef(uid);
    await updateDoc(ref, {
      blockedUsers: arrayUnion(targetUid),
      updatedAt: serverTimestamp(),
    });

    analytics.track(AnalyticsEvent.COMPARE_USER_BLOCKED, { targetUid });
    return { data: undefined, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── unblockUser ──────────────────────────────────────────────────────────────

/**
 * Removes targetUid from the current user's blockedUsers list.
 * Uses arrayRemove — idempotent if the uid is not present.
 */
export async function unblockUser(targetUid: string): Promise<ServiceResult<void>> {
  try {
    const uid = requireAuth();
    addBreadcrumb('compareService', 'unblockUser', { uid, targetUid });

    const ref = comparePrivacyRef(uid);
    await updateDoc(ref, {
      blockedUsers: arrayRemove(targetUid),
      updatedAt: serverTimestamp(),
    });

    analytics.track(AnalyticsEvent.COMPARE_USER_UNBLOCKED, { targetUid });
    return { data: undefined, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── isUserBlocked ────────────────────────────────────────────────────────────

/**
 * Returns true if targetUid is in the current user's blockedUsers list.
 *
 * CLIENT-SIDE ONLY — see block enforcement note at top of file.
 */
export async function isUserBlocked(targetUid: string): Promise<ServiceResult<boolean>> {
  try {
    const result = await getComparePrivacy();
    if (result.error) return { data: null, error: result.error };

    const blocked = (result.data!.blockedUsers ?? []).includes(targetUid);
    return { data: blocked, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── getMyCompareScores ───────────────────────────────────────────────────────

/**
 * Reads the current user's own compareScores doc.
 * Returns null (not an error) if the Cloud Function hasn't run yet.
 */
export async function getMyCompareScores(): Promise<ServiceResult<CompareScores | null>> {
  try {
    const uid = requireAuth();
    addBreadcrumb('compareService', 'getMyCompareScores', { uid });

    const snap = await getDoc(compareScoresRef(uid));
    return { data: snap.exists() ? (snap.data() as CompareScores) : null, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── getCompareScoresForUser ──────────────────────────────────────────────────

/**
 * Reads compareScores for a target user.
 *
 * Uses raw Firestore SDK doc() — NOT the user-scoped helper — because
 * we need to read users/{targetUid}/stats/compareScores, which is outside
 * the current user's path.
 *
 * BLOCK CHECK: performs a client-side block check before reading.
 * If the current user has blocked targetUid, returns an error.
 * See block enforcement note at top of file for v1 limitations.
 *
 * Returns null data (not an error) if the target has no scores yet or
 * if the target has compareEnabled = false (scores not written by CF).
 */
export async function getCompareScoresForUser(
  targetUid: string,
): Promise<ServiceResult<CompareScores | null>> {
  try {
    requireAuth(); // Ensure caller is authenticated before any cross-user read

    // Client-side block check before fetching target's scores
    const blockedResult = await isUserBlocked(targetUid);
    if (blockedResult.error) return { data: null, error: blockedResult.error };
    if (blockedResult.data) {
      return { data: null, error: new Error('This user is blocked') };
    }

    addBreadcrumb('compareService', 'getCompareScoresForUser', { targetUid });

    // Raw SDK path — bypasses the user-scoped userDoc() helper intentionally
    const ref = compareScoresRef(targetUid);
    const snap = await getDoc(ref);

    return { data: snap.exists() ? (snap.data() as CompareScores) : null, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}
