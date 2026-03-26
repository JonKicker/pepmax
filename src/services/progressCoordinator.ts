/**
 * progressCoordinator — unified dispatcher for XP-earning actions.
 *
 * Every module calls this after completing an action that awards XP.
 * The coordinator fans out to all downstream consumers without the caller
 * needing to know which systems care about which actions.
 *
 * Phase 2: dispatches to quest completion check.
 * Phase 3 (current): also dispatches challenge progress updates.
 * Future phases: duel progress updates.
 *
 * Never throws. All errors are caught internally.
 */
import type { ProgressAction } from '../types/challenges';

// ─── Consumer interface ───────────────────────────────────────────────────────

/**
 * A progress consumer receives actions and updates its own state.
 * All consumers must be fire-and-forget safe — they catch their own errors.
 */
type ProgressConsumer = (action: ProgressAction) => void;

// ─── Registered consumers ─────────────────────────────────────────────────────
// Add new consumers here as features are built.

const consumers: ProgressConsumer[] = [
  // Phase 2: quest auto-completion check
  // Imported inline to avoid circular dependency risks at module load time.
  (action) => {
    questProgressConsumer(action);
  },
  // Phase 3: challenge progress updates
  (action) => {
    challengeProgressConsumer(action);
  },
  // Phase 4: duel progress updates
  (action) => {
    duelProgressConsumer(action);
  },
];

// ─── Quest consumer ───────────────────────────────────────────────────────────

/**
 * Checks whether the given action satisfies any incomplete quests for today
 * and marks them complete if so.
 *
 * In Phase 2 this is deliberately lightweight — it maps XPSource values to
 * QuestConditionTypes and calls questService.completeQuest for matching quests.
 * The full quest doc read is fire-and-forget; quest UI refreshes via the hook's
 * useFocusEffect, not via real-time listener.
 */
function questProgressConsumer(action: ProgressAction): void {
  // Deferred import avoids circular dependency (questService → gamificationService
  // → (indirectly) progressCoordinator if we ever call back into it).
  Promise.resolve()
    .then(async () => {
      const { getTodayQuests, completeQuest } = await import('./questService');
      const { toLocalDateKey } = await import('../utils/nutrition');

      const dateKey = toLocalDateKey();
      const result = await getTodayQuests();
      if (result.error || !result.data) return;

      const { quests } = result.data;

      for (const quest of quests) {
        if (quest.status === 'completed') continue;

        if (questMatchesAction(quest.conditionType, action)) {
          // Fire-and-forget — quest completion failure must never block the caller
          completeQuest(dateKey, quest.id).catch(() => {});
        }
      }
    })
    .catch(() => {
      // Silent — quest side-effects must not surface to the user
    });
}

/**
 * Maps a quest conditionType to an XPSource/module from the ProgressAction.
 *
 * This is the only place that knows which actions satisfy which quests.
 * Keep this mapping in sync with QUEST_POOL in questGenerator.ts.
 *
 * v1: condition matching is binary (action happened = quest complete).
 * conditionTarget is not validated against metadata. Trust-based, backstopped
 * by 200 XP/day cap.
 */
function questMatchesAction(
  conditionType: string,
  action: ProgressAction,
): boolean {
  const { source, module } = action;

  switch (conditionType) {
    // Peptides
    case 'log_dose':
      return source === 'log_dose';
    case 'log_symptom':
      return module === 'peptides'; // side-effect log has no dedicated XPSource

    // Gym
    case 'complete_workout':
      return source === 'complete_workout';
    case 'complete_workout_bare':
      return source === 'complete_workout_bare';

    // Nutrition
    // v1 approximation: we only have 'log_all_meals' as an XPSource and cannot
    // distinguish individual meal types at the XP level.
    // log_breakfast completes when all meals are logged (implies breakfast was logged).
    // TODO (v2): add granular meal-type XPSource for proper quest matching
    case 'log_breakfast':
    // log_three_meals has the same v1 approximation as log_breakfast above.
    // TODO (v2): add granular meal-type XPSource for proper quest matching
    case 'log_three_meals':
    case 'log_all_meals':
      return source === 'log_all_meals';
    case 'hit_protein_target':
      return source === 'macro_targets_hit';
    // TODO (v2): add a dedicated 'log_weight' XPSource. Weight is logged from the
    // nutrition tab, so if the user also logs meals they'll get credit (v1 approximation).
    case 'log_weight':
      return module === 'nutrition' && (source === 'log_all_meals' || source === 'macro_targets_hit');

    // Cardio
    case 'complete_cardio':
    case 'cardio_15_min':
    case 'run_one_mile':
      return source === 'complete_cardio';

    // Recovery
    case 'morning_checkin':
      return source === 'recovery_checkin';
    case 'log_water':
      return module === 'recovery';

    // Nutrition — Intermittent Fasting
    case 'fasting_window_hit':
      return source === 'fasting_complete';

    default:
      return false;
  }
}

// ─── Challenge consumer ───────────────────────────────────────────────────────

/**
 * Maps a ProgressAction to challenge progress delta and updates all active
 * challenges the user has joined.
 *
 * - workout_completion → volume challenges use metadata.volume
 * - cardio completion  → distance challenges use metadata.distance
 * - meal log / cardio  → consistency challenges increment by 1
 * - All other sources → no-op for challenges
 *
 * Fire-and-forget — never throws, never blocks caller.
 */
function challengeProgressConsumer(action: ProgressAction): void {
  Promise.resolve()
    .then(async () => {
      const { source, metadata } = action;

      // Determine which challenge types this action is relevant for
      type ChallengeUpdateSpec = { type: string; delta: number };
      const specs: ChallengeUpdateSpec[] = [];

      if (source === 'complete_workout') {
        const volume = typeof metadata.volume === 'number' ? metadata.volume : 0;
        if (volume > 0) {
          specs.push({ type: 'volume', delta: volume });
        }
        // Workout completion counts as consistency
        specs.push({ type: 'consistency', delta: 1 });
        // Cross-module counts everything
        specs.push({ type: 'cross_module', delta: 1 });
      } else if (source === 'complete_cardio') {
        const distance = typeof metadata.distance === 'number' ? metadata.distance : 0;
        if (distance > 0) {
          specs.push({ type: 'distance', delta: distance });
        }
        // Cardio also counts as consistency
        specs.push({ type: 'consistency', delta: 1 });
        specs.push({ type: 'cross_module', delta: 1 });
      } else if (source === 'log_all_meals' || source === 'macro_targets_hit') {
        specs.push({ type: 'consistency', delta: 1 });
        specs.push({ type: 'cross_module', delta: 1 });
      } else if (source === 'fasting_complete') {
        // Completing a fasting window counts as both consistency and cross-module progress
        specs.push({ type: 'consistency', delta: 1 });
        specs.push({ type: 'cross_module', delta: 1 });
      }

      if (specs.length === 0) return;

      const { getMyActiveChallengeIds, getChallengeDetail, updateChallengeProgress } =
        await import('./challengeService');

      const idsResult = await getMyActiveChallengeIds();
      if (idsResult.error || !idsResult.data || idsResult.data.length === 0) return;

      await Promise.all(
        idsResult.data.map(async (challengeId) => {
          const detailResult = await getChallengeDetail(challengeId);
          if (detailResult.error || !detailResult.data) return;

          const challengeType = detailResult.data.type;
          const matchingSpec = specs.find((s) => s.type === challengeType);
          if (!matchingSpec) return;

          // Fire-and-forget — failure must not surface to user
          updateChallengeProgress(challengeId, matchingSpec.delta).catch(() => {});
        }),
      );
    })
    .catch(() => {
      // Silent — challenge side-effects must not surface to the user
    });
}

// ─── Duel consumer ────────────────────────────────────────────────────────────

/**
 * Maps a ProgressAction to duel metric progress deltas and updates all active
 * duels the user participates in.
 *
 * XP source → duel metric mapping:
 *   complete_workout / complete_workout_bare → volume_lifted (metadata.volume)
 *   complete_cardio                          → distance_run (metadata.distance)
 *   log_all_meals / macro_targets_hit        → days_on_plan (increment by 1)
 *   Any XP source                            → xp_earned (metadata.xpAwarded)
 *
 * v1 SECURITY NOTE: progressDelta is derived from client-supplied metadata.
 * See duelService.ts module-level comment for full rationale.
 *
 * Fire-and-forget — never throws, never blocks caller.
 */
function duelProgressConsumer(action: ProgressAction): void {
  Promise.resolve()
    .then(async () => {
      const { source, metadata } = action;

      // Build per-metric deltas from this action
      type DuelUpdate = { metric: string; delta: number };
      const updates: DuelUpdate[] = [];

      // volume_lifted from workout completion
      if (source === 'complete_workout' || source === 'complete_workout_bare') {
        const volume = typeof metadata.volume === 'number' ? metadata.volume : 0;
        if (volume > 0) {
          updates.push({ metric: 'volume_lifted', delta: volume });
        }
      }

      // distance_run from cardio completion
      if (source === 'complete_cardio') {
        const distance = typeof metadata.distance === 'number' ? metadata.distance : 0;
        if (distance > 0) {
          updates.push({ metric: 'distance_run', delta: distance });
        }
      }

      // days_on_plan: any meal-logging or fasting completion counts as 1 day
      // fasting_complete: completing a full fasting window without breaking early also
      // signals the user is adhering to their nutrition plan, so it increments days_on_plan.
      if (source === 'log_all_meals' || source === 'macro_targets_hit' || source === 'fasting_complete') {
        updates.push({ metric: 'days_on_plan', delta: 1 });
      }

      // xp_earned: always track regardless of source
      const xpAwarded = typeof metadata.xpAwarded === 'number' ? metadata.xpAwarded : 0;
      if (xpAwarded > 0) {
        updates.push({ metric: 'xp_earned', delta: xpAwarded });
      }

      if (updates.length === 0) return;

      const { getActiveDuelIds, updateMyDuelProgress, getDuelDetail } =
        await import('./duelService');

      const idsResult = await getActiveDuelIds();
      if (idsResult.error || !idsResult.data || idsResult.data.length === 0) return;

      await Promise.all(
        idsResult.data.map(async (duelId) => {
          const detailResult = await getDuelDetail(duelId);
          if (detailResult.error || !detailResult.data) return;

          const duelMetric = detailResult.data.metric;
          const matchingUpdate = updates.find((u) => u.metric === duelMetric);
          if (!matchingUpdate) return;

          // Fire-and-forget — failure must not surface to user
          updateMyDuelProgress(duelId, matchingUpdate.delta).catch(() => {});
        }),
      );
    })
    .catch(() => {
      // Silent — duel side-effects must not surface to the user
    });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Dispatches a completed action to all registered progress consumers.
 *
 * Fire-and-forget — this function never throws.
 * Callers (e.g. useXP hook) invoke this after a successful awardXP call.
 */
export function onActionCompleted(action: ProgressAction): void {
  for (const consumer of consumers) {
    try {
      consumer(action);
    } catch {
      // Swallow — one failing consumer must not block others
    }
  }
}
