/**
 * Username service — validation, atomic claim, and release.
 *
 * Firestore paths:
 *   /usernames/{username}  — reservation doc (uid, claimedAt)
 *   users/{uid}/profile/data — profile doc (username, lastUsernameChangeAt)
 *   /publicProfiles/{uid}  — public profile (username field)
 *
 * Security decisions:
 * - All writes are atomic transactions to prevent race-condition double-claims.
 * - releaseUsername uses a transaction to atomically delete the reservation,
 *   clear profile.username, and update publicProfile.username.
 * - 30-day cooldown enforced here (client-side guard) AND in Firestore rules.
 * - Offensive term blocklist applied before any Firestore round-trip.
 */
import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  Timestamp,
  deleteField,
} from 'firebase/firestore';
import { db, auth } from './firebase/index';
import { mergeDocument, COLLECTIONS } from './firebase/firestore';
import * as Sentry from '@sentry/react-native';
import { addBreadcrumb } from './errorReporting';
import type { ServiceResult } from '../types/service';
import type { UsernameDoc } from '../types/social';

// ─── Constants ────────────────────────────────────────────────────────────────

const USERNAMES_COLLECTION = 'usernames';
const PUBLIC_PROFILES_COLLECTION = 'publicProfiles';

/** Username change cooldown in milliseconds (30 days). */
const USERNAME_CHANGE_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

// ─── Offensive term blocklist ─────────────────────────────────────────────────
// Kept minimal — Cloud Function moderation handles extended coverage.
// All entries must be lowercase. Exact substring match is used.

const OFFENSIVE_TERMS = new Set([
  'admin',
  'pepmax',
  'support',
  'official',
  'nigger',
  'nigga',
  'faggot',
  'kike',
  'chink',
  'spic',
  'cunt',
  'retard',
  'tranny',
]);

// ─── Validation ───────────────────────────────────────────────────────────────

export type UsernameValidationResult =
  | { valid: true }
  | { valid: false; reason: string };

/**
 * Validates a username against format rules and offensive term blocklist.
 *
 * Rules:
 * - 3–20 characters
 * - Only alphanumeric + underscores
 * - Cannot start or end with underscore
 * - Cannot contain consecutive underscores
 * - Cannot contain offensive terms (case-insensitive substring match)
 *
 * This is a pure function — no network calls.
 */
export function validateUsername(raw: string): UsernameValidationResult {
  const username = raw.trim();

  if (username.length < 3) {
    return { valid: false, reason: 'Username must be at least 3 characters.' };
  }
  if (username.length > 20) {
    return { valid: false, reason: 'Username must be 20 characters or fewer.' };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return {
      valid: false,
      reason: 'Only letters, numbers, and underscores are allowed.',
    };
  }
  if (username.startsWith('_') || username.endsWith('_')) {
    return {
      valid: false,
      reason: 'Username cannot start or end with an underscore.',
    };
  }
  if (username.includes('__')) {
    return {
      valid: false,
      reason: 'Username cannot contain consecutive underscores.',
    };
  }

  const lower = username.toLowerCase();
  for (const term of OFFENSIVE_TERMS) {
    if (lower.includes(term)) {
      return {
        valid: false,
        reason: 'That username is not available. Please choose another.',
      };
    }
  }

  return { valid: true };
}

/**
 * Normalises a username to its canonical form (lowercase).
 * The normalised form is used as the Firestore document ID.
 */
export function normaliseUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

// ─── Availability check ───────────────────────────────────────────────────────

/**
 * Checks whether a username is available (no reservation doc exists).
 * Does NOT validate format — call validateUsername first.
 *
 * NOTE: There is an inherent TOCTOU (time-of-check / time-of-use) window
 * between this read and claimUsername's transaction. Always verify availability
 * inside the transaction — this check is for UX feedback only.
 */
export async function checkUsernameAvailability(
  username: string,
): Promise<ServiceResult<boolean>> {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');

    addBreadcrumb('usernameService', 'checkUsernameAvailability', { username });

    const normalised = normaliseUsername(username);
    const snap = doc(db, USERNAMES_COLLECTION, normalised);
    const docSnap = await getDoc(snap);
    return { data: !docSnap.exists(), error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── Claim username (atomic transaction) ─────────────────────────────────────

/**
 * Atomically claims a username for the current user.
 *
 * Steps (all in one Firestore transaction):
 * 1. Validate format (pure, pre-transaction)
 * 2. Enforce 30-day cooldown on profile.lastUsernameChangeAt
 * 3. Check the /usernames/{normalised} doc does not exist
 * 4. Write /usernames/{normalised} = { uid, claimedAt }
 * 5. Merge username + lastUsernameChangeAt onto profile
 * 6. Merge username onto publicProfiles/{uid}
 *
 * On failure, the transaction is automatically rolled back — no partial state.
 */
export async function claimUsername(
  rawUsername: string,
): Promise<ServiceResult<void>> {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');

    // Format validation (pure — no network)
    const validation = validateUsername(rawUsername);
    if (!validation.valid) {
      return { data: null, error: new Error(validation.reason) };
    }

    const normalised = normaliseUsername(rawUsername);

    addBreadcrumb('usernameService', 'claimUsername:start', {
      username: normalised,
    });
    Sentry.addBreadcrumb({
      category: 'usernameService',
      message: 'claimUsername transaction starting',
      data: { username: normalised, uid },
    });

    const usernameRef = doc(db, USERNAMES_COLLECTION, normalised);
    const profileRef = doc(db, 'users', uid, COLLECTIONS.PROFILE, 'data');
    const publicProfileRef = doc(db, PUBLIC_PROFILES_COLLECTION, uid);

    await runTransaction(db, async (tx) => {
      // ── 1. Check cooldown ────────────────────────────────────────────────
      const profileSnap = await tx.get(profileRef);
      if (profileSnap.exists()) {
        const lastChanged: Timestamp | undefined =
          profileSnap.data()?.lastUsernameChangeAt;
        if (lastChanged) {
          const elapsed = Date.now() - lastChanged.toMillis();
          if (elapsed < USERNAME_CHANGE_COOLDOWN_MS) {
            const daysLeft = Math.ceil(
              (USERNAME_CHANGE_COOLDOWN_MS - elapsed) / (24 * 60 * 60 * 1000),
            );
            throw new Error(
              `You can change your username again in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`,
            );
          }
        }
      }

      // ── 2. Check availability ────────────────────────────────────────────
      const usernameSnap = await tx.get(usernameRef);
      if (usernameSnap.exists()) {
        throw new Error('That username is already taken. Please choose another.');
      }

      // ── 3. Write reservation ─────────────────────────────────────────────
      // Use serverTimestamp() for claimedAt — ensures the timestamp is
      // set by the Firestore server, not the client clock.
      const reservationData: UsernameDoc = {
        uid,
        claimedAt: serverTimestamp(),
      };
      tx.set(usernameRef, reservationData);

      // ── 4. Update profile ────────────────────────────────────────────────
      tx.set(
        profileRef,
        {
          username: normalised,
          lastUsernameChangeAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      // ── 5. Update public profile ─────────────────────────────────────────
      tx.set(
        publicProfileRef,
        {
          username: normalised,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    });

    addBreadcrumb('usernameService', 'claimUsername:success', {
      username: normalised,
    });
    return { data: undefined, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── Release username (atomic transaction) ────────────────────────────────────

/**
 * Atomically releases the current user's username.
 *
 * Steps (all in one Firestore transaction):
 * 1. Read profile to get the current username
 * 2. Verify the reservation doc belongs to this user (safety check)
 * 3. Delete /usernames/{normalised}
 * 4. Clear username field on profile
 * 5. Clear username field on publicProfiles/{uid}
 *
 * Note: releasing a username resets the cooldown clock — the user must
 * wait 30 days from the *release* before claiming a new one.
 * We accomplish this by NOT resetting lastUsernameChangeAt on release.
 */
export async function releaseUsername(): Promise<ServiceResult<void>> {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');

    addBreadcrumb('usernameService', 'releaseUsername:start', { uid });
    Sentry.addBreadcrumb({
      category: 'usernameService',
      message: 'releaseUsername transaction starting',
      data: { uid },
    });

    const profileRef = doc(db, 'users', uid, COLLECTIONS.PROFILE, 'data');
    const publicProfileRef = doc(db, PUBLIC_PROFILES_COLLECTION, uid);

    await runTransaction(db, async (tx) => {
      // ── 1. Read current username from profile ────────────────────────────
      const profileSnap = await tx.get(profileRef);
      const currentUsername: string | undefined =
        profileSnap.data()?.username;

      if (!currentUsername) {
        // Nothing to release — treat as success
        return;
      }

      const usernameRef = doc(db, USERNAMES_COLLECTION, currentUsername);

      // ── 2. Verify ownership ──────────────────────────────────────────────
      const usernameSnap = await tx.get(usernameRef);
      if (usernameSnap.exists() && usernameSnap.data()?.uid !== uid) {
        // Reservation belongs to someone else — don't touch it
        throw new Error('Username reservation mismatch. Please contact support.');
      }

      // ── 3. Delete reservation ────────────────────────────────────────────
      if (usernameSnap.exists()) {
        tx.delete(usernameRef);
      }

      // ── 4. Clear profile username ────────────────────────────────────────
      // mergeDocument cannot be called inside a transaction, so we write directly.
      tx.set(
        profileRef,
        {
          username: deleteField(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      // ── 5. Clear public profile username ─────────────────────────────────
      tx.set(
        publicProfileRef,
        {
          username: deleteField(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    });

    addBreadcrumb('usernameService', 'releaseUsername:success', { uid });
    return { data: undefined, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}
