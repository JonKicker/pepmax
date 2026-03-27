/**
 * assignWeeklyLeagues — scheduled Cloud Function.
 *
 * Runs every Monday at 00:00 UTC.
 *
 * Algorithm:
 *   1. Query all publicProfiles where rankRP field exists (ordered desc by rankRP)
 *   2. Apply lazy RP decay for each user (computeDecayedRP)
 *   3. Bucket users into RP brackets (diamond/platinum/gold/silver/bronze)
 *   4. Within each bracket, Fisher-Yates shuffle for random placement
 *   5. Split into groups of 20 (min 5 per group; remainder merges into prior group)
 *   6. Write weeklyLeagues/{auto} docs via batch
 *   7. Log stats for monitoring
 *
 * IDEMPOTENCY: weekKey + bracket + seed dedup. Re-running on the same Monday
 * will create duplicate docs (acceptable for MVP — add transaction dedup if needed).
 */
import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getBracketForRP, computeDecayedRP, getWeekKey } from './shared/rankTierV2';
import type { LeagueBracket } from './shared/rankTierV2';

// ─── Constants ────────────────────────────────────────────────────────────────

const PUBLIC_PROFILES = 'publicProfiles';
const WEEKLY_LEAGUES = 'weeklyLeagues';
const SEASONS = 'seasons';

const LEAGUE_SIZE = 20;
const MIN_LEAGUE_SIZE = 5;
const PROMOTION_SLOTS = 3;
const RELEGATION_SLOTS = 3;
const BATCH_SIZE = 500;

// ─── Fisher-Yates shuffle ─────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Split into groups ────────────────────────────────────────────────────────

/**
 * Splits an array into groups of targetSize.
 * If the last group would be < minSize, merge it into the previous group.
 */
function splitIntoGroups<T>(arr: T[], targetSize: number, minSize: number): T[][] {
  if (arr.length === 0) return [];

  const groups: T[][] = [];
  for (let i = 0; i < arr.length; i += targetSize) {
    groups.push(arr.slice(i, i + targetSize));
  }

  // Merge last group if too small
  if (groups.length > 1 && groups[groups.length - 1].length < minSize) {
    const last = groups.pop()!;
    groups[groups.length - 1].push(...last);
  }

  return groups;
}

// ─── Batch commit helper ──────────────────────────────────────────────────────

async function commitInBatches(
  db: admin.firestore.Firestore,
  writes: Array<{
    ref: admin.firestore.DocumentReference;
    data: Record<string, unknown>;
  }>,
): Promise<void> {
  for (let i = 0; i < writes.length; i += BATCH_SIZE) {
    const chunk = writes.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    for (const { ref, data } of chunk) {
      batch.set(ref, data);
    }
    await batch.commit();
  }
}

// ─── Scheduled function ───────────────────────────────────────────────────────

export const assignWeeklyLeagues = onSchedule(
  {
    schedule: 'every monday 00:00',
    timeZone: 'UTC',
    region: 'us-central1',
  },
  async () => {
    const db = admin.firestore();
    const now = Date.now();
    const weekKey = getWeekKey(new Date());

    console.log(`[assignWeeklyLeagues] Starting for week ${weekKey}`);

    // ── Get active season ID ───────────────────────────────────────────────
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
      console.error('[assignWeeklyLeagues] Failed to read active season:', err);
    }

    // ── Query all profiles with RP ─────────────────────────────────────────
    const profilesSnap = await db
      .collection(PUBLIC_PROFILES)
      .orderBy('rankRP', 'desc')
      .get();

    if (profilesSnap.empty) {
      console.log('[assignWeeklyLeagues] No profiles found. Exiting.');
      return;
    }

    // ── Apply lazy decay + bucket by bracket ─────────────────────────────

    type UserEntry = {
      uid: string;
      username: string;
      rp: number;
      bracket: LeagueBracket;
    };

    const buckets: Record<LeagueBracket, UserEntry[]> = {
      diamond: [],
      platinum: [],
      gold: [],
      silver: [],
      bronze: [],
    };

    for (const doc of profilesSnap.docs) {
      const data = doc.data();
      const uid = doc.id;
      const username: string = data.username ?? 'unknown';
      const storedRP: number = data.rankRP ?? 0;
      const lastActiveAt: number = data.lastActiveAt?.toMillis() ?? now;

      const decayedRP = computeDecayedRP(storedRP, lastActiveAt, now);
      const bracket = getBracketForRP(decayedRP);

      buckets[bracket].push({ uid, username, rp: decayedRP, bracket });
    }

    // ── Build league writes ────────────────────────────────────────────────

    const writes: Array<{
      ref: admin.firestore.DocumentReference;
      data: Record<string, unknown>;
    }> = [];

    const stats: Record<LeagueBracket, { users: number; leagues: number }> = {
      diamond: { users: 0, leagues: 0 },
      platinum: { users: 0, leagues: 0 },
      gold: { users: 0, leagues: 0 },
      silver: { users: 0, leagues: 0 },
      bronze: { users: 0, leagues: 0 },
    };

    for (const bracket of Object.keys(buckets) as LeagueBracket[]) {
      const users = buckets[bracket];
      if (users.length === 0) continue;

      const shuffled = shuffle(users);
      const groups = splitIntoGroups(shuffled, LEAGUE_SIZE, MIN_LEAGUE_SIZE);

      stats[bracket].users = users.length;
      stats[bracket].leagues = groups.length;

      for (const group of groups) {
        const members = group.map((u) => ({
          uid: u.uid,
          username: u.username,
          startRP: u.rp,
          currentRP: u.rp,
          weeklyDelta: 0,
        }));

        // Flat UID array for array-contains queries
        const memberUids = group.map((u) => u.uid);

        const leagueDoc: Record<string, unknown> = {
          seasonId: activeSeasonId ?? '',
          weekKey,
          bracket,
          members,
          memberUids,
          promotionSlots: PROMOTION_SLOTS,
          relegationSlots: RELEGATION_SLOTS,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          resolvedAt: null,
        };

        const ref = db.collection(WEEKLY_LEAGUES).doc();
        writes.push({ ref, data: leagueDoc });
      }
    }

    // ── Commit all writes ──────────────────────────────────────────────────
    await commitInBatches(db, writes);

    // ── Log stats ──────────────────────────────────────────────────────────
    const totalLeagues = Object.values(stats).reduce((sum, s) => sum + s.leagues, 0);
    const totalUsers = Object.values(stats).reduce((sum, s) => sum + s.users, 0);
    console.log(
      `[assignWeeklyLeagues] Done. week=${weekKey} totalUsers=${totalUsers} totalLeagues=${totalLeagues}`,
      stats,
    );
  },
);
