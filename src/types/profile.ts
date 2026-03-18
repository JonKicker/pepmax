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

  // Goal weight for body tracking (kg)
  goalWeight?: number;

  // Activity multiplier stored for display in Nutrition Settings
  activityLevel?: number;

  // Custom / reordered meal slots. Falls back to DEFAULT_MEAL_SLOTS when absent.
  mealSlots?: MealSlotConfig[];

  // Goal for calorie targeting (applied as offset to TDEE)
  goalType?: 'lose' | 'maintain' | 'gain';

  // Training day schedule — 0=Sun..6=Sat. Non-training days are rest days.
  // Default when absent: all 7 days (every day is planned).
  trainingDays?: number[];

  // Notification opt-ins (default: both enabled)
  notificationPrefs?: {
    doseReminders: boolean;
    workoutReminders: boolean;
  };

  // Meta
  onboardingComplete?: boolean;
  quizCompletedAt: Timestamp;
  updatedAt: Timestamp;
};
