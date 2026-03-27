/**
 * updateRP — internal helper function for RP mutations.
 *
 * NOT exported as an HTTP callable. Called internally by other Cloud Functions
 * (e.g., onDuelResolved, onWorkoutComplete, claimSeasonReward).
 *
 * Responsibilities:
 *   1. Read current RP from publicProfiles/{uid}
 *   2. Compute new RP (floor at 0)
 *   3. Derive new tier
 *   4. Batch write: publicProfile update + rpLog entry + seasonProgress update
 *
 * RP is SERVER-AUTHORITATIVE — only this module and admin-level CFs may write RP.
 */
import * as admin from 'firebase-admin';
import { getTierForRP } from './shared/rankTierV2';

const PUBLIC_PROFILES = 'publicProfiles';
const USERS = 'users';
const RP_LOG = 'rpLog';
const SEASONS = 'seasons';
const SEASON_PROGRESS = 'seasonProgress';

type UpdateRPResult = {
  newRP: number;
  newTier: string;
};

/**
 * Atomically updates a user's RP, logs the change, and updates season progress.
 *
 * @param uid      - target user UID
 * @param delta    - signed RP change (positive = gain, negative = loss)
 * @param source   - describes what triggered this RP change (e.g. 'workout_complete')
 * @param metadata - optional key-value pairs for audit log (e.g. { duelId: 'abc' })
 */
export async function updateRP(
  uid: string,
  delta: number,
  source: string,
  metadata?: Record<string, string>,
): Promise<UpdateRPResult> {
  const db = admin.firestore();

  // ── Step 1: Read current RP ────────────────────────────────────────────────
  const profileRef = db.doc(`${PUBLIC_PROFILES}/${uid}`);
  const profileSnap = await profileRef.get();
  const currentRP: number = profileSnap.data()?.rankRP ?? 0;

  // ── Step 2: Compute new RP (floor at 0) ────────────────────────────────────
  const newRP = Math.max(0, currentRP + delta);

  // ── Step 3: Derive tiers ───────────────────────────────────────────────────
  const previousTierInfo = getTierForRP(currentRP);
  const newTierInfo = getTierForRP(newRP);

  // ── Step 4: Batch write ────────────────────────────────────────────────────
  const batch = db.batch();

  // Update publicProfile
  batch.update(profileRef, {
    rankRP: newRP,
    rankTierV2: newTierInfo.tier,
    lastActiveAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Append rpLog entry for audit trail
  const rpLogRef = db.collection(`${USERS}/${uid}/${RP_LOG}`).doc();
  batch.set(rpLogRef, {
    delta,
    source,
    metadata: metadata ?? {},
    previousRP: currentRP,
    newRP,
    previousTier: previousTierInfo.tier,
    newTier: newTierInfo.tier,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // ── Step 5: Update season progress if active season exists ─────────────────
  let activeSeasonId: string | null = null;
  try {
    const seasonSnap = await db
      .collection(SEASONS)
      .where('status', '==', 'active')
      .limit(1)
      .get();

    if (!seasonSnap.empty) {
      activeSeasonId = seasonSnap.docs[0].id;
    }
  } catch (err) {
    // Non-fatal: season progress update is best-effort
    console.error('[updateRP] Failed to read active season:', err);
  }

  if (activeSeasonId) {
    const seasonProgressRef = db.doc(
      `${USERS}/${uid}/${SEASON_PROGRESS}/${activeSeasonId}`,
    );

    try {
      const progressSnap = await seasonProgressRef.get();
      const progressData = progressSnap.data();
      const currentTotalRP: number = progressData?.totalRP ?? 0;
      const currentPeakRP: number = progressData?.peakRP ?? 0;
      const newTotalRP = Math.max(0, currentTotalRP + delta);
      const newPeakRP = Math.max(currentPeakRP, newRP);

      // Build new match history entry
      type MatchEntryType = 'workout' | 'duel_won' | 'duel_lost' | 'challenge_complete';
      const matchTypeMap: Record<string, MatchEntryType> = {
        workout_complete: 'workout',
        duel_won: 'duel_won',
        duel_lost: 'duel_lost',
        challenge_complete: 'challenge_complete',
        season_reward: 'challenge_complete',
      };
      const matchType: MatchEntryType = matchTypeMap[source] ?? 'workout';

      const newEntry = {
        type: matchType,
        rpDelta: delta,
        timestamp: Date.now(),
      };

      // Keep last 20 entries
      const existingHistory: typeof newEntry[] = progressData?.matchHistory ?? [];
      const updatedHistory = [newEntry, ...existingHistory].slice(0, 20);

      if (progressSnap.exists()) {
        batch.update(seasonProgressRef, {
          totalRP: newTotalRP,
          peakRP: newPeakRP,
          peakTier: newTierInfo.tier,
          matchHistory: updatedHistory,
        });
      } else {
        // First time this user appears in this season
        batch.set(seasonProgressRef, {
          seasonId: activeSeasonId,
          totalRP: newTotalRP,
          peakRP: newPeakRP,
          peakTier: newTierInfo.tier,
          matchHistory: updatedHistory,
        });
      }
    } catch (err) {
      console.error('[updateRP] Failed to update season progress for', uid, err);
      // Non-fatal — continue with batch commit
    }
  }

  await batch.commit();

  console.log(
    `[updateRP] uid=${uid} delta=${delta} source=${source} ${currentRP}→${newRP} (${previousTierInfo.tier}→${newTierInfo.tier})`,
  );

  return { newRP, newTier: newTierInfo.tier };
}
