/**
 * Dashboard types — card IDs, preferences, streak, aggregate data.
 */
import type { Dose } from './peptide';
import type { DailyTotals } from './nutrition';
import type { WorkoutSession } from './workout';
import type { CardioSession } from './cardio';
import type { BodyWeightEntry } from './bodyTracking';
import type { FoodLogEntry } from './nutrition';
import type { ConsistencyData } from './consistency';

export type DashboardCardId =
  | 'greeting'
  | 'consistency'
  | 'peptides'
  | 'nutrition'
  | 'training'
  | 'cardio'
  | 'bodyWeight'
  | 'smartInsights'
  | 'aiInsight';

export type DashboardPreferences = {
  cardOrder: DashboardCardId[];
  hiddenCards: DashboardCardId[];
  onboardingDismissed?: boolean;
};

export type StreakData = {
  current: number;
  longest: number;
  lastActiveDate: string;
};

export type DashboardData = {
  doses: Dose[] | null;
  totals: DailyTotals | null;
  recentSessions: WorkoutSession[] | null;
  recentCardio: CardioSession[] | null;
  recentWeights: BodyWeightEntry[] | null;
  preferences: DashboardPreferences | null;
  streak: StreakData | null;
  consistency: ConsistencyData | null;
  allDoses: Dose[] | null;
  nutritionLogs: FoodLogEntry[] | null;
};

export const DEFAULT_CARD_ORDER: DashboardCardId[] = [
  'greeting',
  'consistency',
  'peptides',
  'nutrition',
  'training',
  'cardio',
  'bodyWeight',
  'smartInsights',
  'aiInsight',
];
