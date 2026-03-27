/**
 * claimSeasonReward — HTTP Callable Cloud Function.
 *
 * Client calls: httpsCallable('claimSeasonReward')({ seasonId })
 *
 * Server validation steps:
 *   1. Auth required (rejects unauthenticated callers)
 *   2. Season must exist and be completed (endDate < now)
 *   3. User must have a seasonProgress doc for this season
 *   4. User must not have already claimed (claimedAt must be absent)
 *   5. Compute the user's percentile from all participants' totalRP
 *   6. Derive reward tier from percentile (top 1%/10%/25%/all)
 *   7. Write: claimedAt + rewardTier to seasonProgress
 *   8. Call updateRP for bonus RP
 *   9. Return { rewardTier, bonusRP }
 *
 * SECURITY: Accepts NO client-supplied tier/reward param. All reward data is
 * server-derived. Client input is limited to seasonId (a string).
 */
import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { updateRP } from './updateRP';

const SEASONS = 'seasons';
const USERS = 'users';
const SEASON_PROGRESS = 'seasonProgress';

// ─── Reward tiers ─────────────────────────────────────────────────────────────

type SeasonRewardTier = 'legendary' | 'epic' | 'rare' | 'participation';

type SeasonReward = {
  tier: SeasonRewardTier;
  bonusRP: number;
};

const REWARD_TIERS: SeasonReward[] = [
  { tier: 'legendary',    bonusRP: 500 },
  { tier: 'epic',         bonusRP: 200 },
  { tier: 'rare',         bonusRP: 100 },
  { tier: 'participation', bonusRP: 25 },
];

function getRewardTierForPercentile(percentile: number): SeasonRewardTier {
  if (percentile <= 0.01) return 'legendary';
  if (percentile <= 0.10) return 'epic';
  if (percentile <= 0.25) return 'rare';
  return 'participation';
}

function getBonusRP(tier: SeasonRewardTier): number {
  return REWARD_TIERS.find((r) => r.tier === tier)?.bonusRP ?? 25;
}

// ─── Callable function ────────────────────────────────────────────────────────

export const claimSeasonReward = onCall(
  { region: 'us-central1' },
  async (request) => {
    // ── Step 1: Auth required ────────────────────────────────────────────────
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required.');
    }
    const uid = request.auth.uid;

    // ── Validate client input — only seasonId accepted ─────────────────────
    const { seasonId } = request.data as { seasonId?: unknown };
    if (typeof seasonId !== 'string' || !seasonId) {
      throw new HttpsError('invalid-argument', 'seasonId must be a non-empty string.');
    }

    const db = admin.firestore();
    const now = Date.now();

    // ── Step 2: Season must exist and be completed ──────────────────────────
    const seasonRef = db.doc(`${SEASONS}/${seasonId}`);
    const seasonSnap = await seasonRef.get();
    if (!seasonSnap.exists()) {
      throw new HttpsError('not-found', 'Season not found.');
    }
    const seasonData = seasonSnap.data()!;
    if (seasonData.status !== 'completed') {
      throw new HttpsError('failed-precondition', 'Season is not yet completed.');
    }
    const endDate: number = seasonData.endDate ?? 0;
    if (endDate > now) {
      throw new HttpsError('failed-precondition', 'Season end date has not passed.');
    }

    // ── Step 3: User must have a seasonProgress doc ─────────────────────────
    const progressRef = db.doc(`${USERS}/${uid}/${SEASON_PROGRESS}/${seasonId}`);
    const progressSnap = await progressRef.get();
    if (!progressSnap.exists()) {
      throw new HttpsError('not-found', 'No season progress found for this user.');
    }
    const progressData = progressSnap.data()!;

    // ── Step 4: Must not have already claimed ────────────────────────────────
    if (progressData.claimedAt !== undefined && progressData.claimedAt !== null) {
      throw new HttpsError('already-exists', 'Season reward already claimed.');
    }

    const userTotalRP: number = progressData.totalRP ?? 0;

    // ── Step 5: Compute percentile from all participants ─────────────────────
    // Read all seasonProgress docs for this season via collection group query
    let participantCount = 0;
    let betterThanCount = 0;

    try {
      const allProgressSnap = await db
        .collectionGroup(SEASON_PROGRESS)
        .where('seasonId', '==', seasonId)
        .get();

      participantCount = allProgressSnap.size;

      for (const doc of allProgressSnap.docs) {
        const data = doc.data();
        if ((data.totalRP ?? 0) < userTotalRP) {
          betterThanCount++;
        }
      }
    } catch (err) {
      console.error('[claimSeasonReward] Failed to compute percentile:', err);
      // Fallback: treat as participation tier to avoid blocking claim
      participantCount = 1;
      betterThanCount = 0;
    }

    // percentile = fraction of participants this user is better than
    // (lower percentile number = better rank, e.g. 0.01 = top 1%)
    const percentile =
      participantCount > 0
        ? 1 - betterThanCount / participantCount
        : 1;

    // ── Step 6: Determine reward tier ────────────────────────────────────────
    const rewardTier = getRewardTierForPercentile(percentile);
    const bonusRP = getBonusRP(rewardTier);

    // ── Step 7: Write claim data to seasonProgress ───────────────────────────
    await progressRef.update({
      claimedAt: now,
      rewardTier,
    });

    // ── Step 8: Award bonus RP ────────────────────────────────────────────────
    try {
      await updateRP(uid, bonusRP, 'season_reward', {
        seasonId,
        rewardTier,
      });
    } catch (err) {
      // Non-fatal: RP award failed but claim is recorded. Log for manual fix.
      console.error('[claimSeasonReward] updateRP failed for', uid, err);
    }

    // ── Step 9: Return result ─────────────────────────────────────────────────
    console.log(
      `[claimSeasonReward] uid=${uid} seasonId=${seasonId} tier=${rewardTier} bonusRP=${bonusRP} percentile=${percentile.toFixed(3)}`,
    );

    return { rewardTier, bonusRP };
  },
);
