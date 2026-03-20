/**
 * Recovery multiplier calculator (0.5–1.5).
 * Each input maps to a score; the final multiplier is the average of all five,
 * rounded to one decimal place.
 *
 * The multiplier feeds the Body Model zone recovery curve formula:
 *   recoveryProgress = 1 - e^(-hoursElapsed / (baseRecoveryHours × modifiers))
 * A multiplier > 1.0 speeds recovery; < 1.0 slows it.
 */

// Clamps an integer rating to valid 1–5 range before table lookup.
// Throws on values that are clearly out of range so callers catch bugs early.
function clampRating(value: number, field: string): number {
  if (!Number.isFinite(value) || value < 1 || value > 5) {
    throw new Error(`${field} must be between 1 and 5, got ${value}`);
  }
  return Math.round(value);
}

function mapSleepHours(hours: number): number {
  if (hours < 5) return 0.5;
  if (hours < 6) return 0.7;
  if (hours < 7) return 0.9;
  if (hours < 8) return 1.1;
  if (hours < 9) return 1.3;
  return 1.5;
}

function mapSleepQuality(quality: number): number {
  const map: Record<number, number> = { 1: 0.5, 2: 0.7, 3: 1.0, 4: 1.2, 5: 1.5 };
  return map[clampRating(quality, 'sleepQuality')];
}

// Inverted — higher soreness = lower multiplier
function mapMuscleSoreness(soreness: number): number {
  const map: Record<number, number> = { 1: 1.5, 2: 1.2, 3: 1.0, 4: 0.7, 5: 0.5 };
  return map[clampRating(soreness, 'muscleSoreness')];
}

// Inverted — higher stress = lower multiplier
function mapStressLevel(stress: number): number {
  const map: Record<number, number> = { 1: 1.5, 2: 1.2, 3: 1.0, 4: 0.7, 5: 0.5 };
  return map[clampRating(stress, 'stressLevel')];
}

// Linear: 0 → 0.5, 10 → 1.5 (matches spec §8 overallReadiness: 0–10)
function mapOverallReadiness(readiness: number): number {
  if (!Number.isFinite(readiness) || readiness < 0 || readiness > 10) {
    throw new Error(`overallReadiness must be between 0 and 10, got ${readiness}`);
  }
  return 0.5 + (Math.round(readiness) / 10);
}

export function calculateRecoveryMultiplier(
  sleepHours: number,
  sleepQuality: number,
  muscleSoreness: number,
  stressLevel: number,
  overallReadiness: number,
): number {
  const scores = [
    mapSleepHours(sleepHours),
    mapSleepQuality(sleepQuality),
    mapMuscleSoreness(muscleSoreness),
    mapStressLevel(stressLevel),
    mapOverallReadiness(overallReadiness),
  ];
  const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
  // parseFloat(toFixed(1)) avoids IEEE 754 drift
  return parseFloat(avg.toFixed(1));
}

/**
 * Converts a recoveryMultiplier (0.5–1.5) to a 0–100 display score.
 * 0.5 → 0, 1.0 → 50, 1.5 → 100.
 */
export function multiplierToDisplayScore(multiplier: number): number {
  return Math.round(Math.min(1, Math.max(0, multiplier - 0.5)) * 100);
}
