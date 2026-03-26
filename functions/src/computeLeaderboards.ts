/**
 * computeLeaderboards — scheduled Cloud Functions for leaderboard computation.
 *
 * Two scheduled functions:
 *
 *   computeWeeklyLeaderboards
 *     Schedule: every 1 hours (UTC)
 *     Computes: weekly + snapshot of all-time leaderboards
 *     Writes:   leaderboards/{category}_weekly  (top 100 per category)
 *     Side-write: publicProfiles/{uid}.leaderboardSummary per user ranked
 *
 *   computeMonthlyAndAllTimeLeaderboards
 *     Schedule: 15 0 * * * (00:15 UTC daily)
 *     Computes: monthly + all-time leaderboards
 *     Writes:   leaderboards/{category}_monthly, leaderboards/{category}_allTime
 *     Side-write: publicProfiles/{uid}.leaderboardSummary (monthly+allTime)
 *
 * LEADERBOARD CATEGORIES (6 total):
 *   weeklyVolume      — stats.weeklyVolume (kg)
 *   weeklyDistance    — stats.weeklyDistance (km)
 *   weeklyXP          — stats.weeklyXP
 *   monthlyVolume     — stats.monthlyVolume (kg)
 *   monthlyDistance   — stats.monthlyDistance (km)
 *   allTimeXP         — stats.allTimeXP
 *
 * STALENESS FILTER:
 *   Only include users with stats.lastActivityAt within 60 days.
 *   This prevents ghost accounts from cluttering leaderboards.
 *
 * BATCH WRITE STRATEGY:
 *   Firestore batches are capped at 500 operations.
 *   We chunk writes into batches of 500 and commit sequentially.
 *   Partial failure is logged and continues (best-effort; next hourly run will correct).
 *
 * EXPECTED READ COST (per run of computeWeeklyLeaderboards):
 *   ~1 query read for all publicProfiles (up to 10k results = 10k doc reads).
 *   At $0.06 per 100k reads: $0.006 per run × 24 runs/day = $0.14/day at scale.
 *   At 1hr schedule this is acceptable. Can be relaxed to 6-hourly to cut cost.
 *
 * IDEMPOTENCY:
 *   Full recompute from source data on every run — inherently idempotent.
 *   leaderboard docs are overwritten (not incremented) each run.
 */
import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';

const PUBLIC_PROFILES = 'publicProfiles';
const LEADERBOARDS = 'leaderboards';
const TOP_N = 100;

// 60 days in milliseconds
const STALENESS_MS = 60 * 24 * 60 * 60 * 1000;

// ─── Types ────────────────────────────────────────────────────────────────────

type LeaderboardCategory =
  | 'weeklyVolume'
  | 'weeklyDistance'
  | 'weeklyXP'
  | 'monthlyVolume'
  | 'monthlyDistance'
  | 'allTimeXP';

type Timeframe = 'weekly' | 'monthly' | 'allTime';

type LeaderboardEntryDoc = {
  uid: string;
  username: string;
  displayHandle: string;
  level: number;
  tier: string;
  rank: number;
  value: number;
  percentile: number;
};

type LeaderboardDoc = {
  category: LeaderboardCategory;
  timeframe: Timeframe;
  entries: LeaderboardEntryDoc[];
  totalParticipants: number;
  computedAt: admin.firestore.FieldValue;
};

type UserLeaderboardRank = {
  rank: number;
  totalParticipants: number;
  percentile: number;
  value: number;
};

type ProfileDoc = admin.firestore.DocumentData & {
  uid: string;
  username?: string;
  displayHandle?: string;
  level?: number;
  tier?: string;
  leaderboardOptOut?: boolean;
  stats?: Record<string, unknown> & {
    lastActivityAt?: admin.firestore.Timestamp;
    weeklyVolume?: number;
    weeklyDistance?: number;
    weeklyXP?: number;
    monthlyVolume?: number;
    monthlyDistance?: number;
    allTimeXP?: number;
  };
};

// ─── Category → stat key mapping ─────────────────────────────────────────────

const CATEGORY_STAT_KEY: Record<LeaderboardCategory, string> = {
  weeklyVolume: 'weeklyVolume',
  weeklyDistance: 'weeklyDistance',
  weeklyXP: 'weeklyXP',
  monthlyVolume: 'monthlyVolume',
  monthlyDistance: 'monthlyDistance',
  allTimeXP: 'allTimeXP',
};

// ─── Batch write helper ───────────────────────────────────────────────────────

/**
 * Commit an array of [docRef, data] pairs using chunked 500-op batches.
 * Partial failures are logged and execution continues.
 */
async function commitInBatches(
  db: admin.firestore.Firestore,
  writes: Array<[admin.firestore.DocumentReference, Record<string, unknown>]>,
): Promise<void> {
  const BATCH_SIZE = 500;
  for (let i = 0; i < writes.length; i += BATCH_SIZE) {
    const chunk = writes.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    for (const [ref, data] of chunk) {
      batch.set(ref, data, { merge: true });
    }
    try {
      await batch.commit();
    } catch (err) {
      console.error(`[computeLeaderboards] Batch commit failed for chunk starting at ${i}:`, err);
      // Continue to next batch — best-effort; next scheduled run will re-sync
    }
  }
}

// ─── Core computation ─────────────────────────────────────────────────────────

/**
 * Fetches all eligible public profiles (not opted out, active within 60 days).
 */
async function fetchEligibleProfiles(db: admin.firestore.Firestore): Promise<ProfileDoc[]> {
  const cutoff = admin.firestore.Timestamp.fromMillis(Date.now() - STALENESS_MS);

  // NOTE: This requires a Firestore composite index on:
  //   leaderboardOptOut ASC, stats.lastActivityAt ASC
  // If the index doesn't exist, fall back to client-side filtering.
  let snap: admin.firestore.QuerySnapshot;
  try {
    snap = await db
      .collection(PUBLIC_PROFILES)
      .where('leaderboardOptOut', '!=', true)
      .where('stats.lastActivityAt', '>=', cutoff)
      .get();
  } catch (indexErr) {
    // Fallback: fetch all non-opted-out profiles and filter client-side
    console.warn('[computeLeaderboards] Composite index not available, using client-side staleness filter:', indexErr);
    snap = await db
      .collection(PUBLIC_PROFILES)
      .where('leaderboardOptOut', '!=', true)
      .get();
  }

  const profiles: ProfileDoc[] = [];
  for (const doc of snap.docs) {
    const data = doc.data() as ProfileDoc;
    // Client-side staleness filter (safety net even when index query worked)
    const lastActivity = data.stats?.lastActivityAt;
    if (lastActivity && lastActivity.toMillis() < Date.now() - STALENESS_MS) {
      continue;
    }
    profiles.push({ ...data, uid: doc.id });
  }
  return profiles;
}

/**
 * Computes a single leaderboard for a given category and timeframe.
 * Returns:
 *   boardDoc    — the leaderboard document to write to leaderboards/{id}
 *   userRanks   — map of uid → rank data for writing back to publicProfiles
 */
function computeLeaderboard(
  category: LeaderboardCategory,
  timeframe: Timeframe,
  profiles: ProfileDoc[],
): {
  boardDoc: LeaderboardDoc;
  userRanks: Map<string, UserLeaderboardRank>;
} {
  const statKey = CATEGORY_STAT_KEY[category];

  // Extract stat value for each profile (default 0 if missing)
  const withValues = profiles.map((p) => ({
    profile: p,
    value: (typeof p.stats?.[statKey] === 'number' ? p.stats[statKey] as number : 0),
  }));

  // Filter out zero-value entries (no activity for this category)
  const nonZero = withValues.filter((x) => x.value > 0);

  // Sort descending
  nonZero.sort((a, b) => b.value - a.value);

  const totalParticipants = nonZero.length;

  // Assign ranks (1-indexed, ties get same rank)
  const ranked: Array<{ profile: ProfileDoc; value: number; rank: number }> = [];
  let currentRank = 1;
  for (let i = 0; i < nonZero.length; i++) {
    if (i > 0 && nonZero[i].value < nonZero[i - 1].value) {
      currentRank = i + 1;
    }
    ranked.push({ ...nonZero[i], rank: currentRank });
  }

  // Take top N for the board document
  const topN = ranked.slice(0, TOP_N);

  const entries: LeaderboardEntryDoc[] = topN.map(({ profile, value, rank }) => {
    // Percentile: what fraction of participants ranked below this user
    const percentile = totalParticipants > 1
      ? Math.round(((totalParticipants - rank) / (totalParticipants - 1)) * 100)
      : 100;
    return {
      uid: profile.uid,
      username: profile.username ?? '',
      displayHandle: profile.displayHandle ?? '',
      level: profile.level ?? 1,
      tier: profile.tier ?? 'bronze',
      rank,
      value,
      percentile,
    };
  });

  const boardDoc: LeaderboardDoc = {
    category,
    timeframe,
    entries,
    totalParticipants,
    computedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  // Build user rank map for ALL ranked users (not just top 100), so we can
  // write back accurate ranks to users who didn't make the top 100.
  const userRanks = new Map<string, UserLeaderboardRank>();
  for (const { profile, value, rank } of ranked) {
    const percentile = totalParticipants > 1
      ? Math.round(((totalParticipants - rank) / (totalParticipants - 1)) * 100)
      : 100;
    userRanks.set(profile.uid, { rank, totalParticipants, percentile, value });
  }

  return { boardDoc, userRanks };
}

/**
 * Builds all write operations for a set of categories and timeframe,
 * then commits them via chunked batches.
 */
async function computeAndWriteLeaderboards(
  db: admin.firestore.Firestore,
  categories: LeaderboardCategory[],
  timeframe: Timeframe,
  profiles: ProfileDoc[],
): Promise<void> {
  // Collect all writes: leaderboard board docs + user rank side-writes
  const writes: Array<[admin.firestore.DocumentReference, Record<string, unknown>]> = [];

  // Aggregate per-user rank summaries across all categories
  const userSummaries = new Map<string, Record<string, unknown>>();

  for (const category of categories) {
    const boardId = `${category}_${timeframe}`;
    const { boardDoc, userRanks } = computeLeaderboard(category, timeframe, profiles);

    // Queue leaderboard document write
    const boardRef = db.collection(LEADERBOARDS).doc(boardId);
    writes.push([boardRef, boardDoc as unknown as Record<string, unknown>]);

    // Queue per-user leaderboardSummary side-writes
    for (const [uid, rankData] of userRanks) {
      if (!userSummaries.has(uid)) {
        userSummaries.set(uid, {});
      }
      const summary = userSummaries.get(uid)!;
      summary[`leaderboardSummary.${category}_${timeframe}`] = rankData;
    }

    console.log(`[computeLeaderboards] ${boardId}: ${boardDoc.totalParticipants} participants, top ${boardDoc.entries.length} ranked.`);
  }

  // Queue all user profile side-writes
  for (const [uid, summaryFields] of userSummaries) {
    const profileRef = db.collection(PUBLIC_PROFILES).doc(uid);
    writes.push([profileRef, {
      ...summaryFields,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }]);
  }

  console.log(`[computeLeaderboards] Committing ${writes.length} total writes for timeframe=${timeframe}.`);
  await commitInBatches(db, writes);
}

// ─── Scheduled function 1: Weekly (runs hourly) ───────────────────────────────

/**
 * computeWeeklyLeaderboards
 *
 * Runs every hour. Reads publicProfiles collection once per run.
 * Computes weeklyVolume, weeklyDistance, weeklyXP.
 * Writes to leaderboards/{category}_weekly.
 * Writes user rank summaries back to publicProfiles/{uid}.leaderboardSummary.
 */
export const computeWeeklyLeaderboards = onSchedule(
  {
    schedule: 'every 1 hours',
    region: 'us-central1',
  },
  async () => {
    const db = admin.firestore();
    console.log('[computeWeeklyLeaderboards] Starting run...');

    try {
      const profiles = await fetchEligibleProfiles(db);
      console.log(`[computeWeeklyLeaderboards] Fetched ${profiles.length} eligible profiles.`);

      await computeAndWriteLeaderboards(
        db,
        ['weeklyVolume', 'weeklyDistance', 'weeklyXP'],
        'weekly',
        profiles,
      );

      console.log('[computeWeeklyLeaderboards] Run complete.');
    } catch (err) {
      console.error('[computeWeeklyLeaderboards] Fatal error:', err);
      throw err; // Re-throw so Cloud Functions marks the run as failed
    }
  },
);

// ─── Scheduled function 2: Monthly + All-Time (runs daily at 00:15 UTC) ──────

/**
 * computeMonthlyAndAllTimeLeaderboards
 *
 * Runs daily at 00:15 UTC. Same profile fetch, computes monthly + all-time.
 * Writes to leaderboards/{category}_monthly and leaderboards/{category}_allTime.
 * Writes user rank summaries back to publicProfiles.
 *
 * NOTE: All-time leaderboard only has one category (allTimeXP).
 * Monthly has: monthlyVolume, monthlyDistance, monthlyXP.
 */
export const computeMonthlyAndAllTimeLeaderboards = onSchedule(
  {
    schedule: '15 0 * * *',
    region: 'us-central1',
  },
  async () => {
    const db = admin.firestore();
    console.log('[computeMonthlyAndAllTimeLeaderboards] Starting run...');

    try {
      const profiles = await fetchEligibleProfiles(db);
      console.log(`[computeMonthlyAndAllTimeLeaderboards] Fetched ${profiles.length} eligible profiles.`);

      // Monthly
      // Monthly categories: monthlyVolume and monthlyDistance only.
      // NOTE: `monthlyXP` is tracked as a stat by Firestore triggers but is
      // intentionally NOT ranked as a separate monthly leaderboard category.
      // XP leaderboard rankings only run on a weekly basis (weeklyXP, weekly
      // timeframe) and all-time (allTimeXP). A dedicated monthlyXP leaderboard
      // was omitted to avoid incentivising short-term XP gaming and to keep
      // the leaderboard surface manageable. If added in the future, include
      // 'monthlyXP' in this array and add 'monthlyXP' to LeaderboardCategory.
      await computeAndWriteLeaderboards(
        db,
        ['monthlyVolume', 'monthlyDistance'],
        'monthly',
        profiles,
      );

      // All-time
      await computeAndWriteLeaderboards(
        db,
        ['allTimeXP'],
        'allTime',
        profiles,
      );

      console.log('[computeMonthlyAndAllTimeLeaderboards] Run complete.');
    } catch (err) {
      console.error('[computeMonthlyAndAllTimeLeaderboards] Fatal error:', err);
      throw err;
    }
  },
);
