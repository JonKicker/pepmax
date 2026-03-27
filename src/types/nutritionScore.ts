/**
 * Types for the v2 nutrition scoring system (0-100) with fiber, micronutrients,
 * and NOVA group processed-food penalty.
 *
 * These types are consumed by nutritionScorer.ts (utility), useMealScores.ts (hook),
 * MealScoreCard.tsx (overlay), and the weekly comparison feature.
 */

import type { MealSlot } from './nutrition';

// ─── Score breakdown ───────────────────────────────────────────────────────────

/**
 * Per-category contribution to the final 0-100 meal score.
 * Protein, fiber, balance, and microBonus each contribute up to 25 points.
 * processedPenalty is a negative value (0 to -15).
 */
export interface NutritionScoreBreakdown {
  /** Protein contribution (0-25): how well the meal hits per-meal protein target (daily/3). */
  proteinScore: number;
  /** Fiber contribution (0-25): how well the meal hits 8g fiber target. */
  fiberScore: number;
  /** Macro balance contribution (0-25): closeness of macro ratio to daily targets. */
  balanceScore: number;
  /** Micronutrient bonus (0-25): 5pts each for vitaminD, iron, calcium, potassium, magnesium. */
  microBonus: number;
  /** Processed food penalty (0 to -15): deducted when >40% calories are from NOVA 4 foods. */
  processedPenalty: number;
}

// ─── Per-meal result ──────────────────────────────────────────────────────────

/**
 * Full scoring result for one meal slot.
 */
export interface NutritionScoreResult {
  /** Overall score, clamped to [0, 100]. */
  score: number;
  /** Granular breakdown of how the score was computed. */
  breakdown: NutritionScoreBreakdown;
  /** Plain-English feedback for the weakest scoring area. */
  feedback: string;
  /** 1-3 actionable tips derived from the breakdown. */
  tips: string[];
}

// ─── Daily aggregate ──────────────────────────────────────────────────────────

/**
 * Daily nutrition score aggregate using the v2 scorer.
 * Mirrors DailyNutritionScore shape for easy swap in callers.
 */
export interface DailyNutritionScoreV2 {
  /**
   * Average of scored default slot scores for the day (0-100).
   * Null when no default slots have any entries.
   */
  dailyScore: number | null;
  /**
   * Per-slot NutritionScoreResult objects, keyed by slot id.
   * Only scored (non-empty) slots are included.
   */
  slotScores: Record<string, NutritionScoreResult>;
}

// ─── MealScoreCard overlay props ─────────────────────────────────────────────

/**
 * Props for the MealScoreCard overlay component.
 */
export interface MealScoreCardProps {
  /** Whether the card is visible. */
  visible: boolean;
  /** The score result to display. */
  result: NutritionScoreResult;
  /** Meal slot label shown in the header. */
  mealSlotLabel: string;
  /** Callback when the user dismisses or taps "Got it". */
  onDismiss: () => void;
  /**
   * Feature flag — when false the card never shows.
   * Passed from the parent so it can be toggled without unmounting.
   */
  enabled?: boolean;
}

// ─── Convenience re-export for recovery integration ──────────────────────────

/** Minimal shape consumed by the recovery readiness feature (same as v1). */
export type NutritionScoreV2ForRecovery = {
  dailyScore: number | null;
};

// ─── NOVA group type ──────────────────────────────────────────────────────────

/** NOVA food processing classification (1 = unprocessed, 4 = ultra-processed). */
export type NovaGroup = 1 | 2 | 3 | 4;
