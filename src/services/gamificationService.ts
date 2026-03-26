/**
 * Gamification service — all Firestore I/O for XP and achievements.
 *
 * Architecture decisions:
 * - Profile.gamification is denormalized (totalXP, level, todayXP, todayDate)
 *   for fast reads — no aggregation query needed on the XP log.
 * - xpLog collection is the audit trail and powers the "recent earnings" list.
 * - Daily cap (200 XP) is enforced here. PR and streak bonuses are exempt.
 * - unlockAchievement awards bonus XP with exempt=true (bypasses cap, skips
 *   further achievement checking in achievementChecker.ts to prevent loops).
 */
import { orderBy, limit, Timestamp, where } from 'firebase/firestore';
import { auth } from './firebase/index';
import { addBreadcrumb } from './errorReporting';
import {
  addDocument,
  mergeDocument,
  queryDocuments,
  setDocument,
  getDocument,
  COLLECTIONS,
} from './firebase/firestore';
import { getLevelForXP, computeRemainingDailyCap } from '../utils/xpEngine';
import { toLocalDateKey } from '../utils/nutrition';
import type { ServiceResult } from '../types/service';
import type {
  GamificationState,
  XPLogEntry,
  AchievementDoc,
  AwardXPResult,
  XPSource,
  XPModule,
} from '../types/gamification';

// ─── Internal helpers ──────────────────────────────────────────────────────

function uid(): string | null {
  return auth.currentUser?.uid ?? null;
}

// Reads the current gamification state from profile.
// Returns a safe default if the field has never been set.
async function readGamificationState(): Promise<GamificationState> {
  const userId = uid();
  if (!userId) return { totalXP: 0, level: 1, todayXP: 0, todayDate: '', macroTargetDays: 0 };

  const result = await getDocument<{ gamification?: GamificationState }>(
    COLLECTIONS.PROFILE,
    'data',
  );
  const state = result.data?.gamification;
  if (!state) {
    return { totalXP: 0, level: 1, todayXP: 0, todayDate: '', macroTargetDays: 0 };
  }
  return state;
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Awards XP to the current user.
 *
 * - Enforces the 200 XP/day cap for non-exempt actions.
 * - Writes an xpLog doc (audit trail).
 * - Updates profile.gamification (denormalized totals).
 * - Returns the actual amount awarded (may be less than requested due to cap).
 */
export async function awardXP(
  amount: number,
  source: XPSource,
  module: XPModule,
  exempt = false,
): Promise<ServiceResult<AwardXPResult>> {
  try {
    const userId = uid();
    if (!userId) throw new Error('Not authenticated');

    const today = toLocalDateKey();
    const state = await readGamificationState();

    // Reset daily cap if date has rolled over
    const todayXP = state.todayDate === today ? state.todayXP : 0;

    let actual = amount;
    if (!exempt) {
      const remaining = computeRemainingDailyCap(todayXP);
      if (remaining <= 0) {
        // Cap hit — nothing to award
        return {
          data: {
            xpAwarded: 0,
            newTotal: state.totalXP,
            leveledUp: false,
            newLevel: state.level,
          },
          error: null,
        };
      }
      actual = Math.min(amount, remaining);
    }

    const newTotal = state.totalXP + actual;
    const levelInfo = getLevelForXP(newTotal);
    const leveledUp = levelInfo.level > state.level;

    // Write XP log entry (fire immediately, don't await — keep user flow fast)
    const logEntry = {
      amount: actual,
      source,
      module,
      dateKey: today,
      exempt,
    };
    addDocument(COLLECTIONS.XP_LOG, logEntry).catch(() => {});

    // Update denormalized profile totals.
    // Increment macroTargetDays when the user hits their macro targets for the day.
    const newMacroTargetDays = (state.macroTargetDays ?? 0) + (source === 'macro_targets_hit' ? 1 : 0);

    const newState: GamificationState = {
      totalXP: newTotal,
      level: levelInfo.level,
      todayXP: exempt ? todayXP : todayXP + actual,
      todayDate: today,
      macroTargetDays: newMacroTargetDays,
    };
    await mergeDocument(COLLECTIONS.PROFILE, 'data', { gamification: newState });

    return {
      data: {
        xpAwarded: actual,
        newTotal,
        leveledUp,
        newLevel: levelInfo.level,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

/**
 * Unlocks an achievement for the current user and awards bonus XP.
 * Bonus XP is always exempt from the daily cap.
 */
export async function unlockAchievement(
  achievementId: string,
  xpReward: number,
): Promise<ServiceResult<void>> {
  try {
    const userId = uid();
    if (!userId) throw new Error('Not authenticated');

    const doc: Omit<AchievementDoc, 'createdAt' | 'updatedAt'> = {
      unlockedAt: Timestamp.now(),
      xpAwarded: xpReward,
    };

    // setDocument uses achievementId as the doc ID so it's idempotent
    await setDocument(COLLECTIONS.ACHIEVEMENTS, achievementId, doc);

    // Award bonus XP (exempt from cap, source='achievement_bonus' skips
    // further achievement checks in the hook to prevent infinite loops)
    await awardXP(xpReward, 'achievement_bonus', 'system', true);

    return { data: undefined, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

/**
 * Fetches the most recent XP log entries for the current user.
 */
export async function getRecentXPLog(
  count = 20,
): Promise<ServiceResult<XPLogEntry[]>> {
  try {
    const result = await queryDocuments<XPLogEntry>(COLLECTIONS.XP_LOG, [
      orderBy('createdAt', 'desc'),
      limit(count),
    ]);
    return result;
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

/**
 * Fetches all unlocked achievements for the current user.
 * Returns a Record keyed by achievement ID for O(1) lookup.
 */
export async function getUnlockedAchievements(): Promise<
  ServiceResult<Record<string, AchievementDoc>>
> {
  try {
    const result = await queryDocuments<AchievementDoc>(
      COLLECTIONS.ACHIEVEMENTS,
      [],
    );
    if (result.error) return { data: null, error: result.error };

    const map: Record<string, AchievementDoc> = {};
    for (const doc of result.data ?? []) {
      // queryDocuments returns docs with id attached
      const id = (doc as AchievementDoc & { id: string }).id;
      if (id) map[id] = doc;
    }
    return { data: map, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

/**
 * Fetch XP log entries for a date range (for growth chart).
 */
export async function getXPLogForDateRange(
  startDateKey: string,
): Promise<ServiceResult<XPLogEntry[]>> {
  try {
    addBreadcrumb('gamificationService', 'getXPLogForDateRange', { startDateKey });
    const result = await queryDocuments<XPLogEntry>(COLLECTIONS.XP_LOG, [
      where('dateKey', '>=', startDateKey),
      orderBy('dateKey', 'asc'),
    ]);
    return result;
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

/**
 * Returns aggregate stats needed for achievement condition evaluation.
 * Queries only the collections that are cheap to count client-side.
 */
export async function getUserStats(): Promise<
  ServiceResult<{
    doseCount: number;
    workoutCount: number;
    bareMinWorkoutCount: number;
    mealCount: number;
    cardioCount: number;
    recipeCount: number;
    sideEffectCount: number;
    cycleCompleteCount: number;
    prCountThisMonth: number;
    paceprCountThisMonth: number;
    zenSessionCount: number;
  }>
> {
  try {
    // Month boundary for this-month checks
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthStartTs = Timestamp.fromDate(monthStart);

    const [
      doses,
      sessions,
      bareSessions,
      food,
      cardio,
      recipes,
      sideEffects,
      cycles,
      prs,
      zenSessions,
    ] = await Promise.allSettled([
      queryDocuments(COLLECTIONS.DOSES, []),
      queryDocuments(COLLECTIONS.WORKOUT_SESSIONS, [
        where('status', '==', 'completed'),
      ]),
      queryDocuments(COLLECTIONS.WORKOUT_SESSIONS, [
        where('status', '==', 'completed'),
        where('isBareMinimum', '==', true),
      ]),
      queryDocuments(COLLECTIONS.FOOD_LOG, []),
      queryDocuments(COLLECTIONS.CARDIO_SESSIONS, [
        where('status', '==', 'completed'),
      ]),
      queryDocuments(COLLECTIONS.RECIPES, []),
      queryDocuments(COLLECTIONS.SIDE_EFFECTS, []),
      queryDocuments(COLLECTIONS.CYCLES, [where('status', '==', 'completed')]),
      queryDocuments(COLLECTIONS.PERSONAL_RECORDS, [
        where('createdAt', '>=', monthStartTs),
      ]),
      queryDocuments(COLLECTIONS.CARDIO_SESSIONS, [
        where('status', '==', 'completed'),
        where('avgHeartRate', '<=', 130), // approximate Zone 1/2 proxy
      ]),
    ]);

    // PRs this month — count unique exercise entries (each doc = one PR event)
    const prCount =
      prs.status === 'fulfilled' ? (prs.value.data?.length ?? 0) : 0;

    // Pace PRs — cardio personal records stored in PERSONAL_RECORDS with type='pace'
    // For now re-use prCount as an upper bound; speed_demon checks paceprCountThisMonth
    const pacePrCount = prCount; // refined when pace PR type is distinct

    return {
      data: {
        doseCount:
          doses.status === 'fulfilled' ? (doses.value.data?.length ?? 0) : 0,
        workoutCount:
          sessions.status === 'fulfilled'
            ? (sessions.value.data?.length ?? 0)
            : 0,
        bareMinWorkoutCount:
          bareSessions.status === 'fulfilled'
            ? (bareSessions.value.data?.length ?? 0)
            : 0,
        mealCount:
          food.status === 'fulfilled' ? (food.value.data?.length ?? 0) : 0,
        cardioCount:
          cardio.status === 'fulfilled' ? (cardio.value.data?.length ?? 0) : 0,
        recipeCount:
          recipes.status === 'fulfilled'
            ? (recipes.value.data?.length ?? 0)
            : 0,
        sideEffectCount:
          sideEffects.status === 'fulfilled'
            ? (sideEffects.value.data?.length ?? 0)
            : 0,
        cycleCompleteCount:
          cycles.status === 'fulfilled' ? (cycles.value.data?.length ?? 0) : 0,
        prCountThisMonth: prCount,
        paceprCountThisMonth: pacePrCount,
        zenSessionCount:
          zenSessions.status === 'fulfilled'
            ? (zenSessions.value.data?.length ?? 0)
            : 0,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}
