/**
 * questGenerator — pure function that selects 3 daily quests from the pool.
 *
 * Selection algorithm:
 * 1. Filter pool by modules the user has active.
 * 2. Remove quests whose IDs appear in recentQuestIds (shown in past N days).
 * 3. If the filtered pool has fewer than 3 quests (edge case: all recently used),
 *    fall back to ignoring recency to ensure we always return 3.
 * 4. Weight candidates by inverse module-frequency among already-selected quests
 *    so that the final 3 span at least 2 different modules.
 * 5. Always shuffle before final selection to add daily variety.
 *
 * Pure function — no side effects, no Firestore. Fully unit-testable.
 */

import type { Quest, QuestConditionType } from '../types/challenges';
import type { XPModule } from '../types/gamification';

// ─── Quest pool definition ────────────────────────────────────────────────────

type QuestTemplate = Omit<Quest, 'status'>;

export const QUEST_POOL: QuestTemplate[] = [
  // ── Nutrition ────────────────────────────────────────────────────────────
  {
    id: 'nutrition_log_breakfast',
    title: 'Early Bird',
    description: 'Log breakfast before 10 AM',
    xpReward: 15,
    module: 'nutrition',
    conditionType: 'log_breakfast' as QuestConditionType,
  },
  {
    id: 'nutrition_log_all_meals',
    title: 'Full Day Logger',
    description: 'Log all meals today',
    xpReward: 20,
    module: 'nutrition',
    conditionType: 'log_all_meals' as QuestConditionType,
  },
  {
    id: 'nutrition_hit_protein',
    title: 'Protein Pusher',
    description: 'Hit your protein target today',
    xpReward: 15,
    module: 'nutrition',
    conditionType: 'hit_protein_target' as QuestConditionType,
  },
  {
    id: 'nutrition_log_weight',
    title: 'Scale Check',
    description: 'Log your weight today',
    xpReward: 10,
    module: 'nutrition',
    conditionType: 'log_weight' as QuestConditionType,
  },
  {
    id: 'nutrition_fasting_window',
    title: 'Window Watcher',
    description: 'Stay within your eating window today',
    xpReward: 10,
    module: 'nutrition',
    conditionType: 'fasting_window_hit' as QuestConditionType,
  },
  {
    id: 'nutrition_log_three_meals',
    title: 'Three-Meal Day',
    description: 'Log at least 3 meals today',
    xpReward: 15,
    module: 'nutrition',
    conditionType: 'log_three_meals' as QuestConditionType,
  },

  // ── Gym ──────────────────────────────────────────────────────────────────
  {
    id: 'gym_complete_workout',
    title: 'Grind Session',
    description: 'Complete your planned workout',
    xpReward: 20,
    module: 'gym',
    conditionType: 'complete_workout' as QuestConditionType,
  },
  {
    id: 'gym_five_sets',
    title: 'Five-Set Focus',
    description: 'Log at least 5 sets today',
    xpReward: 15,
    module: 'gym',
    conditionType: 'complete_workout' as QuestConditionType,
    conditionTarget: 5,
  },
  {
    id: 'gym_bare_minimum',
    title: 'Show Up',
    description: 'Do a bare minimum workout',
    xpReward: 15,
    module: 'gym',
    conditionType: 'complete_workout_bare' as QuestConditionType,
  },

  // ── Cardio ────────────────────────────────────────────────────────────────
  {
    id: 'cardio_15_min',
    title: 'Sweat It Out',
    description: 'Do any cardio for 15+ minutes',
    xpReward: 15,
    module: 'cardio',
    conditionType: 'cardio_15_min' as QuestConditionType,
    conditionTarget: 15,
  },
  {
    id: 'cardio_one_mile',
    title: 'Mile Marker',
    description: 'Run or walk 1 mile',
    xpReward: 20,
    module: 'cardio',
    conditionType: 'run_one_mile' as QuestConditionType,
    conditionTarget: 1,
  },
  {
    id: 'cardio_session',
    title: 'Cardio Day',
    description: 'Complete a cardio session',
    xpReward: 15,
    module: 'cardio',
    conditionType: 'complete_cardio' as QuestConditionType,
  },

  // ── Peptides ─────────────────────────────────────────────────────────────
  {
    id: 'peptides_log_dose',
    title: 'On Schedule',
    description: 'Log your scheduled dose',
    xpReward: 15,
    module: 'peptides',
    conditionType: 'log_dose' as QuestConditionType,
  },
  {
    id: 'peptides_log_symptom',
    title: 'Symptom Tracker',
    description: 'Log a symptom entry',
    xpReward: 10,
    module: 'peptides',
    conditionType: 'log_symptom' as QuestConditionType,
  },

  // ── Recovery ─────────────────────────────────────────────────────────────
  {
    id: 'recovery_morning_checkin',
    title: 'Rise & Check',
    description: 'Complete morning check-in',
    xpReward: 15,
    module: 'recovery',
    conditionType: 'morning_checkin' as QuestConditionType,
  },
  {
    id: 'recovery_log_water',
    title: 'Stay Hydrated',
    description: 'Log your water intake',
    xpReward: 10,
    module: 'recovery',
    conditionType: 'log_water' as QuestConditionType,
  },
];

// ─── Selection algorithm ──────────────────────────────────────────────────────

/**
 * Deterministically seeded Fisher-Yates shuffle.
 * Uses a simple LCG (not crypto-grade) — good enough for UI randomness.
 */
function shuffleWithSeed<T>(arr: T[], seed: number): T[] {
  const copy = [...arr];
  let s = seed;
  for (let i = copy.length - 1; i > 0; i--) {
    // LCG step
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Counts how many quests in `selected` belong to each module.
 * Used to weight future selections toward under-represented modules.
 */
function moduleFrequency(selected: QuestTemplate[]): Map<XPModule, number> {
  const freq = new Map<XPModule, number>();
  for (const q of selected) {
    freq.set(q.module, (freq.get(q.module) ?? 0) + 1);
  }
  return freq;
}

/**
 * Generates a set of 3 daily quests for the user.
 *
 * @param activeModules  Modules the user is actively using (e.g. 'gym', 'nutrition').
 *                       'system' is never a quest module; pass it if you want but it
 *                       will produce no quests from the pool.
 * @param recentQuestIds Quest IDs shown in the past N days (de-dupe window).
 * @param seed           Optional seed for deterministic shuffle (defaults to today's
 *                       date as an integer, giving the same result per calendar day).
 */
export function generateDailyQuests(
  activeModules: XPModule[],
  recentQuestIds: string[],
  seed?: number,
): Quest[] {
  const modulesSet = new Set(activeModules);
  const recentSet = new Set(recentQuestIds);

  // Step 1: filter by active modules
  const moduleFiltered = QUEST_POOL.filter((q) => modulesSet.has(q.module));

  // Step 2: remove recently used; fall back to module-filtered if too few remain
  let candidates = moduleFiltered.filter((q) => !recentSet.has(q.id));
  if (candidates.length < 3) {
    // All or nearly all quests were recently used — ignore recency to prevent stalling
    candidates = moduleFiltered.length >= 3 ? moduleFiltered : QUEST_POOL;
  }

  // Step 3: shuffle for variety
  const effectiveSeed = seed ?? _todaySeed();
  const shuffled = shuffleWithSeed(candidates, effectiveSeed);

  // Step 4: pick 3 with diversity bias — prefer different modules for each pick
  const selected: QuestTemplate[] = [];

  for (const candidate of shuffled) {
    if (selected.length === 3) break;
    const freq = moduleFrequency(selected);
    // Bias: skip if this module is already over-represented AND we still have enough quests
    const remaining = shuffled.filter((q) => !selected.includes(q));
    const otherModuleCount = remaining.filter((q) => q.module !== candidate.module).length;
    const alreadyHasThisModule = freq.has(candidate.module);

    if (selected.length === 2 && alreadyHasThisModule && otherModuleCount > 0) {
      // Try to find a different module for the 3rd slot
      continue;
    }
    selected.push(candidate);
  }

  // Fallback: if diversity pass didn't fill 3 (shouldn't happen with >=3 candidates), fill greedily
  if (selected.length < 3) {
    for (const q of shuffled) {
      if (selected.length === 3) break;
      if (!selected.includes(q)) selected.push(q);
    }
  }

  return selected.map((q) => ({ ...q, status: 'active' as const }));
}

/**
 * Returns today's date as a numeric seed: YYYYMMDD integer.
 * Same calendar day always produces the same quest set.
 */
function _todaySeed(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}
