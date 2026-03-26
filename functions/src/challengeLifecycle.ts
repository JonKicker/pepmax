/**
 * challengeLifecycle — scheduled Cloud Function for challenge status transitions.
 *
 * Runs every hour. Two transitions:
 *
 *   upcoming → active:
 *     Queries challenges where status == 'upcoming' AND startDate <= now.
 *     Sets status to 'active'.
 *
 *   active → completed:
 *     Queries challenges where status == 'active' AND endDate <= now.
 *     Sets status to 'completed'.
 *     For completed challenges: queries all participants who met targetValue,
 *     awards XP via admin SDK writes to users/{uid}/xpLog + publicProfiles update.
 *
 * BATCH WRITE STRATEGY:
 *   Firestore batches are capped at 500 operations.
 *   We chunk writes into batches of 500 and commit sequentially.
 *   Partial failure is logged and continues (best-effort; next hourly run will re-sync).
 *
 * IDEMPOTENCY:
 *   Status transitions use where('status', '==', 'upcoming/active') so
 *   re-running on an already-transitioned challenge is a no-op.
 *   XP awards check for completedAt on participant docs to prevent double-awards.
 */
import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';

const CHALLENGES = 'challenges';
const PARTICIPANTS = 'participants';
const PUBLIC_PROFILES = 'publicProfiles';
const USERS = 'users';
const XP_LOG = 'xpLog';
const DUELS = 'duels';
const PROFILE = 'profile';

// ─── Duel XP reward constants ─────────────────────────────────────────────────

const DUEL_WIN_XP = 100;
const DUEL_TIE_XP = 50;

// ─── Batch write helper ───────────────────────────────────────────────────────

/**
 * Commit an array of [docRef, data, merge] triples using chunked 500-op batches.
 */
async function commitInBatches(
  db: admin.firestore.Firestore,
  writes: Array<{
    ref: admin.firestore.DocumentReference;
    data: Record<string, unknown>;
    merge?: boolean;
  }>,
): Promise<void> {
  const BATCH_SIZE = 500;
  for (let i = 0; i < writes.length; i += BATCH_SIZE) {
    const chunk = writes.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    for (const { ref, data, merge } of chunk) {
      if (merge) {
        batch.set(ref, data, { merge: true });
      } else {
        batch.set(ref, data);
      }
    }
    try {
      await batch.commit();
    } catch (err) {
      console.error(
        `[challengeLifecycle] Batch commit failed for chunk starting at ${i}:`,
        err,
      );
      // Continue to next batch — best-effort
    }
  }
}

// ─── Status transition logic ──────────────────────────────────────────────────

/**
 * Transitions upcoming → active for challenges whose startDate has passed.
 */
async function transitionUpcomingToActive(
  db: admin.firestore.Firestore,
  now: admin.firestore.Timestamp,
): Promise<number> {
  const snap = await db
    .collection(CHALLENGES)
    .where('status', '==', 'upcoming')
    .where('startDate', '<=', now)
    .get();

  if (snap.empty) return 0;

  const writes = snap.docs.map((d) => ({
    ref: d.ref,
    data: {
      status: 'active',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    } as Record<string, unknown>,
    merge: true,
  }));

  await commitInBatches(db, writes);
  console.log(`[challengeLifecycle] Activated ${snap.size} challenges.`);
  return snap.size;
}

/**
 * Transitions active → completed for challenges whose endDate has passed.
 * Also awards XP to participants who met the targetValue.
 *
 * ORDERING GUARANTEE (partial-failure safety):
 *   1. All XP award batches are committed first.
 *   2. Only after all XP batches succeed, a final batch sets each challenge
 *      status to 'completed'.
 *   This way, if the XP batches fail, the challenge remains 'active' and the
 *   next hourly run will reprocess it. Status is never marked completed before
 *   XP has been durably written.
 */
async function transitionActiveToCompleted(
  db: admin.firestore.Firestore,
  now: admin.firestore.Timestamp,
): Promise<number> {
  const snap = await db
    .collection(CHALLENGES)
    .where('status', '==', 'active')
    .where('endDate', '<=', now)
    .get();

  if (snap.empty) return 0;

  // Phase 1: build and commit XP award writes (participant completedAt + xpLog + publicProfile)
  const xpWrites: Array<{ ref: admin.firestore.DocumentReference; data: Record<string, unknown>; merge?: boolean }> = [];

  for (const challengeDoc of snap.docs) {
    const challenge = challengeDoc.data();
    const targetValue: number = challenge.targetValue ?? 0;
    const xpReward: number = challenge.xpReward ?? 50;

    // Fetch all participants
    let participantsSnap: admin.firestore.QuerySnapshot;
    try {
      participantsSnap = await db
        .collection(CHALLENGES)
        .doc(challengeDoc.id)
        .collection(PARTICIPANTS)
        .get();
    } catch (err) {
      console.error(`[challengeLifecycle] Failed to fetch participants for ${challengeDoc.id}:`, err);
      continue;
    }

    for (const participantDoc of participantsSnap.docs) {
      const participant = participantDoc.data();

      // Skip if already awarded (completedAt is set) — idempotency guard
      if (participant.completedAt) continue;

      // Skip if did not meet target
      if ((participant.progress ?? 0) < targetValue) continue;

      const uid: string = participant.uid;
      if (!uid) continue;

      // Mark participant as completed
      xpWrites.push({
        ref: participantDoc.ref,
        data: {
          completedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        merge: true,
      });

      // Write XP log entry
      const xpLogRef = db
        .collection(USERS)
        .doc(uid)
        .collection(XP_LOG)
        .doc(); // auto ID
      xpWrites.push({
        ref: xpLogRef,
        data: {
          xp: xpReward,
          source: 'challenge_completed',
          module: 'social',
          challengeId: challengeDoc.id,
          awardedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        merge: false,
      });

      // Increment totalXP on publicProfile
      const profileRef = db.collection(PUBLIC_PROFILES).doc(uid);
      xpWrites.push({
        ref: profileRef,
        data: {
          totalXP: admin.firestore.FieldValue.increment(xpReward),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        merge: true,
      });

      // Sync totalXP to the user's private gamification state so the client
      // remains consistent. Challenge XP is exempt from the daily cap —
      // we increment totalXP directly without touching todayXP.
      // Level is intentionally NOT updated here; it will be recomputed client-side
      // on the next app open via getLevelForXP(totalXP).
      const privateProfileRef = db
        .collection(USERS)
        .doc(uid)
        .collection(PROFILE)
        .doc('data');
      xpWrites.push({
        ref: privateProfileRef,
        data: {
          'gamification.totalXP': admin.firestore.FieldValue.increment(xpReward),
        },
        merge: true,
      });
    }
  }

  // Commit XP writes first — if this throws, challenges stay 'active' and will be retried
  await commitInBatches(db, xpWrites);

  // Phase 2: now that XP is durably written, mark challenges as completed
  const statusWrites = snap.docs.map((d) => ({
    ref: d.ref,
    data: {
      status: 'completed',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    } as Record<string, unknown>,
    merge: true,
  }));

  await commitInBatches(db, statusWrites);

  console.log(`[challengeLifecycle] Completed ${snap.size} challenges.`);
  return snap.size;
}

// ─── Duel completion logic ────────────────────────────────────────────────────

/**
 * Completes expired active duels.
 *
 * For each duel where status == 'active' AND endDate <= now:
 *   - Compares challengerProgress vs opponentProgress
 *   - Sets winnerId to higher-progress participant (or null for tie)
 *   - Sets status to 'completed'
 *   - Awards XP via Admin SDK writes to winner's xpLog + publicProfile
 *
 * ORDERING GUARANTEE (partial-failure safety):
 *   1. All XP award batches are committed first.
 *   2. Only after all XP batches succeed, a final batch sets each duel
 *      status to 'completed' and writes winnerId.
 *   This way, if the XP batches fail, the duel remains 'active' and the
 *   next hourly run will reprocess it. Status is never marked completed before
 *   XP has been durably written.
 *
 * IDEMPOTENCY:
 *   Queries only status == 'active', so re-running on already-completed duels
 *   is a no-op.
 *
 * NOTE: winnerId is written ONLY by this Cloud Function (Admin SDK).
 * Firestore rules prevent clients from writing winnerId directly.
 */
async function completeExpiredDuels(
  db: admin.firestore.Firestore,
  now: admin.firestore.Timestamp,
): Promise<number> {
  const snap = await db
    .collection(DUELS)
    .where('status', '==', 'active')
    .where('endDate', '<=', now)
    .get();

  if (snap.empty) return 0;

  // Precompute outcome per duel so we can reuse it in both phases
  type DuelOutcome = {
    ref: admin.firestore.DocumentReference;
    winnerId: string | null;
    participants: Array<{ uid: string; xp: number }>;
  };

  const outcomes: DuelOutcome[] = [];

  for (const duelDoc of snap.docs) {
    const duel = duelDoc.data();
    const challengerProgress: number = duel.challengerProgress ?? 0;
    const opponentProgress: number = duel.opponentProgress ?? 0;
    const challengerUid: string = duel.challengerUid;
    const opponentUid: string = duel.opponentUid;

    let winnerId: string | null = null;
    let isTie = false;

    if (challengerProgress > opponentProgress) {
      winnerId = challengerUid;
    } else if (opponentProgress > challengerProgress) {
      winnerId = opponentUid;
    } else {
      isTie = true;
      winnerId = null;
    }

    const xpForWinner = isTie ? DUEL_TIE_XP : DUEL_WIN_XP;
    const xpForLoser = isTie ? DUEL_TIE_XP : 0;

    const participants: Array<{ uid: string; xp: number }> = [];
    if (isTie) {
      participants.push({ uid: challengerUid, xp: xpForWinner });
      participants.push({ uid: opponentUid, xp: xpForWinner });
    } else if (winnerId) {
      participants.push({ uid: winnerId, xp: xpForWinner });
      const loserId = winnerId === challengerUid ? opponentUid : challengerUid;
      if (xpForLoser > 0) {
        participants.push({ uid: loserId, xp: xpForLoser });
      }
    }

    outcomes.push({ ref: duelDoc.ref, winnerId, participants });
  }

  // Phase 1: commit XP writes — if this fails, duels stay 'active' and are retried
  const xpWrites: Array<{
    ref: admin.firestore.DocumentReference;
    data: Record<string, unknown>;
    merge?: boolean;
  }> = [];

  for (const { ref: duelRef, participants } of outcomes) {
    const duelId = duelRef.id;
    for (const { uid, xp } of participants) {
      if (!uid || xp <= 0) continue;

      // Write XP log entry
      const xpLogRef = db.collection(USERS).doc(uid).collection(XP_LOG).doc();
      xpWrites.push({
        ref: xpLogRef,
        data: {
          xp,
          source: 'duel_completed',
          module: 'social',
          duelId,
          awardedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        merge: false,
      });

      // Increment totalXP on publicProfile
      const profileRef = db.collection(PUBLIC_PROFILES).doc(uid);
      xpWrites.push({
        ref: profileRef,
        data: {
          totalXP: admin.firestore.FieldValue.increment(xp),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        merge: true,
      });

      // Sync totalXP to the user's private gamification state so the client
      // remains consistent. Duel XP is exempt from the daily cap —
      // we increment totalXP directly without touching todayXP.
      // Level is intentionally NOT updated here; it will be recomputed client-side
      // on the next app open via getLevelForXP(totalXP).
      const privateProfileRef = db
        .collection(USERS)
        .doc(uid)
        .collection(PROFILE)
        .doc('data');
      xpWrites.push({
        ref: privateProfileRef,
        data: {
          'gamification.totalXP': admin.firestore.FieldValue.increment(xp),
        },
        merge: true,
      });
    }
  }

  await commitInBatches(db, xpWrites);

  // Phase 2: now that XP is durably written, mark duels as completed with winnerId
  const statusWrites = outcomes.map(({ ref, winnerId }) => ({
    ref,
    data: {
      status: 'completed',
      winnerId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    } as Record<string, unknown>,
    merge: true,
  }));

  await commitInBatches(db, statusWrites);

  console.log(`[challengeLifecycle] Completed ${snap.size} duels.`);
  return snap.size;
}

// ─── Scheduled function ───────────────────────────────────────────────────────

/**
 * challengeStatusTransition
 *
 * Runs every hour. Transitions:
 *   upcoming → active  (when startDate <= now)
 *   active   → completed (when endDate <= now, awards XP to finishers)
 */
export const challengeStatusTransition = onSchedule(
  {
    schedule: 'every 1 hours',
    region: 'us-central1',
  },
  async () => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();

    console.log('[challengeStatusTransition] Starting run...');

    try {
      const activated = await transitionUpcomingToActive(db, now);
      const completed = await transitionActiveToCompleted(db, now);
      const duelsCompleted = await completeExpiredDuels(db, now);

      console.log(
        `[challengeStatusTransition] Run complete. Activated: ${activated}, Challenges completed: ${completed}, Duels completed: ${duelsCompleted}.`,
      );
    } catch (err) {
      console.error('[challengeStatusTransition] Fatal error:', err);
      throw err; // Re-throw so Cloud Functions marks the run as failed
    }
  },
);
