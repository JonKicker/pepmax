/**
 * TDEE and macro calculation utilities.
 * Pure functions — no side effects, no Firebase, fully unit-testable.
 */
import type { MacroTargets, Sex } from '../types/profile';

const ACTIVITY_MODERATE = 1.55;

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
 * Uses moderate activity (1.55) as default — adjustable later in settings.
 */
export function calculateTDEE(weightKg: number, heightCm: number, age: number, sex: Sex): number {
  return Math.round(calculateBMR(weightKg, heightCm, age, sex) * ACTIVITY_MODERATE);
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
