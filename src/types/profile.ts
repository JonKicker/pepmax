import { Timestamp } from 'firebase/firestore';
import type { MealSlotConfig } from './nutrition';

export type Goal = 'peptides' | 'nutrition' | 'training' | 'cardio';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type Units = 'imperial' | 'metric';
export type Sex = 'male' | 'female';

export type MacroTargets = {
  proteinG: number;
  carbsG: number;
  fatG: number;
  // Percentage representation — persisted alongside grams so both the
  // settings screen (displays pct) and dashboard (displays grams) work
  // immediately after save without recalculating.
  proteinPct?: number;
  carbsPct?: number;
  fatPct?: number;
};

export type UserProfile = {
  // Identity — set at sign-up, preserved through quiz
  firstName?: string;
  lastName?: string;
  email?: string;

  // Quiz answers
  goals: Goal[];
  experienceLevel: ExperienceLevel;
  units: Units;

  // Body stats — always stored in metric internally
  heightCm: number;
  weightKg: number;
  age: number;
  sex: Sex;

  // Calculated nutrition targets
  tdee: number;
  calorieTarget: number;
  macros: MacroTargets;

  // Activity multiplier stored for display in Nutrition Settings
  activityLevel?: number;

  // Custom / reordered meal slots. Falls back to DEFAULT_MEAL_SLOTS when absent.
  mealSlots?: MealSlotConfig[];

  // Meta
  onboardingComplete?: boolean;
  quizCompletedAt: Timestamp;
  updatedAt: Timestamp;
};
