/**
 * quizUtils.ts — Pure utility functions for the onboarding quiz.
 * NO runtime imports from React, Firebase, or React Native — fully unit-testable.
 *
 * The Goal type is inlined here (mirrors profile.ts) to avoid pulling in
 * firebase/firestore (ESM) during Jest runs.
 */

// Mirror of Goal from profile.ts — kept in sync manually.
// Do not add values here without also adding them to profile.ts.
type Goal = 'peptides' | 'nutrition' | 'training' | 'cardio';

/**
 * Activity level as a human-readable category.
 * Maps to a numeric TDEE multiplier via ACTIVITY_MULTIPLIER.
 * Defined here (not in ActivityLevelStep) so it can be imported without
 * pulling in React Native / Expo modules.
 */
export type ActivityCategory = 'sedentary' | 'light' | 'moderate' | 'active';

// ── Step-skip logic ──────────────────────────────────────────────────────────

/**
 * Returns true when RecoveryStep (step 11) should be skipped.
 * Ray's requirement: skip when user hasn't selected training OR cardio.
 */
export function shouldSkipRecovery(goals: Goal[]): boolean {
  return !goals.includes('training') && !goals.includes('cardio');
}

/**
 * Given the current step and goals, return the next step number
 * (accounting for conditional skips).
 */
export function nextStep(currentStep: number, goals: Goal[]): number {
  const candidate = currentStep + 1;
  if (candidate === 11 && shouldSkipRecovery(goals)) {
    return 12; // skip RecoveryStep
  }
  return candidate;
}

/**
 * Given a list of visited steps, pop the last one to navigate back.
 * Returns [previousStep, newVisitedArray].
 * Does NOT mutate the input array.
 */
export function prevStep(visitedSteps: number[]): [number, number[]] {
  if (visitedSteps.length === 0) return [1, []];
  const copy = [...visitedSteps];
  const prev = copy.pop()!;
  return [prev, copy];
}

// ── Personal note sanitisation ────────────────────────────────────────────────

/**
 * Trim whitespace and strip ASCII control characters from the personal note.
 * Also hard-caps at 100 chars (Firestore rule enforces this server-side too).
 * Ray's requirement.
 */
export function sanitisePersonalNote(raw: string): string {
  // Remove control characters (ASCII 0–31, 127), then trim, then cap
  // eslint-disable-next-line no-control-regex
  return raw.replace(/[\x00-\x1F\x7F]/g, '').trim().slice(0, 100);
}

// ── Activity multiplier mapping ───────────────────────────────────────────────

/**
 * Category → TDEE activity multiplier map.
 * Ray's requirement: activityCategory is the user-facing field;
 * the numeric multiplier is derived here at save time.
 */
export const ACTIVITY_MULTIPLIER: Record<ActivityCategory, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
};

/** Returns the numeric activity multiplier for a given category. */
export function getActivityMultiplier(
  category: ActivityCategory | null | undefined,
): number {
  if (!category) return 1.55; // default to moderate
  return ACTIVITY_MULTIPLIER[category];
}

// ── Check-in day sanitisation ─────────────────────────────────────────────────

/**
 * Sanitise the check-in day value: clamp to 0–6, floor to int.
 * Ray's requirement: Math.max(0, Math.min(6, Math.floor(value))).
 * Also exported from CheckInDayStep.tsx for co-location; the source of
 * truth lives here to keep it testable without React Native.
 */
export function sanitiseCheckInDay(raw: number): number {
  return Math.max(0, Math.min(6, Math.floor(raw)));
}

// ── Delay helper ─────────────────────────────────────────────────────────────

/** Returns a Promise that resolves after `ms` milliseconds. */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
