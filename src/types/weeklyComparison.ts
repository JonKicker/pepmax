/**
 * Types for the enhanced weekly check-in comparison feature.
 *
 * The weekly comparison shows this week vs last week across calories,
 * protein, and nutrition score — with a plain-English top tip.
 */

// ─── Week summary ─────────────────────────────────────────────────────────────

/**
 * Aggregated nutrition summary for a 7-day window.
 */
export interface WeekSummary {
  /** Average daily calories across logged days. */
  avgCalories: number;
  /** Average daily protein (g) across logged days. */
  avgProtein: number;
  /**
   * Average daily nutrition score across scored days.
   * Null when no days had a valid score.
   */
  avgScore: number | null;
  /** Number of days with at least one food log entry. */
  daysLogged: number;
  /**
   * Daily nutrition scores for each of the 7 days (index 0 = oldest).
   * Null entries represent days with no score data.
   */
  dailyScores: (number | null)[];
  /**
   * Rate of weight change in kg/week estimated from the period.
   * Null when insufficient weight data is available.
   */
  weightTrendKgPerWeek: number | null;
}

// ─── Week deltas ──────────────────────────────────────────────────────────────

/**
 * Differences between this week and last week.
 */
export interface WeekDeltas {
  /** Calorie delta: thisWeek.avgCalories - lastWeek.avgCalories. */
  calories: number;
  /** Protein delta (g): thisWeek.avgProtein - lastWeek.avgProtein. */
  protein: number;
  /**
   * Score delta: thisWeek.avgScore - lastWeek.avgScore.
   * Null when either week has no score.
   */
  score: number | null;
  /**
   * Overall improvement direction based on score and calorie adherence.
   *   improving — score up or calories closer to target
   *   declining  — score down or calories moving further from target
   *   steady     — changes within noise threshold (±3 score points, ±50 kcal)
   */
  direction: 'improving' | 'declining' | 'steady';
}

// ─── Full comparison payload ──────────────────────────────────────────────────

/**
 * Everything the WeeklyCheckInModal needs to render the comparison section.
 */
export interface WeeklyComparisonData {
  /** This week's aggregated summary. */
  thisWeek: WeekSummary;
  /** Last week's aggregated summary. */
  lastWeek: WeekSummary;
  /** Delta between the two weeks. */
  deltas: WeekDeltas;
  /** Single most actionable tip based on the comparison. */
  topTip: string;
}
