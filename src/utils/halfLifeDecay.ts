/**
 * halfLifeDecay — pure math utilities for computing compound blood-level curves.
 * No React dependencies. Safe to call in useMemo or workers.
 */

export type TimelineRange = '7d' | '14d' | '30d';

export type DecayPoint = { x: number; y: number }; // x = ms epoch, y = % of peak (0-100)

/**
 * Level remaining from a single dose at `hoursElapsed` after administration.
 * Returns amount in same units as doseAmount.
 */
export function decayLevel(
  doseAmount: number,
  halfLifeHours: number,
  hoursElapsed: number,
): number {
  if (hoursElapsed < 0) return 0;
  return doseAmount * Math.pow(0.5, hoursElapsed / halfLifeHours);
}

/**
 * How far back before startMs we should look for old doses whose tails
 * still contribute meaningfully (at 10 half-lives, residual < 0.1%).
 */
export function lookbackMs(halfLifeHours: number): number {
  return halfLifeHours * 10 * 3_600_000;
}

/**
 * Step size in ms per range — keeps ~300-360 points for performance.
 */
export function stepMsForRange(range: TimelineRange): number {
  switch (range) {
    case '7d':  return 30 * 60_000;   // 30 min → 336 points
    case '14d': return 60 * 60_000;   // 1 hr   → 336 points
    case '30d': return 2 * 60 * 60_000; // 2 hr → 360 points
  }
}

/**
 * Generate a blood-level curve for one compound over [startMs, endMs].
 *
 * The Y axis is expressed as a percentage of the single-dose peak (0–100).
 * All prior doses (including those from before startMs within the lookback
 * window) are superimposed so accumulation is shown correctly.
 *
 * @param doses          All dose records (amount + timestampMs)
 * @param halfLifeHours  Compound half-life
 * @param startMs        Window start (epoch ms)
 * @param endMs          Window end (epoch ms)
 * @param stepMs         Resolution
 */
export function generateCompoundCurve(
  doses: { amount: number; timestampMs: number }[],
  halfLifeHours: number,
  startMs: number,
  endMs: number,
  stepMs: number,
): DecayPoint[] {
  if (doses.length === 0 || halfLifeHours <= 0) return [];

  const lookback = lookbackMs(halfLifeHours);
  // Only doses that could still have residual at startMs
  const relevantDoses = doses.filter(
    (d) => d.timestampMs >= startMs - lookback && d.timestampMs <= endMs,
  );
  if (relevantDoses.length === 0) return [];

  const maxDose = Math.max(...doses.map((d) => d.amount));
  if (maxDose <= 0) return [];

  const points: DecayPoint[] = [];
  for (let t = startMs; t <= endMs; t += stepMs) {
    let totalLevel = 0;
    for (const dose of relevantDoses) {
      const hoursElapsed = (t - dose.timestampMs) / 3_600_000;
      if (hoursElapsed >= 0) {
        totalLevel += decayLevel(dose.amount, halfLifeHours, hoursElapsed);
      }
    }
    // Normalise to % of peak single dose
    const pct = Math.min(100, (totalLevel / maxDose) * 100);
    points.push({ x: t, y: Math.round(pct * 10) / 10 });
  }
  return points;
}
