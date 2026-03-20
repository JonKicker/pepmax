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
  return map[clampRating(soreness, 'soreness')];
}

// Inverted — higher stress = lower multiplier
function mapStressLevel(stress: number): number {
  const map: Record<number, number> = { 1: 1.5, 2: 1.2, 3: 1.0, 4: 0.7, 5: 0.5 };
  return map[clampRating(stress, 'stress')];
}

// 1–5 rating: 1=Very Low → 0.5, 3=Moderate → 1.0, 5=Very High → 1.5
function mapReadiness(readiness: number): number {
  const map: Record<number, number> = { 1: 0.5, 2: 0.7, 3: 1.0, 4: 1.3, 5: 1.5 };
  return map[clampRating(readiness, 'readiness')];
}

export function calculateRecoveryMultiplier(
  sleepHours: number,
  sleepQuality: number,
  soreness: number,
  stress: number,
  readiness: number,
): number {
  const scores = [
    mapSleepHours(sleepHours),
    mapSleepQuality(sleepQuality),
    mapMuscleSoreness(soreness),
    mapStressLevel(stress),
    mapReadiness(readiness),
  ];
  const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
  // parseFloat(toFixed(1)) avoids IEEE 754 drift
  return parseFloat(avg.toFixed(1));
}
