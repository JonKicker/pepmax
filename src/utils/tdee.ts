/**
 * TDEE and macro calculation utilities.
 * Pure functions — no side effects, no Firebase, fully unit-testable.
 */
import type { MacroTargets, Sex } from '../types/profile';

export const ACTIVITY_LEVELS = [
  { label: 'Sedentary (office job, little exercise)', multiplier: 1.2 },
  { label: 'Lightly Active (light exercise 1-3 days/week)', multiplier: 1.375 },
  { label: 'Moderately Active (moderate exercise 3-5 days/week)', multiplier: 1.55 },
  { label: 'Very Active (hard exercise 6-7 days/week)', multiplier: 1.725 },
  { label: 'Extremely Active (athlete, physical job + exercise)', multiplier: 1.9 },
] as const;

export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];

/**
 * Mifflin-St Jeor BMR calculation.
 * All inputs in metric (kg, cm).
 */
export function calculateBMR(weightKg: number, heightCm: number, age: number, sex: Sex): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === 'male' ? base + 5 : base - 161;
}

/**
 * TDEE = BMR × activity factor.
 * @param activityMultiplier — defaults to 1.55 (Moderately Active). Backward compatible.
 */
export function calculateTDEE(
  weightKg: number,
  heightCm: number,
  age: number,
  sex: Sex,
  activityMultiplier: number = 1.55,
): number {
  return Math.round(calculateBMR(weightKg, heightCm, age, sex) * activityMultiplier);
}

/**
 * Macro split: 30% protein / 40% carbs / 30% fat.
 */
export function calculateMacros(tdee: number): MacroTargets {
  return {
    proteinG: Math.round((tdee * 0.30) / 4),
    carbsG: Math.round((tdee * 0.40) / 4),
    fatG: Math.round((tdee * 0.30) / 9),
  };
}

// ─── Unit conversion helpers ────────────────────────────────────────────────

export function lbsToKg(lbs: number): number {
  return Math.round((lbs / 2.20462) * 10) / 10;
}

export function kgToLbs(kg: number): number {
  return Math.round(kg * 2.20462 * 10) / 10;
}

export function feetInchesToCm(feet: number, inches: number): number {
  return Math.round((feet * 30.48 + inches * 2.54) * 10) / 10;
}

export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = cm / 2.54;
  return {
    feet: Math.floor(totalInches / 12),
    inches: Math.round(totalInches % 12),
  };
}
