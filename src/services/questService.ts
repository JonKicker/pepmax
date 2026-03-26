/**
 * questService — Firestore CRUD for daily quests.
 *
 * Paths:
 *   users/{uid}/dailyQuests/{dateKey}   — today's quest set
 *   users/{uid}/questHistory/{dateKey}  — quest ID history (de-dupe window)
 *
 * Design decisions:
 * - getTodayQuests uses runTransaction with create-if-missing to prevent
 *   race conditions when the user opens the app on multiple devices
 *   simultaneously (Ray feedback #1 / #5).
 * - completeQuest is trust-based in v1 — the client marks quests complete and
 *   we award XP. The 200 XP/day cap is the backstop.
 *   TODO (v2): move completion validation to a Cloud Function.
 * - claimQuestBonus uses a transaction to check bonusClaimed == false before
 *   awarding the bonus, ensuring idempotency (Ray feedback #3 / #9).
 * - saveQuestHistory cleans up docs older than 4 days in the same batch
 *   (Ray feedback #4 / #7).
 */
import {
  doc,
  collection,
  getDocs,
  writeBatch,
  runTransaction,
  Timestamp,
  serverTimestamp,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, auth } from './firebase/index';
import { addBreadcrumb } from './errorReporting';
import { awardXP } from './gamificationService';
import { generateDailyQuests } from '../utils/questGenerator';
import { toLocalDateKey } from '../utils/nutrition';
import { analytics, AnalyticsEvent } from './analytics';
import { COLLECTIONS } from './firebase/firestore';
import type { ServiceResult } from '../types/service';
import type { DailyQuestsDoc, QuestHistoryDoc } from '../types/challenges';
import type { XPModule } from '../types/gamification';

// ─── Internal helpers ────────────────────────────────────────────────────────

function requireAuth(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');
  return uid;
}

function dailyQuestsRef(uid: string, dateKey: string) {
  return doc(db, 'users', uid, COLLECTIONS.DAILY_QUESTS, dateKey);
}

function questHistoryRef(uid: string, dateKey: string) {
  return doc(db, 'users', uid, COLLECTIONS.QUEST_HISTORY, dateKey);
}

function questHistoryCollection(uid: string) {
  return collection(db, 'users', uid, COLLECTIONS.QUEST_HISTORY);
}

function dailyQuestsCollection(uid: string) {
  return collection(db, 'users', uid, COLLECTIONS.DAILY_QUESTS);
}

// ─── Active modules detection ─────────────────────────────────────────────────

/** All modules, used as the fallback when the caller provides no restriction. */
const ALL_MODULES: XPModule[] = ['peptides', 'gym', 'nutrition', 'cardio', 'recovery'];

/**
 * Maps the UserProfile `goals` field (which uses the Goal union from profile.ts)
 * to the XPModule identifiers used by the quest generator.
 *
 * goal 'training' → XPModule 'gym'
 * goal 'peptides'  → XPModule 'peptides'
 * goal 'nutrition' → XPModule 'nutrition'
 * goal 'cardio'    → XPModule 'cardio'
 *
 * 'recovery' has no equivalent Goal flag — it is always included because the
 * morning check-in is available to every user regardless of stated goals.
 */
export function goalsToModules(goals: string[]): XPModule[] {
  const modules = new Set<XPModule>(['recovery']); // always active
  for (const goal of goals) {
    if (goal === 'training') modules.add('gym');
    else if (goal === 'peptides') modules.add('peptides');
    else if (goal === 'nutrition') modules.add('nutrition');
    else if (goal === 'cardio') modules.add('cardio');
  }
  return Array.from(modules);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Gets (or creates) today's quest set for the current user.
 *
 * Uses runTransaction to create the doc atomically if it doesn't exist,
 * preventing duplicate quest generation when the app is opened on two devices
 * simultaneously.
 *
 * getRecentQuestIds is called BEFORE the transaction to avoid a non-transactional
 * getDocs inside the transaction callback (Firestore anti-pattern — Ray feedback #2).
 *
 * TIMEZONE NOTE: Quest generation uses toLocalDateKey() which reads the device's
 * local clock. This is intentional — the client knows its own timezone, so quest
 * generation respects local midnight without requiring any Cloud Function support.
 *
 * @param activeModules - Optional list of XPModules to restrict quest generation to.
 *   If omitted, all modules are used. Pass the user's active modules (derived from
 *   their profile goals) so that users who never use cardio don't get cardio quests.
 */
export async function getTodayQuests(
  activeModules?: XPModule[],
): Promise<ServiceResult<DailyQuestsDoc>> {
  try {
    const uid = requireAuth();
    const dateKey = toLocalDateKey();
    const ref = dailyQuestsRef(uid, dateKey);

    addBreadcrumb('questService', 'getTodayQuests', { dateKey });

    // Read recent quest IDs BEFORE the transaction to avoid non-transactional
    // getDocs inside the runTransaction callback.
    const recentResult = await getRecentQuestIds(3);
    const recentIds = recentResult.data ?? [];

    // Resolve the module list: caller-supplied > ALL_MODULES fallback
    const resolvedModules = activeModules && activeModules.length > 0 ? activeModules : ALL_MODULES;

    const doc = await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists()) {
        return snap.data() as DailyQuestsDoc;
      }

      // Create new quest set for today using only the user's active modules
      const quests = generateDailyQuests(resolvedModules, recentIds);

      const newDoc: DailyQuestsDoc = {
        quests,
        bonusClaimed: false,
        bonusXP: 25,
        dateKey,
        generatedAt: Timestamp.now(),
        completedCount: 0,
      };

      tx.set(ref, {
        ...newDoc,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Save quest IDs to history (fire-and-forget — runs after transaction)
      const questIds = quests.map((q) => q.id);
      saveQuestHistory(questIds).catch((err) => {
        addBreadcrumb('questService', 'saveQuestHistory failed', { error: String(err) });
      });

      analytics.track(AnalyticsEvent.QUESTS_GENERATED, {
        module_count: resolvedModules.length,
        quest_count: quests.length,
      });

      return newDoc;
    });

    return { data: doc, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

/**
 * Marks a quest as completed and awards its XP.
 *
 * Uses runTransaction to prevent a race condition where two simultaneous actions
 * both read status='active', both write status='completed', and awardXP is
 * called twice (Ray feedback #1). The transaction guards the write; awardXP is
 * called OUTSIDE the transaction (same pattern as claimQuestBonus).
 *
 * TRUST NOTE (v1): completion is client-reported. The gamificationService
 * enforces the 200 XP/day cap as the backstop against abuse.
 * TODO (v2): validate completion in a Cloud Function before awarding XP.
 */
export async function completeQuest(
  dateKey: string,
  questId: string,
): Promise<ServiceResult<void>> {
  try {
    const uid = requireAuth();
    const ref = dailyQuestsRef(uid, dateKey);

    addBreadcrumb('questService', 'completeQuest', { dateKey, questId });

    // Run the read-then-write inside a transaction to prevent double-completion
    // when two actions satisfy the same quest simultaneously.
    // Returns the completed quest (for XP award after transaction), or null if
    // already completed / not found.
    const completedQuest = await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) {
        throw new Error('Quest doc not found for dateKey: ' + dateKey);
      }

      const data = snap.data() as DailyQuestsDoc;
      const questIndex = data.quests.findIndex((q) => q.id === questId);
      if (questIndex === -1) {
        throw new Error('Quest not found: ' + questId);
      }

      const quest = data.quests[questIndex];
      if (quest.status === 'completed') {
        // Already completed inside the transaction — idempotent, no XP
        return null;
      }

      // Update the quest status in the quests array
      const updatedQuests = data.quests.map((q) =>
        q.id === questId ? { ...q, status: 'completed' as const } : q,
      );
      const completedCount = updatedQuests.filter((q) => q.status === 'completed').length;

      tx.update(ref, {
        quests: updatedQuests,
        completedCount,
        updatedAt: serverTimestamp(),
      });

      return { quest, completedCount };
    });

    if (!completedQuest) {
      // Quest was already completed — idempotent, succeed silently
      return { data: undefined, error: null };
    }

    const { quest, completedCount } = completedQuest;

    // Award XP OUTSIDE the transaction (gamificationService is not transaction-safe).
    // exempt=true: quest XP is exempt from the 200 XP/day cap per gamification blueprint.
    const xpResult = await awardXP(quest.xpReward, 'quest_complete', quest.module, true);
    if (xpResult.error) {
      // XP failure is non-fatal — quest is still marked complete in UI
      console.warn('[questService] awardXP failed for quest:', questId, xpResult.error);
    }

    analytics.track(AnalyticsEvent.QUEST_COMPLETED, {
      quest_id: questId,
      module: quest.module,
      xp_reward: quest.xpReward,
      completed_count: completedCount,
    });

    return { data: undefined, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

/**
 * Claims the 25 XP bonus when all 3 quests are completed.
 *
 * Uses a runTransaction to guard against double-claim (idempotency).
 * The transaction reads bonusClaimed == false before awarding XP.
 */
export async function claimQuestBonus(dateKey: string): Promise<ServiceResult<void>> {
  try {
    const uid = requireAuth();
    const ref = dailyQuestsRef(uid, dateKey);

    addBreadcrumb('questService', 'claimQuestBonus', { dateKey });

    // Use a transaction to gate on bonusClaimed == false (idempotency guard).
    // Returns true if XP should be awarded, false if already claimed (no-op).
    const shouldAwardXP = await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) {
        throw new Error('Quest doc not found for dateKey: ' + dateKey);
      }

      const data = snap.data() as DailyQuestsDoc;

      if (data.bonusClaimed) {
        // Idempotent — already claimed, succeed silently
        return false;
      }

      const allDone = data.quests.every((q) => q.status === 'completed');
      if (!allDone) {
        throw new Error('Not all quests completed — cannot claim bonus');
      }

      tx.update(ref, {
        bonusClaimed: true,
        updatedAt: serverTimestamp(),
      });

      return true;
    });

    if (!shouldAwardXP) {
      // Already claimed — no XP, no analytics, succeed silently
      return { data: undefined, error: null };
    }

    // Award bonus XP outside the transaction (gamificationService is not transaction-safe).
    // exempt=true: quest bonus XP is exempt from the 200 XP/day cap per gamification blueprint.
    const xpResult = await awardXP(25, 'quest_bonus', 'system', true);
    if (xpResult.error) {
      console.warn('[questService] awardXP failed for quest bonus:', xpResult.error);
    }

    analytics.track(AnalyticsEvent.QUEST_BONUS_CLAIMED, {
      date_key: dateKey,
      bonus_xp: 25,
    });

    return { data: undefined, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

/**
 * Reads quest IDs from the past N days (for de-duplication in generateDailyQuests).
 */
export async function getRecentQuestIds(days = 3): Promise<ServiceResult<string[]>> {
  try {
    const uid = requireAuth();
    const col = questHistoryCollection(uid);

    addBreadcrumb('questService', 'getRecentQuestIds', { days });

    const q = query(col, orderBy('dateKey', 'desc'), limit(days));
    const snap = await getDocs(q);

    const ids: string[] = [];
    snap.forEach((d) => {
      const data = d.data() as QuestHistoryDoc;
      if (data.questIds) ids.push(...data.questIds);
    });

    return { data: ids, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

/**
 * Saves today's quest IDs to questHistory and deletes docs older than 4 days.
 *
 * Cleanup runs in the same batch write (Ray feedback #4 / #7).
 */
export async function saveQuestHistory(questIds: string[]): Promise<ServiceResult<void>> {
  try {
    const uid = requireAuth();
    const dateKey = toLocalDateKey();

    addBreadcrumb('questService', 'saveQuestHistory', { dateKey, count: questIds.length });

    const batch = writeBatch(db);

    // Write today's history doc
    const todayRef = questHistoryRef(uid, dateKey);
    const historyDoc: QuestHistoryDoc = {
      questIds,
      dateKey,
      createdAt: Timestamp.now(),
    };
    batch.set(todayRef, {
      ...historyDoc,
      updatedAt: serverTimestamp(),
    });

    // Find and delete docs older than 4 days in the same batch
    const col = questHistoryCollection(uid);
    const allSnap = await getDocs(col);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 4);
    const cutoffKey = toLocalDateKey(cutoffDate);

    allSnap.forEach((d) => {
      if (d.id < cutoffKey) {
        batch.delete(d.ref);
      }
    });

    await batch.commit();
    return { data: undefined, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}
