/**
 * pvpService — client-side READ-ONLY service for PVP seasons and leagues.
 *
 * ALL writes go through Cloud Functions (Admin SDK).
 * This service only reads from Firestore and invokes CF callables.
 *
 * Pattern: ServiceResult<T> — never throws.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from './firebase/index';
import { addBreadcrumb } from './errorReporting';
import { analytics, AnalyticsEvent } from './analytics';
import type { ServiceResult } from '../types/service';
import type { SeasonDoc, UserSeasonProgress, WeeklyLeagueDoc, SeasonRewardTier } from '../types/pvp';
import { getWeekKey } from '../utils/pvpLeagueUtils';

// ─── Collection paths ─────────────────────────────────────────────────────────

const SEASONS = 'seasons';
const WEEKLY_LEAGUES = 'weeklyLeagues';
const USERS = 'users';
const SEASON_PROGRESS = 'seasonProgress';

// ─── Read: Current active season ─────────────────────────────────────────────

/**
 * Returns the current active season, or null if none is active.
 */
export async function getCurrentSeason(): Promise<ServiceResult<SeasonDoc | null>> {
  try {
    addBreadcrumb('pvpService', 'getCurrentSeason', {});
    const q = query(
      collection(db, SEASONS),
      where('status', '==', 'active'),
      firestoreLimit(1),
    );
    const snap = await getDocs(q);
    if (snap.empty) return { data: null, error: null };
    const d = snap.docs[0];
    const season = { id: d.id, ...d.data() } as SeasonDoc;
    analytics.track(AnalyticsEvent.SEASON_VIEWED, { seasonId: season.id });
    return { data: season, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── Read: User season progress ───────────────────────────────────────────────

/**
 * Returns a user's progress document for the given season, or null if not found.
 */
export async function getUserSeasonProgress(
  uid: string,
  seasonId: string,
): Promise<ServiceResult<UserSeasonProgress | null>> {
  try {
    addBreadcrumb('pvpService', 'getUserSeasonProgress', { uid, seasonId });
    const ref = doc(db, USERS, uid, SEASON_PROGRESS, seasonId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return { data: null, error: null };
    return { data: snap.data() as UserSeasonProgress, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── Read: User's current weekly league ───────────────────────────────────────

/**
 * Returns the user's weekly league for the current week, or null if not assigned.
 * Queries weeklyLeagues where members array-contains uid AND weekKey = current week.
 */
export async function getUserWeeklyLeague(
  uid: string,
): Promise<ServiceResult<WeeklyLeagueDoc | null>> {
  try {
    const weekKey = getWeekKey(new Date());
    addBreadcrumb('pvpService', 'getUserWeeklyLeague', { uid, weekKey });
    const q = query(
      collection(db, WEEKLY_LEAGUES),
      where('weekKey', '==', weekKey),
      where('memberUids', 'array-contains', uid),
      firestoreLimit(1),
    );
    const snap = await getDocs(q);
    if (snap.empty) return { data: null, error: null };
    const d = snap.docs[0];
    const league = { id: d.id, ...d.data() } as WeeklyLeagueDoc;
    analytics.track(AnalyticsEvent.LEAGUE_VIEWED, { weekKey });
    return { data: league, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── Callable: Claim season reward ───────────────────────────────────────────

type ClaimRewardResponse = {
  rewardTier: SeasonRewardTier;
  bonusRP: number;
};

/**
 * Calls the claimSeasonReward Cloud Function.
 * Server derives the reward tier — no client-supplied tier accepted.
 */
export async function claimSeasonReward(
  seasonId: string,
): Promise<ServiceResult<ClaimRewardResponse>> {
  try {
    addBreadcrumb('pvpService', 'claimSeasonReward', { seasonId });
    const functions = getFunctions();
    const callable = httpsCallable<{ seasonId: string }, ClaimRewardResponse>(
      functions,
      'claimSeasonReward',
    );
    const result = await callable({ seasonId });
    analytics.track(AnalyticsEvent.SEASON_REWARD_CLAIMED, {
      seasonId,
      rewardTier: result.data.rewardTier,
      bonusRP: result.data.bonusRP,
    });
    return { data: result.data, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── Read: Season leaderboard ─────────────────────────────────────────────────

type LeaderboardRow = {
  uid: string;
  username: string;
  totalRP: number;
  tier: string;
};

/**
 * Returns the top N participants for a season, ordered by totalRP descending.
 * Reads from seasonProgress subcollection across all users — requires a
 * collection group query on Firestore.
 */
export async function getSeasonLeaderboard(
  seasonId: string,
  limitCount = 50,
): Promise<ServiceResult<LeaderboardRow[]>> {
  try {
    addBreadcrumb('pvpService', 'getSeasonLeaderboard', { seasonId, limitCount });
    // Season leaderboard is pre-materialised by CF into seasons/{seasonId}/leaderboard
    const ref = doc(db, SEASONS, seasonId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return { data: [], error: null };

    const data = snap.data();
    const leaderboard: LeaderboardRow[] = (data?.leaderboard ?? []).slice(0, limitCount);
    analytics.track(AnalyticsEvent.LEAGUE_STANDINGS_VIEWED, { seasonId });
    return { data: leaderboard, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}
