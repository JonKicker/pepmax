import { Timestamp } from 'firebase/firestore';
import type { MealSlotConfig } from './nutrition';
import type { AdaptiveCoachingState } from './adaptiveCoaching';

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

  // Public-facing profile fields
  profilePictureUrl?: string;
  bio?: string;
  username?: string;

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

  // ── New onboarding quiz fields (quiz v2) ──────────────────────────────────
  // Activity described as a category (separate from the numeric activityLevel
  // multiplier stored below — category→multiplier mapping happens at save time).
  activityCategory?: 'sedentary' | 'light' | 'moderate' | 'active';

  // Authoritative field for how many days per week the user trains.
  // Used by training scheduler and recovery score. Replaces any per-day array
  // count for display purposes.
  trainingDaysPerWeek?: number;

  preferredTrainTime?: 'morning' | 'midday' | 'afternoon' | 'evening' | 'varies';
  challenges?: string[];
  twelveWeekVision?: 'stronger' | 'leaner' | 'optimized' | 'back_on_track';
  recoveryPriority?: 'high' | 'medium' | 'low';

  // Free-text goal note entered by user. Trimmed + control-chars stripped on save.
  // Firestore rule enforces max 100 chars.
  personalGoalNote?: string;

  // Day of week for weekly check-in. 0 = Sunday … 6 = Saturday.
  // Always stored as Math.max(0, Math.min(6, Math.floor(value))).
  checkInDay?: number;

  remindersOptIn?: boolean;

  // Apple HealthKit sync opt-in (iOS only)
  healthKitEnabled?: boolean;

  // Notification opt-ins (default: both enabled)
  notificationPrefs?: {
    doseReminders: boolean;
    workoutReminders: boolean;
    recoveryCheckIn?: boolean;
    recoveryCheckInHour?: number;         // 0–23, default 7
    recoveryCheckInMinute?: number;       // 0–59, default 0
    recoveryCheckInOptimized?: boolean;   // true = HealthKit-adaptive schedule
    doseReminderHour?: number;            // 0–23, default 9
    doseReminderMinute?: number;          // 0–59, default 0
    doseReminderOptimized?: boolean;      // true = HealthKit-adaptive schedule
    workoutReminderHour?: number;         // 0–23, default 17
    workoutReminderMinute?: number;       // 0–59, default 0
    workoutReminderOptimized?: boolean;   // true = HealthKit-adaptive schedule
    // Hydration reminders — opt-in; toggle triggers permission request
    hydrationReminders?: boolean;
    hydrationIntervalHours?: number;      // Hours between reminders, e.g. 2
  };

  // Adaptive calorie coaching — optional; absent means feature not yet enabled
  adaptiveCoaching?: AdaptiveCoachingState;

  // Meta
  onboardingComplete?: boolean;
  quizCompletedAt: Timestamp;
  updatedAt: Timestamp;
};
