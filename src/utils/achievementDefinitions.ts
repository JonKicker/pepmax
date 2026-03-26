import type { AchievementDefinition } from '../types/gamification';

// ─── Achievement definitions ───────────────────────────────────────────────
// checkCondition receives AchievementContext built by achievementChecker.ts.
// Keep conditions simple — complex queries belong in the checker, not here.

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  // ── Peptides ──────────────────────────────────────────────────────────────
  {
    id: 'first_pin',
    title: 'First Pin',
    description: 'Log your first peptide injection.',
    xpReward: 25,
    icon: 'medical-outline',
    category: 'peptides',
    checkCondition: (ctx) => ctx.doseCount >= 1,
  },
  {
    id: 'protocol_pro',
    title: 'Protocol Pro',
    description: 'Complete a full peptide cycle.',
    xpReward: 100,
    icon: 'ribbon-outline',
    category: 'peptides',
    checkCondition: (ctx) => ctx.cycleCompleteCount >= 1,
  },
  {
    id: 'data_scientist',
    title: 'Data Scientist',
    description: 'Log 50 symptom or side-effect entries.',
    xpReward: 75,
    icon: 'bar-chart-outline',
    category: 'peptides',
    checkCondition: (ctx) => ctx.sideEffectCount >= 50,
  },

  // ── Gym ───────────────────────────────────────────────────────────────────
  {
    id: 'first_rep',
    title: 'First Rep',
    description: 'Complete your first workout.',
    xpReward: 25,
    icon: 'barbell-outline',
    category: 'gym',
    checkCondition: (ctx) => ctx.workoutCount >= 1,
  },
  {
    id: 'century_club',
    title: 'Century Club',
    description: 'Complete 100 workouts.',
    xpReward: 200,
    icon: 'trophy-outline',
    category: 'gym',
    checkCondition: (ctx) => ctx.workoutCount >= 100,
  },
  {
    id: 'bare_minimum_hero',
    title: 'Bare Minimum Hero',
    description: 'Complete 10 "bare minimum" workouts.',
    xpReward: 100,
    icon: 'flash-outline',
    category: 'gym',
    checkCondition: (ctx) => ctx.bareMinWorkoutCount >= 10,
  },
  {
    id: 'pr_machine',
    title: 'PR Machine',
    description: 'Set 10 personal records in a single month.',
    xpReward: 150,
    icon: 'rocket-outline',
    category: 'gym',
    checkCondition: (ctx) => ctx.prCountThisMonth >= 10,
  },

  // ── Nutrition ──────────────────────────────────────────────────────────────
  {
    id: 'first_bite',
    title: 'First Bite',
    description: 'Log your first meal.',
    xpReward: 25,
    icon: 'nutrition-outline',
    category: 'nutrition',
    checkCondition: (ctx) => ctx.mealCount >= 1,
  },
  {
    id: 'macro_sniper',
    title: 'Macro Sniper',
    description: 'Hit all macro targets within 5% for 7 days.',
    xpReward: 150,
    icon: 'checkmark-circle-outline',
    category: 'nutrition',
    checkCondition: (ctx) => ctx.macroTargetDays >= 7,
  },
  {
    id: 'home_chef',
    title: 'Home Chef',
    description: 'Save 10 custom recipes.',
    xpReward: 75,
    icon: 'restaurant-outline',
    category: 'nutrition',
    checkCondition: (ctx) => ctx.recipeCount >= 10,
  },

  // ── Cardio ────────────────────────────────────────────────────────────────
  {
    id: 'first_mile',
    title: 'First Mile',
    description: 'Complete your first cardio session.',
    xpReward: 25,
    icon: 'walk-outline',
    category: 'cardio',
    checkCondition: (ctx) => ctx.cardioCount >= 1,
  },
  {
    id: 'zen_master',
    title: 'Zen Master',
    description: 'Complete 25 low-intensity (Zone 1/2) sessions.',
    xpReward: 100,
    icon: 'leaf-outline',
    category: 'cardio',
    checkCondition: (ctx) => ctx.zenSessionCount >= 25,
  },
  {
    id: 'speed_demon',
    title: 'Speed Demon',
    description: 'Set 3 pace personal records in a single month.',
    xpReward: 150,
    icon: 'speedometer-outline',
    category: 'cardio',
    checkCondition: (ctx) => ctx.paceprCountThisMonth >= 3,
  },

  // ── Cross-Module ──────────────────────────────────────────────────────────
  {
    id: 'all_in',
    title: 'All In',
    description: 'Earn XP in all 4 modules (peptides, gym, nutrition, cardio) in a single day.',
    xpReward: 50,
    icon: 'star-outline',
    category: 'crossModule',
    checkCondition: (ctx) => ctx.allModulesToday,
  },
  {
    id: 'iron_consistency',
    title: 'Iron Consistency',
    description: 'Stay on plan for 30 out of 30 days.',
    xpReward: 300,
    icon: 'shield-checkmark-outline',
    category: 'crossModule',
    checkCondition: (ctx) => ctx.daysOnPlanLast30 >= 30,
  },
];

// Quick lookup by ID
export const ACHIEVEMENT_MAP = new Map<string, AchievementDefinition>(
  ACHIEVEMENT_DEFINITIONS.map((a) => [a.id, a]),
);

// ─── Progress mapping for locked achievements ───────────────────────────────
// Maps achievement IDs to the relevant stats field and target threshold.
// Used by the trophy case to show progress bars on locked cards.

type ProgressMapping = {
  field: string;
  target: number;
};

const ACHIEVEMENT_PROGRESS: Record<string, ProgressMapping> = {
  first_pin:        { field: 'doseCount',          target: 1 },
  protocol_pro:     { field: 'cycleCompleteCount',  target: 1 },
  data_scientist:   { field: 'sideEffectCount',     target: 50 },
  first_rep:        { field: 'workoutCount',         target: 1 },
  century_club:     { field: 'workoutCount',         target: 100 },
  bare_minimum_hero:{ field: 'bareMinWorkoutCount',  target: 10 },
  pr_machine:       { field: 'prCountThisMonth',     target: 10 },
  first_bite:       { field: 'mealCount',            target: 1 },
  home_chef:        { field: 'recipeCount',           target: 10 },
  first_mile:       { field: 'cardioCount',           target: 1 },
  zen_master:       { field: 'zenSessionCount',       target: 25 },
  speed_demon:      { field: 'paceprCountThisMonth',  target: 3 },
};

/**
 * Returns progress { current, target } for a locked achievement, or null
 * if the achievement doesn't have a simple numeric threshold (e.g., macro_sniper,
 * all_in, iron_consistency depend on time-window conditions).
 */
export function getAchievementProgress(
  achievementId: string,
  stats: Record<string, number>,
): { current: number; target: number } | null {
  const mapping = ACHIEVEMENT_PROGRESS[achievementId];
  if (!mapping) return null;
  const current = stats[mapping.field] ?? 0;
  return { current: Math.min(current, mapping.target), target: mapping.target };
}
