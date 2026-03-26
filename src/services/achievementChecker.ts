/**
 * Achievement checker — evaluates definitions after each XP award and
 * unlocks newly earned achievements.
 *
 * Design:
 * - Only checks achievements in the relevant category + crossModule always.
 *   This avoids unnecessarily querying stats for unrelated modules.
 * - Returns the array of newly unlocked definitions so the hook can show toasts.
 * - Called with source='achievement_bonus' to prevent infinite loops —
 *   the hook skips calling this function for bonus XP awards.
 */
import { ACHIEVEMENT_DEFINITIONS } from '../utils/achievementDefinitions';
import { unlockAchievement, getUserStats } from './gamificationService';
import type { AchievementContext, AchievementDefinition, XPModule, XPSource } from '../types/gamification';

export type AchievementCheckerInput = {
  totalXP: number;
  level: number;
  module: XPModule;
  source: XPSource;
  // Already-unlocked IDs cached in the hook (avoids re-fetching achievements)
  unlockedIds: Set<string>;
  // Pre-computed today stats for the cross-module "all_in" check
  modulesEarnedToday: Set<string>;
  // Streak from the dashboard's existing streak service
  streakCurrent: number;
  // Days on plan (last 30) from consistency service
  daysOnPlanLast30: number;
  // Today's macro target hit count (accumulated in hook)
  macroTargetDays: number;
};

/**
 * Checks whether any achievements should unlock after an XP award.
 * Returns newly unlocked definitions (empty array if none).
 */
export async function checkAndUnlockAchievements(
  input: AchievementCheckerInput,
): Promise<AchievementDefinition[]> {
  // Source 'achievement_bonus' means this XP came from an achievement reward —
  // skip to prevent infinite loops.
  if (input.source === 'achievement_bonus') return [];

  // Only check achievements relevant to the module that just earned XP,
  // plus crossModule achievements which always run.
  const relevantCategories = new Set([input.module, 'crossModule']);
  const candidates = ACHIEVEMENT_DEFINITIONS.filter(
    (def) =>
      relevantCategories.has(def.category) &&
      !input.unlockedIds.has(def.id),
  );

  if (candidates.length === 0) return [];

  // Fetch stats needed for condition evaluation (one batched call)
  const statsResult = await getUserStats();
  if (statsResult.error || !statsResult.data) return [];
  const stats = statsResult.data;

  const context: AchievementContext = {
    totalXP: input.totalXP,
    level: input.level,
    module: input.module,
    source: input.source,
    doseCount: stats.doseCount,
    workoutCount: stats.workoutCount,
    bareMinWorkoutCount: stats.bareMinWorkoutCount,
    mealCount: stats.mealCount,
    cardioCount: stats.cardioCount,
    recipeCount: stats.recipeCount,
    sideEffectCount: stats.sideEffectCount,
    cycleCompleteCount: stats.cycleCompleteCount,
    prCountThisMonth: stats.prCountThisMonth,
    paceprCountThisMonth: stats.paceprCountThisMonth,
    zenSessionCount: stats.zenSessionCount,
    macroTargetDays: input.macroTargetDays,
    allModulesToday:
      input.modulesEarnedToday.has('peptides') &&
      input.modulesEarnedToday.has('gym') &&
      input.modulesEarnedToday.has('nutrition') &&
      input.modulesEarnedToday.has('cardio'),
    daysOnPlanLast30: input.daysOnPlanLast30,
    streakCurrent: input.streakCurrent,
    unlockedIds: input.unlockedIds,
  };

  const newlyUnlocked: AchievementDefinition[] = [];

  for (const def of candidates) {
    try {
      if (def.checkCondition(context)) {
        const result = await unlockAchievement(def.id, def.xpReward);
        if (!result.error) {
          newlyUnlocked.push(def);
          // Add to local set so subsequent candidates don't double-check
          input.unlockedIds.add(def.id);
        }
      }
    } catch {
      // Non-fatal — never block the caller over an achievement check failure
    }
  }

  return newlyUnlocked;
}
