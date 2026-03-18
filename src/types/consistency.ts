/**
 * Consistency types — daily on-plan status tracking.
 */
export type DayStatus = 'full' | 'partial' | 'rest' | 'missed';

export type DayConsistency = {
  date: string;             // YYYY-MM-DD local
  status: DayStatus;
  workoutLogged: boolean;
  isBareMinimum: boolean;
  nutritionPercent: number; // 0–100+, calories / target × 100
  peptideLogged: boolean;
  isRestDay: boolean;       // true = configured rest day (from trainingDays)
  restDayOverride?: boolean; // true = manually marked rest via calendar
  updatedAt: number;        // epoch ms
};

export type ConsistencyData = {
  days: DayConsistency[];   // last 30, ascending (oldest first)
  onPlanLast14: number;     // full + partial count in last 14 days (rest is neutral, not counted)
  monthlyPercent: number;   // (full + partial) / non-rest days this month × 100
  weeklyScore: number;      // (full + partial) / non-rest days this week × 100
};
