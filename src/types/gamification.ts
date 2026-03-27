import { Timestamp } from 'firebase/firestore';

// ─── Enums / unions ────────────────────────────────────────────────────────

export type XPSource =
  | 'log_dose'
  | 'complete_workout'
  | 'complete_workout_bare'
  | 'log_all_meals'
  | 'macro_targets_hit'
  | 'complete_cardio'
  | 'personal_record'
  | 'streak_milestone'
  | 'recovery_checkin'
  | 'achievement_bonus'
  | 'challenge_complete'
  | 'duel_won'
  | 'quest_complete'
  | 'quest_bonus'
  | 'fasting_complete'
  | 'meal_score_80'
  | 'water_goal_reached';

export type XPModule =
  | 'peptides'
  | 'gym'
  | 'nutrition'
  | 'cardio'
  | 'recovery'
  | 'system';

export type AchievementCategory =
  | 'peptides'
  | 'gym'
  | 'nutrition'
  | 'cardio'
  | 'crossModule';

// ─── Level / XP ────────────────────────────────────────────────────────────

export type GamificationState = {
  totalXP: number;
  level: number;
  // Non-exempt XP earned today (resets when todayDate changes)
  todayXP: number;
  // 'YYYY-MM-DD' — used to detect date rollover and reset todayXP
  todayDate: string;
  // Cumulative count of days the user hit all macro targets (for macro_sniper achievement)
  macroTargetDays: number;
};

export type LevelInfo = {
  level: number;
  // XP earned within the current level (0 → xpToNextLevel)
  currentLevelXP: number;
  // XP needed to advance to the next level
  xpToNextLevel: number;
  // Fraction 0–1 for progress bar fill
  progress: number;
};

// ─── Firestore doc types ────────────────────────────────────────────────────

export type XPLogEntry = {
  id: string;
  amount: number;
  source: XPSource;
  module: XPModule;
  // 'YYYY-MM-DD' for daily cap grouping
  dateKey: string;
  // PR and streak bonuses are exempt from the 200/day cap
  exempt: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type AchievementDoc = {
  unlockedAt: Timestamp;
  xpAwarded: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

// ─── Service results ────────────────────────────────────────────────────────

export type AwardXPResult = {
  xpAwarded: number;
  newTotal: number;
  leveledUp: boolean;
  newLevel: number;
};

// ─── Achievement definitions ────────────────────────────────────────────────

// Stats passed to each achievement's checkCondition function.
// Built from data already in memory (no extra Firestore reads required
// unless the definition itself needs a specific count query).
export type AchievementContext = {
  totalXP: number;
  level: number;
  module: XPModule;
  source: XPSource;
  // Counts fetched on-demand by the checker (keyed by collection)
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
  macroTargetDays: number;
  allModulesToday: boolean;
  daysOnPlanLast30: number;
  zenSessionCount: number;
  streakCurrent: number;
  // Already unlocked achievement IDs (to skip re-checking)
  unlockedIds: Set<string>;
};

export type AchievementDefinition = {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  // Ionicons name
  icon: string;
  category: AchievementCategory;
  checkCondition: (ctx: AchievementContext) => boolean;
};
