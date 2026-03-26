/**
 * duelService — CRUD for the /duels top-level collection.
 *
 * Duels are 1-vs-1 competitions between two users on a specific metric
 * over 1 or 2 weeks.
 *
 * SECURITY NOTE — progress spoofing (v1 known risk):
 *   updateMyDuelProgress is called by the client after XP-earning actions.
 *   The progress delta is determined client-side and therefore can be spoofed
 *   by a malicious client. In v1 this is accepted because:
 *     (a) Firestore rules prevent users from updating the opponent's field.
 *     (b) The duel metric is social/competitive only — no real-world value at stake.
 *     (c) The progressCoordinator derives deltas from the same XP events that
 *         are also written to the server-side xpLog (auditable post-hoc).
 *   In v2, updateMyDuelProgress should be replaced by a Cloud Function that
 *   reads the xpLog and computes progress server-side.
 *
 * FIRESTORE RULES SPEC (for firestore.rules):
 *   match /duels/{duelId} {
 *     // Only participants can read
 *     allow read: if request.auth.uid == resource.data.challengerUid
 *                   || request.auth.uid == resource.data.opponentUid;
 *
 *     // Only challenger can create
 *     allow create: if request.auth.uid == request.resource.data.challengerUid
 *                     && request.resource.data.status == 'pending'
 *                     && request.resource.data.challengerProgress == 0
 *                     && request.resource.data.opponentProgress == 0
 *                     && request.resource.data.winnerId == null;
 *
 *     // opponentUid can accept/decline (pending → active/declined)
 *     // Neither can write winnerId — only Cloud Function (Admin SDK)
 *     // Neither can modify the other's progress field
 *     allow update: if (
 *       // Opponent accepting/declining
 *       (request.auth.uid == resource.data.opponentUid
 *         && resource.data.status == 'pending'
 *         && request.resource.data.status in ['active', 'declined']
 *         && request.resource.data.challengerProgress == resource.data.challengerProgress
 *         && request.resource.data.opponentProgress == resource.data.opponentProgress
 *         && request.resource.data.winnerId == resource.data.winnerId)
 *       ||
 *       // Challenger updating own progress
 *       (request.auth.uid == resource.data.challengerUid
 *         && resource.data.status == 'active'
 *         && request.resource.data.status == 'active'
 *         && request.resource.data.opponentProgress == resource.data.opponentProgress
 *         && request.resource.data.winnerId == resource.data.winnerId)
 *       ||
 *       // Opponent updating own progress
 *       (request.auth.uid == resource.data.opponentUid
 *         && resource.data.status == 'active'
 *         && request.resource.data.status == 'active'
 *         && request.resource.data.challengerProgress == resource.data.challengerProgress
 *         && request.resource.data.winnerId == resource.data.winnerId)
 *     );
 *
 *     allow delete: if false;
 *   }
 */
import {
  doc,
  getDoc,
  getDocs,
  addDoc,
  collection,
  query,
  where,
  orderBy,
  runTransaction,
  serverTimestamp,
  increment,
  Timestamp,
} from 'firebase/firestore';
import { db, auth } from './firebase/index';
import { addBreadcrumb } from './errorReporting';
import type { ServiceResult } from '../types/service';
import type { DuelDoc, DuelMetric, DuelStatus } from '../types/challenges';

// ─── Constants ────────────────────────────────────────────────────────────────

const DUELS = 'duels';
const PUBLIC_PROFILES = 'publicProfiles';

// ─── Internal helpers ─────────────────────────────────────────────────────────

function requireAuth(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');
  return uid;
}

function duelRef(duelId: string) {
  return doc(db, DUELS, duelId);
}

function snapToDuel(id: string, data: Record<string, unknown>): DuelDoc {
  return { id, ...(data as Omit<DuelDoc, 'id'>) };
}

// ─── createDuel ───────────────────────────────────────────────────────────────

/**
 * Creates a pending duel where the current user is the challenger.
 *
 * Fetches both participants' usernames from publicProfiles.
 * Self-duel is blocked.
 *
 * NOTE: Push notifications are NOT sent here — notification wiring is a
 * separate concern (Cloud Function on duel doc create).
 *
 * Returns the new duel document ID.
 */
export async function createDuel(
  opponentUid: string,
  metric: DuelMetric,
  durationWeeks: 1 | 2,
): Promise<ServiceResult<string>> {
  try {
    const challengerUid = requireAuth();

    if (challengerUid === opponentUid) {
      return { data: null, error: new Error('You cannot duel yourself.') };
    }

    addBreadcrumb('duelService', 'createDuel', { opponentUid, metric, durationWeeks });

    // Fetch usernames from publicProfiles.
    // KNOWN DENORMALIZATION: challengerUsername and opponentUsername are snapshotted
    // at duel-creation time and will become stale if either user later renames.
    // Accepted trade-off for v1; a Cloud Function should fan out username changes in
    // a future phase.
    const [challengerSnap, opponentSnap] = await Promise.all([
      getDoc(doc(db, PUBLIC_PROFILES, challengerUid)),
      getDoc(doc(db, PUBLIC_PROFILES, opponentUid)),
    ]);

    const challengerUsername: string = challengerSnap.exists()
      ? (challengerSnap.data().username ?? '')
      : '';
    const opponentUsername: string = opponentSnap.exists()
      ? (opponentSnap.data().username ?? '')
      : '';

    const now = serverTimestamp();

    const duelData = {
      challengerUid,
      opponentUid,
      challengerUsername,
      opponentUsername,
      metric,
      durationWeeks,
      status: 'pending' as DuelStatus,
      challengerProgress: 0,
      opponentProgress: 0,
      winnerId: null,
      startDate: null,
      endDate: null,
      createdAt: now,
      updatedAt: now,
    };

    addBreadcrumb('duelService', 'createDuel:write', { challengerUid, opponentUid });
    const docRef = await addDoc(collection(db, DUELS), duelData);

    return { data: docRef.id, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── acceptDuel ───────────────────────────────────────────────────────────────

/**
 * Accepts a pending duel.
 *
 * Transaction guards:
 *   - Caller must be the opponentUid
 *   - Duel must be in 'pending' status
 *
 * Sets status to 'active', sets startDate to now, endDate to
 * startDate + durationWeeks * 7 days.
 */
export async function acceptDuel(duelId: string): Promise<ServiceResult<void>> {
  try {
    const myUid = requireAuth();

    addBreadcrumb('duelService', 'acceptDuel', { duelId });

    await runTransaction(db, async (tx) => {
      const ref = duelRef(duelId);
      const snap = await tx.get(ref);

      if (!snap.exists()) throw new Error('Duel not found.');

      const data = snap.data() as Omit<DuelDoc, 'id'>;

      if (data.opponentUid !== myUid) {
        throw new Error('Only the opponent can accept a duel.');
      }
      if (data.status !== 'pending') {
        throw new Error(`Cannot accept a duel with status '${data.status}'.`);
      }

      const now = Timestamp.now();
      const endMs = now.toMillis() + data.durationWeeks * 7 * 24 * 60 * 60 * 1000;
      const endDate = Timestamp.fromMillis(endMs);

      tx.update(ref, {
        status: 'active',
        startDate: now,
        endDate,
        updatedAt: serverTimestamp(),
      });
    });

    return { data: undefined, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── declineDuel ──────────────────────────────────────────────────────────────

/**
 * Declines a pending duel.
 *
 * Transaction guards:
 *   - Caller must be the opponentUid
 *   - Duel must be in 'pending' status
 */
export async function declineDuel(duelId: string): Promise<ServiceResult<void>> {
  try {
    const myUid = requireAuth();

    addBreadcrumb('duelService', 'declineDuel', { duelId });

    await runTransaction(db, async (tx) => {
      const ref = duelRef(duelId);
      const snap = await tx.get(ref);

      if (!snap.exists()) throw new Error('Duel not found.');

      const data = snap.data() as Omit<DuelDoc, 'id'>;

      if (data.opponentUid !== myUid) {
        throw new Error('Only the opponent can decline a duel.');
      }
      if (data.status !== 'pending') {
        throw new Error(`Cannot decline a duel with status '${data.status}'.`);
      }

      tx.update(ref, {
        status: 'declined',
        updatedAt: serverTimestamp(),
      });
    });

    return { data: undefined, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── getMyDuels ───────────────────────────────────────────────────────────────

/**
 * Returns all duels where the current user is either challenger or opponent.
 *
 * Firestore does not support OR queries across different fields, so we run
 * two separate queries and merge the results client-side.
 *
 * Optional status filter narrows both queries.
 * Results are sorted by createdAt descending.
 */
export async function getMyDuels(status?: DuelStatus): Promise<ServiceResult<DuelDoc[]>> {
  try {
    const myUid = requireAuth();

    addBreadcrumb('duelService', 'getMyDuels', { myUid, status });

    const duelsCol = collection(db, DUELS);

    const challengerConstraints = status
      ? [where('challengerUid', '==', myUid), where('status', '==', status), orderBy('createdAt', 'desc')]
      : [where('challengerUid', '==', myUid), orderBy('createdAt', 'desc')];

    const opponentConstraints = status
      ? [where('opponentUid', '==', myUid), where('status', '==', status), orderBy('createdAt', 'desc')]
      : [where('opponentUid', '==', myUid), orderBy('createdAt', 'desc')];

    const [challengerSnap, opponentSnap] = await Promise.all([
      getDocs(query(duelsCol, ...challengerConstraints)),
      getDocs(query(duelsCol, ...opponentConstraints)),
    ]);

    const seen = new Set<string>();
    const duels: DuelDoc[] = [];

    for (const d of challengerSnap.docs) {
      if (!seen.has(d.id)) {
        seen.add(d.id);
        duels.push(snapToDuel(d.id, d.data()));
      }
    }
    for (const d of opponentSnap.docs) {
      if (!seen.has(d.id)) {
        seen.add(d.id);
        duels.push(snapToDuel(d.id, d.data()));
      }
    }

    // Sort merged results by createdAt descending
    // Guard against non-Timestamp values (e.g. serverTimestamp sentinels in tests)
    duels.sort((a, b) => {
      const aMs = typeof (a.createdAt as any)?.toMillis === 'function'
        ? (a.createdAt as Timestamp).toMillis()
        : 0;
      const bMs = typeof (b.createdAt as any)?.toMillis === 'function'
        ? (b.createdAt as Timestamp).toMillis()
        : 0;
      return bMs - aMs;
    });

    return { data: duels, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── getDuelDetail ────────────────────────────────────────────────────────────

/**
 * Fetches a single duel document by ID.
 */
export async function getDuelDetail(duelId: string): Promise<ServiceResult<DuelDoc>> {
  try {
    requireAuth();

    addBreadcrumb('duelService', 'getDuelDetail', { duelId });

    const snap = await getDoc(duelRef(duelId));
    if (!snap.exists()) {
      return { data: null, error: new Error('Duel not found.') };
    }

    return { data: snapToDuel(snap.id, snap.data()), error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── updateMyDuelProgress ────────────────────────────────────────────────────

/**
 * Increments the current user's own progress field in a duel.
 *
 * Transaction guards:
 *   - Duel must be 'active'
 *   - Caller must be a participant (challenger or opponent)
 *   - Only the caller's own field is updated — never the opponent's
 *
 * SECURITY NOTE: progressDelta is client-supplied (v1 known risk).
 * See module-level comment for full rationale.
 */
export async function updateMyDuelProgress(
  duelId: string,
  progressDelta: number,
): Promise<ServiceResult<void>> {
  if (progressDelta <= 0) {
    return { data: null, error: new Error('Progress delta must be positive') };
  }

  try {
    const myUid = requireAuth();

    addBreadcrumb('duelService', 'updateMyDuelProgress', { duelId, progressDelta });

    await runTransaction(db, async (tx) => {
      const ref = duelRef(duelId);
      const snap = await tx.get(ref);

      if (!snap.exists()) throw new Error('Duel not found.');

      const data = snap.data() as Omit<DuelDoc, 'id'>;

      if (data.status !== 'active') {
        throw new Error(`Cannot update progress on a duel with status '${data.status}'.`);
      }

      if (data.challengerUid === myUid) {
        tx.update(ref, {
          challengerProgress: increment(progressDelta),
          updatedAt: serverTimestamp(),
        });
      } else if (data.opponentUid === myUid) {
        tx.update(ref, {
          opponentProgress: increment(progressDelta),
          updatedAt: serverTimestamp(),
        });
      } else {
        throw new Error('You are not a participant in this duel.');
      }
    });

    return { data: undefined, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── getActiveDuelIds ─────────────────────────────────────────────────────────

/**
 * Returns IDs of all active duels where the current user is a participant.
 *
 * Used by progressCoordinator to fan out progress updates.
 * Two queries merged client-side (no Firestore OR across fields).
 */
export async function getActiveDuelIds(): Promise<ServiceResult<string[]>> {
  try {
    const myUid = requireAuth();

    addBreadcrumb('duelService', 'getActiveDuelIds', { myUid });

    const duelsCol = collection(db, DUELS);

    const [challengerSnap, opponentSnap] = await Promise.all([
      getDocs(
        query(duelsCol, where('challengerUid', '==', myUid), where('status', '==', 'active')),
      ),
      getDocs(
        query(duelsCol, where('opponentUid', '==', myUid), where('status', '==', 'active')),
      ),
    ]);

    const ids = new Set<string>();
    for (const d of challengerSnap.docs) ids.add(d.id);
    for (const d of opponentSnap.docs) ids.add(d.id);

    return { data: Array.from(ids), error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}
