export type InsightId =
  | 'proteinGap'
  | 'liftingDayNutrition'
  | 'peptideWeightTrend'
  | 'cardioAfterInjection'
  | 'weeklyConsistency'
  | 'volumeTrend'
  | 'peptidePaceImprovement'
  | 'injectionDayScheduling'
  | 'peptideHRRecovery'
  | 'compoundPerformanceTrend'
  | 'suggestedWorkout';

export type Insight = {
  id: InsightId;
  emoji: string;
  headline: string;
  explanation: string;
  priority: number; // lower = shown first
};

export type DismissedInsights = Record<string, number>; // insightId -> dismissedAt ms
