/**
 * Recovery Readiness Score — pure scoring engine.
 *
 * All functions are pure (no Firebase, no React). Takes available data inputs
 * and returns a 0–100 composite score with zone, breakdown, and recommendations.
 *
 * Weight redistribution: when a data source is unavailable its weight is zeroed
 * and remaining weights are scaled proportionally to sum to 1.0.
 */
import type {
  RecoveryZone,
  RecoverySubScores,
  RecoverySubScoreWeights,
  RecoveryScoreResult,
  RecoveryScoreInputs,
  ScoreBreakdownEntry,
} from '../types/recoveryScore';

// ─── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_WEIGHTS: RecoverySubScoreWeights = {
  sleep: 0.30,
  hrv: 0.25,
  trainingLoad: 0.20,
  nutrition: 0.15,
  subjective: 0.10,
};

const CATEGORY_LABELS: Record<keyof RecoverySubScores, string> = {
  sleep: 'Sleep',
  hrv: 'Heart Rate',
  trainingLoad: 'Training Load',
  nutrition: 'Nutrition',
  subjective: 'Subjective',
};

// ─── Sub-score computations ─────────────────────────────────────────────────

/**
 * Sleep sub-score (0–100).
 * 7–9 hrs = 100, <6 hrs = 30, >10 hrs = 70.
 * Deep sleep bonus: >20% adds up to +10.
 */
export function computeSleepSubScore(
  durationHours: number | null,
  deepSleepPct: number | null,
): number | null {
  if (durationHours == null) return null;

  let score: number;
  if (durationHours < 4) score = 15;
  else if (durationHours < 5) score = 25;
  else if (durationHours < 6) score = 30;
  else if (durationHours < 6.5) score = 50;
  else if (durationHours < 7) score = 70;
  else if (durationHours <= 9) score = 100;
  else if (durationHours <= 10) score = 70;
  else score = 55;

  // Deep sleep bonus
  if (deepSleepPct != null && deepSleepPct > 20) {
    const bonus = Math.min(10, (deepSleepPct - 20) * 0.5);
    score = Math.min(100, score + bonus);
  }

  return clamp(score);
}

/**
 * HRV / Resting HR sub-score (0–100).
 * Compares today's values to 30-day rolling average.
 * At average = 70. Each 5% above = +10, below = -10.
 * HRV and RHR blended 70/30 when both available.
 */
export function computeHrvSubScore(
  hrv: number | null,
  hrvBaseline: number | null,
  rhr: number | null,
  rhrBaseline: number | null,
): number | null {
  const hrvScore = computeDeviationScore(hrv, hrvBaseline, false);
  const rhrScore = computeDeviationScore(rhr, rhrBaseline, true);

  if (hrvScore != null && rhrScore != null) {
    return clamp(Math.round(hrvScore * 0.7 + rhrScore * 0.3));
  }
  if (hrvScore != null) return clamp(hrvScore);
  if (rhrScore != null) return clamp(rhrScore);
  return null;
}

/** Score a value vs its baseline. Lower-is-better when inverted (e.g. RHR). */
function computeDeviationScore(
  value: number | null,
  baseline: number | null,
  inverted: boolean,
): number | null {
  if (value == null || baseline == null || baseline === 0) return null;

  const pctDeviation = ((value - baseline) / baseline) * 100;
  // Each 5% deviation = 10 points from center (70)
  const delta = (pctDeviation / 5) * 10;

  if (inverted) {
    // Lower RHR is better → positive deviation is bad
    return clamp(Math.round(70 - delta));
  }
  // Higher HRV is better → positive deviation is good
  return clamp(Math.round(70 + delta));
}

/**
 * Training load sub-score (0–100).
 * Based on acute:chronic workload ratio.
 * Sweet spot 0.8–1.3 = 80–100. >1.5 = 30–50. <0.5 = 60. Ratio 0 = 70.
 */
export function computeTrainingLoadSubScore(acuteChronicRatio: number): number {
  if (acuteChronicRatio === 0) return 70; // No training history — neutral

  if (acuteChronicRatio < 0.5) return 60;  // Detraining
  if (acuteChronicRatio < 0.8) return 70;  // Below optimal
  if (acuteChronicRatio <= 1.0) return 90;  // Sweet spot lower
  if (acuteChronicRatio <= 1.3) return 85;  // Sweet spot upper
  if (acuteChronicRatio <= 1.5) return 50;  // Overreaching
  if (acuteChronicRatio <= 2.0) return 35;  // High risk
  return 20; // Very high risk
}

/**
 * Nutrition sub-score (0–100).
 * Protein hit = +50. Calories in range = +50.
 */
export function computeNutritionSubScore(
  proteinHit: boolean | null,
  caloriesInRange: boolean | null,
): number | null {
  if (proteinHit == null && caloriesInRange == null) return null;

  let score = 0;
  if (proteinHit) score += 50;
  if (caloriesInRange) score += 50;
  return score;
}

/**
 * Subjective sub-score (0–100).
 * Rating 1=20, 2=40, 3=60, 4=80, 5=100.
 * High stress (3) = -10 penalty.
 */
export function computeSubjectiveSubScore(rating: number, stress?: number): number {
  const RATING_MAP: Record<number, number> = { 1: 20, 2: 40, 3: 60, 4: 80, 5: 100 };
  let score = RATING_MAP[Math.round(clampValue(rating, 1, 5))] ?? 60;

  if (stress === 3) score = Math.max(0, score - 10);

  return clamp(score);
}

// ─── Weight redistribution ──────────────────────────────────────────────────

/**
 * Redistribute weights when data sources are unavailable.
 * Unavailable sources get weight 0; remaining scale proportionally to sum=1.0.
 */
export function redistributeWeights(
  available: Record<keyof RecoverySubScoreWeights, boolean>,
): RecoverySubScoreWeights {
  const keys = Object.keys(DEFAULT_WEIGHTS) as (keyof RecoverySubScoreWeights)[];
  const totalAvailable = keys.reduce(
    (sum, k) => sum + (available[k] ? DEFAULT_WEIGHTS[k] : 0),
    0,
  );

  if (totalAvailable === 0) {
    // Fallback: equal weights for everything marked available (shouldn't happen)
    return { sleep: 0, hrv: 0, trainingLoad: 0, nutrition: 0, subjective: 1 };
  }

  const weights = {} as RecoverySubScoreWeights;
  for (const k of keys) {
    weights[k] = available[k]
      ? parseFloat((DEFAULT_WEIGHTS[k] / totalAvailable).toFixed(4))
      : 0;
  }
  return weights;
}

// ─── Zone / label / multiplier ──────────────────────────────────────────────

export function getZone(score: number): RecoveryZone {
  if (score >= 80) return 'green';
  if (score >= 60) return 'yellow';
  if (score >= 40) return 'orange';
  return 'red';
}

export function getZoneLabel(zone: RecoveryZone): string {
  switch (zone) {
    case 'green': return 'High Recovery';
    case 'yellow': return 'Moderate';
    case 'orange': return 'Below Baseline';
    case 'red': return 'Low Recovery';
  }
}

export function getZoneColor(zone: RecoveryZone): string {
  switch (zone) {
    case 'green': return '#4CAF50';
    case 'yellow': return '#FF9800';
    case 'orange': return '#E67E22';
    case 'red': return '#F44336';
  }
}

/** Derive Body Model multiplier from 0–100 score. Maps [0,100] → [0.5, 1.5]. */
export function scoreToMultiplier(score: number): number {
  return parseFloat((0.5 + clampValue(score, 0, 100) / 100).toFixed(2));
}

// ─── Recommendations ────────────────────────────────────────────────────────

const GREEN_RECS = [
  'Full training capacity today.',
  'Great day for heavy lifts or tempo runs.',
  'Push toward your planned session.',
];

const YELLOW_RECS = [
  'Moderate recovery — stick to your standard plan.',
  'Consider reducing volume slightly if weekly load is high.',
];

const ORANGE_RECS = [
  'Below baseline — consider Bare Minimum Mode for gym today.',
  'Easy cardio over intervals.',
  'Prioritize protein and hydration.',
];

const RED_RECS = [
  'Low recovery — rest day recommended.',
  'Light movement only if anything.',
];

export function getRecommendations(
  zone: RecoveryZone,
  subScores: RecoverySubScores,
  _weights: RecoverySubScoreWeights,
): string[] {
  const recs: string[] = [];

  switch (zone) {
    case 'green': recs.push(...GREEN_RECS); break;
    case 'yellow': recs.push(...YELLOW_RECS); break;
    case 'orange': recs.push(...ORANGE_RECS); break;
    case 'red': recs.push(...RED_RECS); break;
  }

  // Add driver-specific recommendation for the weakest sub-score
  const driverRec = getDriverRecommendation(subScores);
  if (driverRec) recs.push(driverRec);

  return recs;
}

function getDriverRecommendation(subScores: RecoverySubScores): string | null {
  const entries: { key: string; score: number }[] = [];
  if (subScores.sleep != null) entries.push({ key: 'sleep', score: subScores.sleep });
  if (subScores.hrv != null) entries.push({ key: 'hrv', score: subScores.hrv });
  entries.push({ key: 'trainingLoad', score: subScores.trainingLoad });
  if (subScores.nutrition != null) entries.push({ key: 'nutrition', score: subScores.nutrition });
  entries.push({ key: 'subjective', score: subScores.subjective });

  if (entries.length === 0) return null;

  const worst = entries.reduce((min, e) => (e.score < min.score ? e : min), entries[0]);
  if (worst.score >= 70) return null; // No weak driver

  switch (worst.key) {
    case 'sleep':
      return `Your sleep was ${worst.score < 40 ? 'significantly ' : ''}below target — prioritize rest tonight.`;
    case 'hrv':
      return 'Heart rate metrics suggest elevated stress — consider lighter activity.';
    case 'trainingLoad':
      return worst.score < 50
        ? 'Training load is high — back off intensity to avoid overreaching.'
        : 'Training load is low — a moderate session would help build consistency.';
    case 'nutrition':
      return 'Nutrition targets were missed — focus on protein and calorie goals today.';
    case 'subjective':
      return 'You reported feeling off — listen to your body and adjust accordingly.';
    default:
      return null;
  }
}

// ─── Main scoring function ──────────────────────────────────────────────────

export function calculateRecoveryScore(inputs: RecoveryScoreInputs): RecoveryScoreResult {
  // Compute individual sub-scores
  const sleepScore = inputs.sleep
    ? computeSleepSubScore(inputs.sleep.durationHours, inputs.sleep.deepSleepPct)
    : null;

  const hrvScore = inputs.hrv || inputs.restingHR
    ? computeHrvSubScore(
        inputs.hrv?.value ?? null,
        inputs.hrv?.thirtyDayAvg ?? null,
        inputs.restingHR?.value ?? null,
        inputs.restingHR?.thirtyDayAvg ?? null,
      )
    : null;

  const trainingLoadScore = inputs.trainingLoad
    ? computeTrainingLoadSubScore(
        inputs.trainingLoad.chronicLoad === 0
          ? 0
          : inputs.trainingLoad.acuteLoad / inputs.trainingLoad.chronicLoad,
      )
    : 70; // Default neutral if no training data provided

  const nutritionScore = inputs.nutrition
    ? computeNutritionSubScore(inputs.nutrition.proteinHit, inputs.nutrition.caloriesInRange)
    : null;

  const subjectiveScore = inputs.subjective
    ? computeSubjectiveSubScore(inputs.subjective.rating, inputs.subjective.stress)
    : 60; // Default neutral if no subjective (shouldn't happen after check-in)

  const subScores: RecoverySubScores = {
    sleep: sleepScore,
    hrv: hrvScore,
    trainingLoad: trainingLoadScore,
    nutrition: nutritionScore,
    subjective: subjectiveScore,
  };

  // Determine availability
  const available = {
    sleep: sleepScore != null,
    hrv: hrvScore != null,
    trainingLoad: true, // Always available (0 ratio = neutral)
    nutrition: nutritionScore != null,
    subjective: true, // Always available after check-in
  };

  const weights = redistributeWeights(available);

  // Compute weighted composite score
  const keys = Object.keys(weights) as (keyof RecoverySubScoreWeights)[];
  let composite = 0;
  for (const k of keys) {
    const s = subScores[k];
    if (s != null && weights[k] > 0) {
      composite += s * weights[k];
    }
  }
  const score = clamp(Math.round(composite));

  const zone = getZone(score);
  const label = getZoneLabel(zone);
  const recommendations = getRecommendations(zone, subScores, weights);

  // Build breakdown for display
  const breakdown: ScoreBreakdownEntry[] = keys.map((k) => ({
    category: CATEGORY_LABELS[k],
    subScore: subScores[k] ?? 0,
    weight: weights[k],
    available: available[k],
  }));

  return {
    score,
    zone,
    label,
    subScores,
    weights,
    breakdown,
    recommendations,
    recoveryMultiplier: scoreToMultiplier(score),
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function clamp(score: number): number {
  return Math.max(0, Math.min(100, score));
}

function clampValue(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
