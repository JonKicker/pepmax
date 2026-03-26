/**
 * Friend service — CRUD for the friends subcollection.
 *
 * Firestore path: /users/{uid}/friends/{friendId}
 *
 * Every friendship is represented by TWO mirrored docs — one in each user's
 * subcollection — written atomically via writeBatch.
 *
 * Raw SDK paths are used throughout (NOT the user-scoped helpers in firestore.ts)
 * because these writes span multiple users' subcollections.
 *
 * ─── TRUST BOUNDARY WARNING ────────────────────────────────────────────────────
 * Friend status is SOCIAL ONLY. The existing wildcard rule
 * (match /users/{userId}/{document=**}) lets users modify their own friend docs
 * freely. The cross-user rules added in firestore.rules allow the friend to
 * create a "received" pending doc in the target's subcollection.
 *
 * FRIEND STATUS MUST NEVER GATE ACCESS TO PRIVATE DATA without server-side
 * validation. A malicious client could write any value to their own friend doc.
 * If friendship is ever used for data-access decisions, that logic must live in
 * Cloud Functions (Admin SDK) — never trust client-side friend state.
 * ───────────────────────────────────────────────────────────────────────────────
 */
import {
  doc,
  getDoc,
  getDocs,
  writeBatch,
  query,
  collection,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from './firebase/index';
import * as Sentry from '@sentry/react-native';
import { addBreadcrumb } from './errorReporting';
import type { ServiceResult } from '../types/service';
import type { FriendDoc, RankTier } from '../types/social';

// ─── Constants ────────────────────────────────────────────────────────────────

const FRIENDS_COLLECTION = 'friends';

// ─── Internal helpers ─────────────────────────────────────────────────────────

function requireAuth(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');
  return uid;
}

function friendDocRef(ownerUid: string, friendUid: string) {
  return doc(db, 'users', ownerUid, FRIENDS_COLLECTION, friendUid);
}

// ─── sendFriendRequest ────────────────────────────────────────────────────────

/**
 * Sends a friend request from the current user to targetUid.
 *
 * Guards:
 * - Self-friending is blocked.
 * - Checks whether targetUid already sent US a request. If so, AUTO-ACCEPTS both
 *   docs instead of creating duplicates (cross-request resolution).
 * - If a doc already exists in any state, returns early without writing.
 *
 * Atomic: uses writeBatch to write both docs in a single Firestore commit.
 */
export async function sendFriendRequest(
  targetUid: string,
  targetUsername: string,
  targetLevel: number,
  targetTier: RankTier,
): Promise<ServiceResult<void>> {
  try {
    const myUid = requireAuth();

    if (myUid === targetUid) {
      return { data: null, error: new Error('You cannot send a friend request to yourself.') };
    }

    addBreadcrumb('friendService', 'sendFriendRequest', { targetUid });
    Sentry.addBreadcrumb({
      category: 'friendService',
      message: 'sendFriendRequest',
      data: { myUid, targetUid },
      level: 'info',
    });

    // Read the current user's public profile for denormalised name/level/tier
    const myPublicProfileSnap = await getDoc(doc(db, 'publicProfiles', myUid));
    const myProfile = myPublicProfileSnap.exists() ? myPublicProfileSnap.data() : null;
    const myUsername: string = myProfile?.username ?? '';
    const myLevel: number = myProfile?.level ?? 1;
    const myTier: RankTier = myProfile?.tier ?? 'bronze';

    // TODO: TOCTOU race — pre-flight reads are not atomic with the writeBatch commit.
    // Worst case: duplicate pending doc or stale auto-accept (harmless UI inconsistency,
    // not a security breach — Firestore rules enforce received/pending on cross-user creates).
    // Migrate to Cloud Function with transaction when friend count matters for leaderboards.

    // Check whether we already have a doc for this friend (any direction/status)
    const myFriendDocSnap = await getDoc(friendDocRef(myUid, targetUid));
    if (myFriendDocSnap.exists()) {
      // Already in a relationship (pending sent, pending received, or accepted)
      return { data: undefined, error: null };
    }

    // Check whether target already sent us a request
    const theirDocForMeSnap = await getDoc(friendDocRef(targetUid, myUid));
    const theyAlreadySentRequest =
      theirDocForMeSnap.exists() &&
      theirDocForMeSnap.data()?.status === 'pending' &&
      theirDocForMeSnap.data()?.direction === 'sent';

    const batch = writeBatch(db);
    const now = serverTimestamp();

    if (theyAlreadySentRequest) {
      // AUTO-ACCEPT: target already sent us a request — accept both docs atomically
      // Update their doc (sent → accepted)
      batch.update(friendDocRef(targetUid, myUid), {
        status: 'accepted',
        updatedAt: now,
      });
      // Create our accepted doc
      const myDoc: FriendDoc = {
        friendUid: targetUid,
        friendUsername: targetUsername,
        friendLevel: targetLevel,
        friendTier: targetTier,
        status: 'accepted',
        direction: 'received',
        createdAt: now,
        updatedAt: now,
      };
      batch.set(friendDocRef(myUid, targetUid), myDoc);
    } else {
      // Normal path: write a pending request in both subcollections
      const myDoc: FriendDoc = {
        friendUid: targetUid,
        friendUsername: targetUsername,
        friendLevel: targetLevel,
        friendTier: targetTier,
        status: 'pending',
        direction: 'sent',
        createdAt: now,
        updatedAt: now,
      };
      const theirDoc: FriendDoc = {
        friendUid: myUid,
        friendUsername: myUsername,
        friendLevel: myLevel,
        friendTier: myTier,
        status: 'pending',
        direction: 'received',
        createdAt: now,
        updatedAt: now,
      };
      batch.set(friendDocRef(myUid, targetUid), myDoc);
      batch.set(friendDocRef(targetUid, myUid), theirDoc);
    }

    await batch.commit();
    return { data: undefined, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── acceptFriendRequest ──────────────────────────────────────────────────────

/**
 * Accepts an incoming friend request from friendUid.
 * Atomically updates both docs to status: 'accepted'.
 */
export async function acceptFriendRequest(
  friendUid: string,
): Promise<ServiceResult<void>> {
  try {
    const myUid = requireAuth();

    addBreadcrumb('friendService', 'acceptFriendRequest', { friendUid });
    Sentry.addBreadcrumb({
      category: 'friendService',
      message: 'acceptFriendRequest',
      data: { myUid, friendUid },
      level: 'info',
    });

    const now = serverTimestamp();
    const batch = writeBatch(db);

    batch.update(friendDocRef(myUid, friendUid), {
      status: 'accepted',
      updatedAt: now,
    });
    batch.update(friendDocRef(friendUid, myUid), {
      status: 'accepted',
      updatedAt: now,
    });

    await batch.commit();
    return { data: undefined, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── declineFriendRequest ─────────────────────────────────────────────────────

/**
 * Declines an incoming friend request from friendUid.
 * Atomically deletes both docs (clean up — no declined tombstones left behind).
 */
export async function declineFriendRequest(
  friendUid: string,
): Promise<ServiceResult<void>> {
  try {
    const myUid = requireAuth();

    addBreadcrumb('friendService', 'declineFriendRequest', { friendUid });
    Sentry.addBreadcrumb({
      category: 'friendService',
      message: 'declineFriendRequest',
      data: { myUid, friendUid },
      level: 'info',
    });

    const batch = writeBatch(db);
    batch.delete(friendDocRef(myUid, friendUid));
    batch.delete(friendDocRef(friendUid, myUid));

    await batch.commit();
    return { data: undefined, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── removeFriend ─────────────────────────────────────────────────────────────

/**
 * Removes an accepted friend.
 * Atomically deletes both docs.
 */
export async function removeFriend(
  friendUid: string,
): Promise<ServiceResult<void>> {
  try {
    const myUid = requireAuth();

    addBreadcrumb('friendService', 'removeFriend', { friendUid });
    Sentry.addBreadcrumb({
      category: 'friendService',
      message: 'removeFriend',
      data: { myUid, friendUid },
      level: 'info',
    });

    const batch = writeBatch(db);
    batch.delete(friendDocRef(myUid, friendUid));
    batch.delete(friendDocRef(friendUid, myUid));

    await batch.commit();
    return { data: undefined, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── getFriends ───────────────────────────────────────────────────────────────

/**
 * Returns all accepted friends for the current user.
 */
export async function getFriends(): Promise<ServiceResult<FriendDoc[]>> {
  try {
    const myUid = requireAuth();

    addBreadcrumb('friendService', 'getFriends', { myUid });

    const q = query(
      collection(db, 'users', myUid, FRIENDS_COLLECTION),
      where('status', '==', 'accepted'),
    );
    const snap = await getDocs(q);
    const friends = snap.docs.map((d) => d.data() as FriendDoc);
    return { data: friends, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── getPendingRequests ───────────────────────────────────────────────────────

/**
 * Returns pending received friend requests (requests sent TO the current user).
 */
export async function getPendingRequests(): Promise<ServiceResult<FriendDoc[]>> {
  try {
    const myUid = requireAuth();

    addBreadcrumb('friendService', 'getPendingRequests', { myUid });

    const q = query(
      collection(db, 'users', myUid, FRIENDS_COLLECTION),
      where('status', '==', 'pending'),
      where('direction', '==', 'received'),
    );
    const snap = await getDocs(q);
    const requests = snap.docs.map((d) => d.data() as FriendDoc);
    return { data: requests, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── getSentRequests ──────────────────────────────────────────────────────────

/**
 * Returns pending sent friend requests (requests sent BY the current user).
 */
export async function getSentRequests(): Promise<ServiceResult<FriendDoc[]>> {
  try {
    const myUid = requireAuth();

    addBreadcrumb('friendService', 'getSentRequests', { myUid });

    const q = query(
      collection(db, 'users', myUid, FRIENDS_COLLECTION),
      where('status', '==', 'pending'),
      where('direction', '==', 'sent'),
    );
    const snap = await getDocs(q);
    const sent = snap.docs.map((d) => d.data() as FriendDoc);
    return { data: sent, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── getFriendStatus ─────────────────────────────────────────────────────────

/**
 * Returns the FriendDoc for targetUid from the current user's subcollection,
 * or null if no relationship exists.
 */
export async function getFriendStatus(
  targetUid: string,
): Promise<ServiceResult<FriendDoc | null>> {
  try {
    const myUid = requireAuth();

    addBreadcrumb('friendService', 'getFriendStatus', { targetUid });

    const snap = await getDoc(friendDocRef(myUid, targetUid));
    return { data: snap.exists() ? (snap.data() as FriendDoc) : null, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}
