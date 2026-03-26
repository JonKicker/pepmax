/**
 * Types for Challenges, Duels, and Daily Quests.
 *
 * Phase 1 — schema only. Services wire these in Phase 2.
 *
 * NOTE on loserBadgeEnabled: deferred to v2. Server-side duel validation does
 * not exist yet, so client-issued loser badges would be trivially exploitable.
 * The field is intentionally absent from DuelDoc in v1.
 */
import { Timestamp } from 'firebase/firestore';
import type { XPModule, XPSource } from './gamification';

// ─── Challenges ─────────────────────────────────────────────────────────────

export type ChallengeType = 'distance' | 'volume' | 'consistency' | 'cross_module';

export type ChallengeStatus = 'upcoming' | 'active' | 'completed';

export type ChallengeDoc = {
  id: string;
  title: string;
  description: string;
  type: ChallengeType;
  status: ChallengeStatus;
  targetValue: number;
  targetUnit: string;
  xpReward: number;
  /** Optional badge ID unlocked on completion */
  badgeId?: string;
  startDate: Timestamp;
  endDate: Timestamp;
  participantCount: number;
  category: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type ChallengeParticipantDoc = {
  uid: string;
  username: string;
  displayHandle: string;
  progress: number;
  completedAt?: Timestamp;
  joinedAt: Timestamp;
};

// ─── Duels ───────────────────────────────────────────────────────────────────

export type DuelMetric = 'volume_lifted' | 'distance_run' | 'days_on_plan' | 'xp_earned';

export type DuelStatus = 'pending' | 'active' | 'completed' | 'declined' | 'expired';

/**
 * DuelDoc — v1.
 *
 * loserBadgeEnabled is intentionally omitted. Per Ray's feedback, loser badges
 * require server-side duel validation (Cloud Function) before they can be
 * trusted. Will be added in v2 alongside the validation Cloud Function.
 */
export type DuelDoc = {
  id: string;
  challengerUid: string;
  opponentUid: string;
  challengerUsername: string;
  opponentUsername: string;
  metric: DuelMetric;
  durationWeeks: number;
  status: DuelStatus;
  challengerProgress: number;
  opponentProgress: number;
  /** Set when status transitions to 'completed' */
  winnerId?: string;
  startDate?: Timestamp;
  endDate?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

// ─── Daily Quests ─────────────────────────────────────────────────────────────

export type QuestConditionType =
  | 'log_dose'
  | 'complete_workout'
  | 'complete_workout_bare'
  | 'log_breakfast'
  | 'log_all_meals'
  | 'log_three_meals'
  | 'hit_protein_target'
  | 'log_weight'
  | 'complete_cardio'
  | 'cardio_15_min'
  | 'run_one_mile'
  | 'log_symptom'
  | 'morning_checkin'
  | 'log_water'
  | 'fasting_window_hit';

export type Quest = {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  module: XPModule;
  conditionType: QuestConditionType;
  /** Optional numeric target associated with the condition (e.g. minutes, miles) */
  conditionTarget?: number;
  status: 'active' | 'completed';
};

/**
 * DailyQuestsDoc — stored at users/{uid}/dailyQuests/{dateKey}.
 *
 * Created via runTransaction (create-if-missing) on first read of the day to
 * prevent race conditions when the user opens the app on multiple devices
 * simultaneously. See questService.getTodayQuests().
 *
 * TRUST NOTE: quest completion is client-reported in v1. The 200 XP/day cap in
 * gamificationService acts as the backstop against abuse. Cloud Function
 * validation is tracked as a v2 TODO.
 */
export type DailyQuestsDoc = {
  quests: Quest[];
  bonusClaimed: boolean;
  /** Fixed 25 XP awarded when all 3 quests are completed */
  bonusXP: 25;
  dateKey: string;
  generatedAt: Timestamp;
  completedCount: number;
};

/**
 * QuestHistoryDoc — stored at users/{uid}/questHistory/{dateKey}.
 *
 * Tracks which quest IDs were shown on a given day so the generator can
 * avoid repeating quests for the past N days.
 */
export type QuestHistoryDoc = {
  questIds: string[];
  dateKey: string;
  createdAt: Timestamp;
};

// ─── Monthly Challenge Calendar ────────────────────────────────────────────────

export type MonthlyChallengeCalendar = {
  /** 'YYYY-MM' */
  monthKey: string;
  challenges: ChallengeDoc[];
  themeName: string;
  themeDescription: string;
  createdAt: Timestamp;
};

// ─── Progress Coordinator ─────────────────────────────────────────────────────

/**
 * ProgressAction — the canonical shape dispatched to progressCoordinator after
 * any XP-earning user action.
 *
 * Phase 2 consumers: quest completion check.
 * Future consumers: challenge progress, duel progress updates.
 */
export type ProgressAction = {
  source: XPSource;
  module: XPModule;
  metadata: Record<string, number>;
};
