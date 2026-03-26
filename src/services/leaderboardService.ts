/**
 * Leaderboard service — client-side reads for /leaderboards collection and
 * friends/crew leaderboard computation.
 *
 * Four public functions:
 *
 *  getGlobalLeaderboard(category, timeframe)
 *    Reads leaderboards/{category}_{timeframe} — written by Cloud Functions.
 *    Returns the full top-100 LeaderboardDoc.
 *
 *  getUserRank(category, timeframe)
 *    Reads the current user's publicProfile.leaderboardSummary.
 *    Returns their rank data for the given category/timeframe without
 *    re-reading the full leaderboard document.
 *
 *  getFriendsLeaderboard(category, timeframe, friendUids)
 *    Reads publicProfiles for each friend in parallel.
 *    Extracts the stat for the given category, sorts descending, assigns ranks.
 *    Client-side computation — no Cloud Function needed for small lists.
 *
 *  getCrewLeaderboard(category, timeframe, crewMemberUids)
 *    Same as getFriendsLeaderboard but for crew members.
 *    Automatically includes the current user so they see themselves in the list.
 *
 * All functions return ServiceResult<T> and emit Sentry breadcrumbs.
 */
import { getGlobalDocument } from './firebase/communityFirestore';
import { auth } from './firebase/index';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase/index';
import { addBreadcrumb } from './errorReporting';
import type { ServiceResult } from '../types/service';
import type {
  LeaderboardCategory,
  LeaderboardTimeframe,
  LeaderboardDoc,
  LeaderboardEntry,
  UserLeaderboardRank,
  PublicProfile,
} from '../types/social';
import { LEADERBOARD_CATEGORIES } from '../utils/leaderboardCategories';

// ─── Constants ────────────────────────────────────────────────────────────────

const LEADERBOARDS_COLLECTION = 'leaderboards';
const PUBLIC_PROFILES_COLLECTION = 'publicProfiles';

// ─── Helper: extract stat value from profile ──────────────────────────────────

/**
 * Given a public profile, category, and timeframe, returns the numeric stat
 * value for that category. Falls back to 0 if the stat is not present.
 */
function extractStatValue(
  profile: PublicProfile,
  category: LeaderboardCategory,
): number {
  const categoryDef = LEADERBOARD_CATEGORIES.find((c) => c.category === category);
  if (!categoryDef) return 0;
  const statKey = categoryDef.statKey;
  const value = profile.stats?.[statKey as keyof typeof profile.stats];
  return typeof value === 'number' ? value : 0;
}

// ─── getGlobalLeaderboard ─────────────────────────────────────────────────────

/**
 * Reads the precomputed leaderboard document for a given category and timeframe.
 *
 * Document path: leaderboards/{category}_{timeframe}
 * Written by computeWeeklyLeaderboards / computeMonthlyAndAllTimeLeaderboards.
 *
 * Returns null if the document doesn't exist yet (no runs completed).
 */
export async function getGlobalLeaderboard(
  category: LeaderboardCategory,
  timeframe: LeaderboardTimeframe,
): Promise<ServiceResult<LeaderboardDoc | null>> {
  try {
    addBreadcrumb('leaderboardService', 'getGlobalLeaderboard', { category, timeframe });
    const boardId = `${category}_${timeframe}`;
    const result = await getGlobalDocument<LeaderboardDoc>(LEADERBOARDS_COLLECTION, boardId);
    return result;
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── getUserRank ──────────────────────────────────────────────────────────────

/**
 * Reads the current user's pre-computed rank for a given category and timeframe.
 *
 * Reads from publicProfiles/{uid}.leaderboardSummary, written by Cloud Functions.
 * Much cheaper than reading the full leaderboard document.
 *
 * Returns null if the user has no rank data for this category/timeframe.
 */
export async function getUserRank(
  category: LeaderboardCategory,
  timeframe: LeaderboardTimeframe,
): Promise<ServiceResult<UserLeaderboardRank | null>> {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');

    addBreadcrumb('leaderboardService', 'getUserRank', { category, timeframe });

    const profileSnap = await getDoc(doc(db, PUBLIC_PROFILES_COLLECTION, uid));
    if (!profileSnap.exists()) {
      return { data: null, error: null };
    }

    const profile = profileSnap.data() as PublicProfile;
    const summaryKey = `${category}_${timeframe}` as keyof typeof profile.leaderboardSummary;
    const rankData = profile.leaderboardSummary?.[summaryKey] ?? null;

    return { data: rankData, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── getFriendsLeaderboard ────────────────────────────────────────────────────

/**
 * Computes a leaderboard from a list of friend UIDs, client-side.
 *
 * Fetches publicProfiles for each friend in parallel (max 50 friends to
 * keep read cost bounded). Automatically includes the current user.
 * Extracts the stat for the given category, sorts descending, assigns ranks.
 *
 * Note: this always uses the underlying stat value regardless of timeframe —
 * the stat key is determined by the category definition in leaderboardCategories.ts.
 * Weekly stats may have rolled over between leaderboard compute runs.
 */
export async function getFriendsLeaderboard(
  category: LeaderboardCategory,
  timeframe: LeaderboardTimeframe,
  friendUids: string[],
): Promise<ServiceResult<LeaderboardEntry[]>> {
  try {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) throw new Error('Not authenticated');

    addBreadcrumb('leaderboardService', 'getFriendsLeaderboard', {
      category,
      timeframe,
      friendCount: friendUids.length,
    });

    // Combine current user with friends, deduplicate, cap at 50
    const allUids = Array.from(new Set([currentUid, ...friendUids])).slice(0, 50);

    return _buildClientLeaderboard(category, allUids);
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── getCrewLeaderboard ───────────────────────────────────────────────────────

/**
 * Computes a leaderboard from crew member UIDs, client-side.
 *
 * Same as getFriendsLeaderboard but for crew members.
 * Automatically includes the current user so they see themselves ranked.
 * Caps at 50 members to bound Firestore read cost.
 */
export async function getCrewLeaderboard(
  category: LeaderboardCategory,
  timeframe: LeaderboardTimeframe,
  crewMemberUids: string[],
): Promise<ServiceResult<LeaderboardEntry[]>> {
  try {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) throw new Error('Not authenticated');

    addBreadcrumb('leaderboardService', 'getCrewLeaderboard', {
      category,
      timeframe,
      memberCount: crewMemberUids.length,
    });

    const allUids = Array.from(new Set([currentUid, ...crewMemberUids])).slice(0, 50);

    return _buildClientLeaderboard(category, allUids);
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── Shared client-side computation ──────────────────────────────────────────

/**
 * Fetches publicProfiles for the given UIDs in parallel, extracts the stat,
 * sorts descending, and returns ranked LeaderboardEntry objects.
 *
 * READ COST: 1 Firestore read per UID. With max 50 UIDs = 50 reads max.
 */
async function _buildClientLeaderboard(
  category: LeaderboardCategory,
  uids: string[],
): Promise<ServiceResult<LeaderboardEntry[]>> {
  // Parallel profile reads
  const profileReads = uids.map((uid) =>
    getDoc(doc(db, PUBLIC_PROFILES_COLLECTION, uid))
      .then((snap) => (snap.exists() ? (snap.data() as PublicProfile) : null))
      .catch(() => null),
  );
  const profiles = (await Promise.all(profileReads)).filter(
    (p): p is PublicProfile => p !== null,
  );

  // Extract stat value for each profile
  const withValues = profiles.map((profile) => ({
    profile,
    value: extractStatValue(profile, category),
  }));

  // Sort descending, filter out zero-value entries
  const nonZero = withValues.filter((x) => x.value > 0);
  nonZero.sort((a, b) => b.value - a.value);

  const totalParticipants = nonZero.length;

  // Assign ranks (1-indexed, ties share the same rank)
  const entries: LeaderboardEntry[] = [];
  let currentRank = 1;
  for (let i = 0; i < nonZero.length; i++) {
    if (i > 0 && nonZero[i].value < nonZero[i - 1].value) {
      currentRank = i + 1;
    }
    const { profile, value } = nonZero[i];
    const percentile =
      totalParticipants > 1
        ? Math.round(((totalParticipants - currentRank) / (totalParticipants - 1)) * 100)
        : 100;

    entries.push({
      uid: profile.uid,
      username: profile.username,
      displayHandle: profile.displayHandle,
      totalXP: profile.totalXP,
      level: profile.level,
      tier: profile.tier,
      rank: currentRank,
      value,
      percentile,
    });
  }

  return { data: entries, error: null };
}
