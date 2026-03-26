/**
 * Challenge service — CRUD for the /challenges top-level collection.
 *
 * Firestore paths:
 *   /challenges/{challengeId}
 *   /challenges/{challengeId}/participants/{uid}
 *
 * Business rules:
 *   - A user may only join a challenge once (checked inside transaction)
 *   - Leaving decrements participantCount via atomic increment(-1)
 *   - Progress updates use increment() for atomic increments (fire-and-forget friendly)
 *   - Username/displayHandle are fetched from publicProfiles before joining
 *
 * SECURITY NOTE:
 *   Progress updates are client-reported in v1. XP award on completion is
 *   validated server-side by the challengeLifecycle Cloud Function.
 */
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  runTransaction,
  Timestamp,
  serverTimestamp,
  increment,
  limit,
  orderBy,
  updateDoc,
} from 'firebase/firestore';
import { db, auth } from './firebase/index';
import { addBreadcrumb } from './errorReporting';
import type { ServiceResult } from '../types/service';
import type { ChallengeDoc, ChallengeParticipantDoc } from '../types/challenges';

// ─── Constants ────────────────────────────────────────────────────────────────

const CHALLENGES = 'challenges';
const PARTICIPANTS = 'participants';
const PUBLIC_PROFILES = 'publicProfiles';

// ─── Internal helpers ─────────────────────────────────────────────────────────

function requireAuth(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');
  return uid;
}

// ─── getActiveChallenges ──────────────────────────────────────────────────────

/**
 * Returns all challenges with status == 'active', ordered by startDate desc.
 */
export async function getActiveChallenges(): Promise<ServiceResult<ChallengeDoc[]>> {
  try {
    requireAuth();

    addBreadcrumb('challengeService', 'getActiveChallenges', {});

    const snap = await getDocs(
      query(
        collection(db, CHALLENGES),
        where('status', '==', 'active'),
        orderBy('startDate', 'desc'),
      ),
    );
    const challenges = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ChallengeDoc);
    return { data: challenges, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── getUpcomingChallenges ────────────────────────────────────────────────────

/**
 * Returns all challenges with status == 'upcoming', ordered by startDate asc.
 */
export async function getUpcomingChallenges(): Promise<ServiceResult<ChallengeDoc[]>> {
  try {
    requireAuth();

    addBreadcrumb('challengeService', 'getUpcomingChallenges', {});

    const snap = await getDocs(
      query(
        collection(db, CHALLENGES),
        where('status', '==', 'upcoming'),
        orderBy('startDate', 'asc'),
      ),
    );
    const challenges = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ChallengeDoc);
    return { data: challenges, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── getCompletedChallenges ───────────────────────────────────────────────────

/**
 * Returns completed challenges ordered by endDate desc, limited to `count`.
 */
export async function getCompletedChallenges(count = 20): Promise<ServiceResult<ChallengeDoc[]>> {
  try {
    requireAuth();

    addBreadcrumb('challengeService', 'getCompletedChallenges', { count });

    const snap = await getDocs(
      query(
        collection(db, CHALLENGES),
        where('status', '==', 'completed'),
        orderBy('endDate', 'desc'),
        limit(count),
      ),
    );
    const challenges = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ChallengeDoc);
    return { data: challenges, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── getChallengeDetail ───────────────────────────────────────────────────────

/**
 * Fetches a single challenge by ID.
 */
export async function getChallengeDetail(challengeId: string): Promise<ServiceResult<ChallengeDoc>> {
  try {
    requireAuth();

    addBreadcrumb('challengeService', 'getChallengeDetail', { challengeId });

    const snap = await getDoc(doc(db, CHALLENGES, challengeId));
    if (!snap.exists()) {
      return { data: null, error: new Error('Challenge not found.') };
    }
    return { data: { id: snap.id, ...snap.data() } as ChallengeDoc, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── joinChallenge ────────────────────────────────────────────────────────────

/**
 * Joins a challenge for the current user.
 *
 * Steps:
 * 1. Fetch the user's public profile for username/displayHandle (outside transaction).
 * 2. Inside a runTransaction:
 *    a. Check the participant doc — reject if already joined.
 *    b. Create participant doc at /challenges/{id}/participants/{uid}.
 *    c. Increment participantCount on the challenge doc atomically.
 */
export async function joinChallenge(challengeId: string): Promise<ServiceResult<void>> {
  try {
    const uid = requireAuth();

    addBreadcrumb('challengeService', 'joinChallenge', { uid, challengeId });

    // Fetch public profile outside transaction (reads in transactions must use tx.get).
    // KNOWN DENORMALIZATION: username/displayHandle are copied into each participant doc
    // at join time and will become stale if the user later changes their username.
    // Accepted trade-off for v1 (no real-time rename fan-out). A Cloud Function should
    // propagate username changes to participant docs in a future phase.
    const profileSnap = await getDoc(doc(db, PUBLIC_PROFILES, uid));
    const profileData = profileSnap.exists() ? profileSnap.data() : null;
    const username: string = profileData?.username ?? '';
    const displayHandle: string = profileData?.displayHandle ?? '';

    await runTransaction(db, async (tx) => {
      const participantRef = doc(db, CHALLENGES, challengeId, PARTICIPANTS, uid);
      const participantSnap = await tx.get(participantRef);

      if (participantSnap.exists()) {
        throw new Error('You have already joined this challenge.');
      }

      const challengeRef = doc(db, CHALLENGES, challengeId);
      const now = serverTimestamp() as unknown as Timestamp;

      const participantDoc: Omit<ChallengeParticipantDoc, 'completedAt'> = {
        uid,
        username,
        displayHandle,
        progress: 0,
        joinedAt: now,
      };

      tx.set(participantRef, participantDoc);
      tx.update(challengeRef, {
        participantCount: increment(1),
        updatedAt: now,
      });
    });

    return { data: undefined, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── leaveChallenge ───────────────────────────────────────────────────────────

/**
 * Removes the current user from a challenge.
 *
 * Uses runTransaction to guard against race conditions: reads the participant
 * doc inside the transaction first and returns early (without decrementing) if
 * it no longer exists, preventing a spurious participantCount undercount.
 */
export async function leaveChallenge(challengeId: string): Promise<ServiceResult<void>> {
  try {
    const uid = requireAuth();

    addBreadcrumb('challengeService', 'leaveChallenge', { uid, challengeId });

    const participantRef = doc(db, CHALLENGES, challengeId, PARTICIPANTS, uid);
    const challengeRef = doc(db, CHALLENGES, challengeId);

    await runTransaction(db, async (tx) => {
      const participantSnap = await tx.get(participantRef);

      // If the participant doc is gone (e.g. already left), bail early to
      // avoid decrementing participantCount on a non-existent entry.
      if (!participantSnap.exists()) return;

      tx.delete(participantRef);
      tx.update(challengeRef, {
        participantCount: increment(-1),
        updatedAt: serverTimestamp(),
      });
    });

    return { data: undefined, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── getChallengeParticipants ─────────────────────────────────────────────────

/**
 * Returns the top participants for a challenge, ordered by progress desc.
 */
export async function getChallengeParticipants(
  challengeId: string,
  count = 50,
): Promise<ServiceResult<ChallengeParticipantDoc[]>> {
  try {
    requireAuth();

    addBreadcrumb('challengeService', 'getChallengeParticipants', { challengeId, count });

    const snap = await getDocs(
      query(
        collection(db, CHALLENGES, challengeId, PARTICIPANTS),
        orderBy('progress', 'desc'),
        limit(count),
      ),
    );
    const participants = snap.docs.map((d) => d.data() as ChallengeParticipantDoc);
    return { data: participants, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── getMyProgress ────────────────────────────────────────────────────────────

/**
 * Returns the current user's participant doc for a challenge.
 * Returns null (not an error) if the user has not joined.
 */
export async function getMyProgress(
  challengeId: string,
): Promise<ServiceResult<ChallengeParticipantDoc | null>> {
  try {
    const uid = requireAuth();

    addBreadcrumb('challengeService', 'getMyProgress', { uid, challengeId });

    const snap = await getDoc(doc(db, CHALLENGES, challengeId, PARTICIPANTS, uid));
    if (!snap.exists()) {
      return { data: null, error: null };
    }
    return { data: snap.data() as ChallengeParticipantDoc, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── updateChallengeProgress ──────────────────────────────────────────────────

/**
 * Increments the current user's progress in a challenge.
 *
 * Uses Firestore increment() for atomicity. Fire-and-forget friendly.
 */
export async function updateChallengeProgress(
  challengeId: string,
  progressDelta: number,
): Promise<ServiceResult<void>> {
  if (progressDelta <= 0) {
    return { data: null, error: new Error('Progress delta must be positive') };
  }

  try {
    const uid = requireAuth();

    addBreadcrumb('challengeService', 'updateChallengeProgress', { uid, challengeId, progressDelta });

    const participantRef = doc(db, CHALLENGES, challengeId, PARTICIPANTS, uid);
    await updateDoc(participantRef, {
      progress: increment(progressDelta),
    });

    return { data: undefined, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── getMyActiveChallengeIds ──────────────────────────────────────────────────

/**
 * Returns the IDs of active challenges the current user has joined.
 * Used by progressCoordinator to know which challenges to update.
 */
export async function getMyActiveChallengeIds(): Promise<ServiceResult<string[]>> {
  try {
    const uid = requireAuth();

    addBreadcrumb('challengeService', 'getMyActiveChallengeIds', { uid });

    // Get all active challenge IDs
    const activeChallengesSnap = await getDocs(
      query(
        collection(db, CHALLENGES),
        where('status', '==', 'active'),
      ),
    );

    if (activeChallengesSnap.empty) {
      return { data: [], error: null };
    }

    // Check which ones the user has joined
    const joinedIds: string[] = [];
    await Promise.all(
      activeChallengesSnap.docs.map(async (challengeDoc) => {
        const participantSnap = await getDoc(
          doc(db, CHALLENGES, challengeDoc.id, PARTICIPANTS, uid),
        );
        if (participantSnap.exists()) {
          joinedIds.push(challengeDoc.id);
        }
      }),
    );

    return { data: joinedIds, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}
