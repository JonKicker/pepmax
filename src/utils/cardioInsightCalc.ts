/**
 * cardioInsightCalc — pure functions for peptide-aware cardio insights.
 * Zero Firestore calls. All functions accept pre-fetched data and return
 * Insight | null.
 *
 * Priority scheme (RAY #1):
 *   General insights  → odd  priorities (1, 3, 5, 7, 9, 11)
 *   Peptide-cardio    → even priorities (2, 4, 6, 8)
 */
import type { CardioSession, HeartRatePoint } from '../types/cardio';
import type { Insight } from '../types/insight';

// ─── Minimal Pick interfaces (RAY #3) ────────────────────────────────────────

export type CycleInfo = {
  id: string;
  compoundName: string;
  startDate: string; // YYYY-MM-DD
  status: string;
  durationWeeks?: number;
};

export type DoseRecord = {
  date: string; // YYYY-MM-DD
  compoundName: string;
};

export type RecoveryDocEntry = {
  dateKey: string;
  score: number;
  zone: string;
};

// ─── CardioContext ────────────────────────────────────────────────────────────

export type CardioContext = {
  sessionsByDate: Map<string, CardioSession[]>;
  injectionDates: Set<string>;
  activeCycles: CycleInfo[];
  recoveryByDate: Map<string, { score: number; zone: string }>;
  paceByDate: Map<string, number>;
  hasInjectionPaceDip: boolean; // RAY #2 — pre-computed flag
};

// ─── buildCardioContext ───────────────────────────────────────────────────────

export function buildCardioContext(params: {
  cardioSessions: CardioSession[];
  doses: DoseRecord[];
  cycles: CycleInfo[];
  recoveryDocs: RecoveryDocEntry[];
}): CardioContext {
  const { cardioSessions, doses, cycles, recoveryDocs } = params;

  // sessionsByDate
  const sessionsByDate = new Map<string, CardioSession[]>();
  for (const session of cardioSessions) {
    if (session.status !== 'completed') continue;
    const dateKey = session.startedAt.toDate().toISOString().slice(0, 10);
    const existing = sessionsByDate.get(dateKey) ?? [];
    existing.push(session);
    sessionsByDate.set(dateKey, existing);
  }

  // injectionDates
  const injectionDates = new Set<string>();
  for (const dose of doses) {
    injectionDates.add(dose.date);
  }

  // activeCycles
  const activeCycles = cycles.filter((c) => c.status === 'active');

  // recoveryByDate
  const recoveryByDate = new Map<string, { score: number; zone: string }>();
  for (const doc of recoveryDocs) {
    recoveryByDate.set(doc.dateKey, { score: doc.score, zone: doc.zone });
  }

  // paceByDate — avg pace per date (completed sessions only, non-zero pace)
  const paceByDate = new Map<string, number>();
  for (const [dateKey, sessions] of sessionsByDate) {
    const paceSessions = sessions.filter((s) => s.averagePace > 0);
    if (paceSessions.length === 0) continue;
    const avgPace =
      paceSessions.reduce((sum, s) => sum + s.averagePace, 0) / paceSessions.length;
    paceByDate.set(dateKey, avgPace);
  }

  // hasInjectionPaceDip — RAY #2: pre-compute so checkInjectionDayScheduling
  // never depends on checkCardioAfterInjection logic
  const hasInjectionPaceDip = computeHasInjectionPaceDip(paceByDate, injectionDates);

  return {
    sessionsByDate,
    injectionDates,
    activeCycles,
    recoveryByDate,
    paceByDate,
    hasInjectionPaceDip,
  };
}

/** Internal helper: checks if injection-day paces are >10% slower on average */
function computeHasInjectionPaceDip(
  paceByDate: Map<string, number>,
  injectionDates: Set<string>,
): boolean {
  const injectionDayPaces: number[] = [];
  const nonInjectionDayPaces: number[] = [];

  for (const [dateKey, pace] of paceByDate) {
    if (injectionDates.has(dateKey)) {
      injectionDayPaces.push(pace);
    } else {
      nonInjectionDayPaces.push(pace);
    }
  }

  if (injectionDayPaces.length < 2 || nonInjectionDayPaces.length < 2) return false;

  const avgInj =
    injectionDayPaces.reduce((a, b) => a + b, 0) / injectionDayPaces.length;
  const avgNon =
    nonInjectionDayPaces.reduce((a, b) => a + b, 0) / nonInjectionDayPaces.length;

  // Higher pace = slower (sec/km). Injection-day pace is slower if avgInj > avgNon * 1.1
  return avgInj > avgNon * 1.1;
}

// ─── Insight checks ──────────────────────────────────────────────────────────

/**
 * checkPeptidePaceImprovement
 * Compares avg pace 14 days before cycle start vs most recent 14 days.
 * RAY #5: If cycle < 14 days old, returns null.
 * Priority: 2 (even — peptide-cardio category)
 */
export function checkPeptidePaceImprovement(ctx: CardioContext): Insight | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const cycle of ctx.activeCycles) {
    const cycleStart = new Date(cycle.startDate);
    cycleStart.setHours(0, 0, 0, 0);

    const daysSinceStart = Math.floor(
      (today.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24),
    );

    // RAY #5: cycle must be at least 14 days old
    if (daysSinceStart < 14) continue;

    // Pre-cycle window: 14 days before startDate
    const preCycleStart = new Date(cycleStart);
    preCycleStart.setDate(preCycleStart.getDate() - 14);

    const preCyclePaces: number[] = [];
    const recentPaces: number[] = [];

    const recentWindowStart = new Date(today);
    recentWindowStart.setDate(recentWindowStart.getDate() - 13);

    for (const [dateKey, pace] of ctx.paceByDate) {
      const date = new Date(dateKey);
      date.setHours(0, 0, 0, 0);

      if (date >= preCycleStart && date < cycleStart) {
        preCyclePaces.push(pace);
      }

      if (date >= recentWindowStart && date <= today) {
        recentPaces.push(pace);
      }
    }

    if (preCyclePaces.length < 3 || recentPaces.length < 3) continue;

    const avgPreCycle =
      preCyclePaces.reduce((a, b) => a + b, 0) / preCyclePaces.length;
    const avgRecent =
      recentPaces.reduce((a, b) => a + b, 0) / recentPaces.length;

    // Pace is sec/km — lower is faster. Improvement = recent pace is lower.
    // >5% improvement: avgRecent < avgPreCycle * 0.95
    if (avgRecent < avgPreCycle * 0.95) {
      const improvementPct = Math.round(((avgPreCycle - avgRecent) / avgPreCycle) * 100);
      return {
        id: 'peptidePaceImprovement',
        emoji: '⚡',
        headline: `Pace up ${improvementPct}% since starting ${cycle.compoundName}`,
        explanation: `Your cardio pace has improved ${improvementPct}% since you started ${cycle.compoundName}. Keep it up!`,
        priority: 2,
      };
    }
  }

  return null;
}

/**
 * checkInjectionDayScheduling
 * RAY #2: Checks hasInjectionPaceDip flag first — returns null if false.
 * Groups injection-day sessions by weekday, finds worst-performing day.
 * Priority: 4 (even — peptide-cardio category)
 */
export function checkInjectionDayScheduling(ctx: CardioContext): Insight | null {
  // RAY #2: pre-computed flag gates this check
  if (!ctx.hasInjectionPaceDip) return null;

  const weekdayPaces: Map<number, number[]> = new Map();
  const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  for (const dateKey of ctx.injectionDates) {
    const sessions = ctx.sessionsByDate.get(dateKey);
    if (!sessions || sessions.length === 0) continue;

    const date = new Date(dateKey);
    const weekday = date.getDay();

    for (const session of sessions) {
      if (session.averagePace <= 0) continue;
      const existing = weekdayPaces.get(weekday) ?? [];
      existing.push(session.averagePace);
      weekdayPaces.set(weekday, existing);
    }
  }

  if (weekdayPaces.size === 0) return null;

  // Find worst-performing day (highest avg pace = slowest)
  let worstDay = -1;
  let worstAvgPace = 0;
  for (const [weekday, paces] of weekdayPaces) {
    if (paces.length < 1) continue;
    const avg = paces.reduce((a, b) => a + b, 0) / paces.length;
    if (avg > worstAvgPace) {
      worstAvgPace = avg;
      worstDay = weekday;
    }
  }

  if (worstDay === -1) return null;

  const dayName = WEEKDAY_NAMES[worstDay];

  return {
    id: 'injectionDayScheduling',
    emoji: '📅',
    headline: `Cardio slowest on injection ${dayName}s`,
    explanation: `Your pace dips on injection days — especially ${dayName}s. Consider scheduling cardio 1–2 days after injections for better performance.`,
    priority: 4,
  };
}

/**
 * Returns true if the given date string falls within any cycle's
 * [startDate, startDate + durationWeeks * 7) range.
 * For open-ended cycles (durationWeeks null), the range extends to today.
 * No materialized Set — O(cycles) per call.
 */
function isDateInAnyCycle(dateStr: string, cycles: CycleInfo[]): boolean {
  const date = new Date(dateStr);
  date.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const cycle of cycles) {
    const start = new Date(cycle.startDate);
    start.setHours(0, 0, 0, 0);
    const endMs = cycle.durationWeeks != null
      ? start.getTime() + cycle.durationWeeks * 7 * 24 * 60 * 60 * 1000
      : today.getTime() + 24 * 60 * 60 * 1000; // open-ended: through today
    if (date >= start && date.getTime() < endMs) return true;
  }
  return false;
}

/**
 * checkPeptideHRRecovery
 * Compares HR recovery rate on-cycle vs off-cycle.
 * RAY #4: off-cycle = days not covered by ANY cycle's date range.
 * If no off-cycle sessions exist, returns null.
 * HR recovery = drop from max HR to HR at 60 seconds after max.
 * Requires 5+ sessions with heartRateData in each window.
 * Priority: 6 (even — peptide-cardio category)
 */
export function checkPeptideHRRecovery(ctx: CardioContext): Insight | null {
  if (ctx.activeCycles.length === 0) return null;

  const onCycleRecoveries: number[] = [];
  const offCycleRecoveries: number[] = [];

  for (const [dateKey, sessions] of ctx.sessionsByDate) {
    const isOnCycle = isDateInAnyCycle(dateKey, ctx.activeCycles);

    for (const session of sessions) {
      const hrRecovery = computeHRRecoveryRate(session.heartRateData);
      if (hrRecovery === null) continue;

      if (isOnCycle) {
        onCycleRecoveries.push(hrRecovery);
      } else {
        offCycleRecoveries.push(hrRecovery);
      }
    }
  }

  // RAY #4: if no off-cycle data, return null
  if (offCycleRecoveries.length < 5 || onCycleRecoveries.length < 5) return null;

  const avgOnCycle =
    onCycleRecoveries.reduce((a, b) => a + b, 0) / onCycleRecoveries.length;
  const avgOffCycle =
    offCycleRecoveries.reduce((a, b) => a + b, 0) / offCycleRecoveries.length;

  // Higher recovery drop = better
  const pctDiff = ((avgOnCycle - avgOffCycle) / avgOffCycle) * 100;
  if (Math.abs(pctDiff) < 15) return null;

  const improved = pctDiff > 0;
  const absPct = Math.round(Math.abs(pctDiff));

  return {
    id: 'peptideHRRecovery',
    emoji: '❤️',
    headline: `HR recovery ${improved ? 'improved' : 'reduced'} ${absPct}% on-cycle`,
    explanation: improved
      ? `Your heart rate recovers ${absPct}% faster during your current peptide cycle — a sign of improved cardiovascular fitness.`
      : `Your heart rate recovery is ${absPct}% slower during your current cycle. Monitor intensity and ensure adequate rest.`,
    priority: 6,
  };
}

/** Compute HR recovery: drop (bpm) from max HR to HR at ~60s after max */
function computeHRRecoveryRate(
  heartRateData: HeartRatePoint[] | undefined,
): number | null {
  if (!heartRateData || heartRateData.length < 2) return null;

  // Find peak HR index
  let maxBpm = 0;
  let maxIdx = 0;
  for (let i = 0; i < heartRateData.length; i++) {
    if (heartRateData[i].bpm > maxBpm) {
      maxBpm = heartRateData[i].bpm;
      maxIdx = i;
    }
  }

  if (maxBpm === 0) return null;

  const maxTimestamp = heartRateData[maxIdx].timestamp;
  const targetTimestamp = maxTimestamp + 60000; // 60 seconds after peak

  // Find HR point closest to 60s after peak
  let closestIdx = -1;
  let closestDiff = Infinity;
  for (let i = maxIdx + 1; i < heartRateData.length; i++) {
    const diff = Math.abs(heartRateData[i].timestamp - targetTimestamp);
    if (diff < closestDiff) {
      closestDiff = diff;
      closestIdx = i;
    }
  }

  // Must be within 90s window to be valid
  if (closestIdx === -1 || closestDiff > 90000) return null;

  const hrAt60s = heartRateData[closestIdx].bpm;
  return maxBpm - hrAt60s; // positive = drop (good recovery)
}

/**
 * checkCompoundPerformanceTrend
 * Per-compound rolling 4-week pace trend within each active cycle.
 * Bins sessions by week, requires 3+ weeks with data.
 * Priority: 8 (even — peptide-cardio category)
 */
export function checkCompoundPerformanceTrend(ctx: CardioContext): Insight | null {
  for (const cycle of ctx.activeCycles) {
    const cycleStart = new Date(cycle.startDate);
    cycleStart.setHours(0, 0, 0, 0);

    // Bin paces by week number since cycle start
    const weeklyPaces: Map<number, number[]> = new Map();

    for (const [dateKey, pace] of ctx.paceByDate) {
      const date = new Date(dateKey);
      date.setHours(0, 0, 0, 0);

      if (date < cycleStart) continue;

      const dayOffset = Math.floor(
        (date.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24),
      );
      const weekNum = Math.floor(dayOffset / 7);

      // Only consider most recent 4 weeks
      if (weekNum > 3) continue;

      const existing = weeklyPaces.get(weekNum) ?? [];
      existing.push(pace);
      weeklyPaces.set(weekNum, existing);
    }

    // Need at least 3 weeks with data
    if (weeklyPaces.size < 3) continue;

    const weekAverages: { week: number; avgPace: number }[] = [];
    for (const [week, paces] of weeklyPaces) {
      const avg = paces.reduce((a, b) => a + b, 0) / paces.length;
      weekAverages.push({ week, avgPace: avg });
    }
    weekAverages.sort((a, b) => a.week - b.week);

    const firstWeekPace = weekAverages[0].avgPace;
    const lastWeekPace = weekAverages[weekAverages.length - 1].avgPace;

    if (firstWeekPace <= 0) continue;

    // Pace is sec/km — lower = faster. Trend = decreasing pace (improving)
    const trendPct = ((firstWeekPace - lastWeekPace) / firstWeekPace) * 100;

    if (Math.abs(trendPct) < 3) continue;

    const improving = trendPct > 0;
    const absPct = Math.round(Math.abs(trendPct));

    return {
      id: 'compoundPerformanceTrend',
      emoji: improving ? '📈' : '📉',
      headline: `${cycle.compoundName}: pace ${improving ? 'trending faster' : 'trending slower'} (${absPct}% over 4w)`,
      explanation: improving
        ? `Your pace has improved ${absPct}% over the past 4 weeks on ${cycle.compoundName}. Progressive adaptation in action.`
        : `Your pace has slowed ${absPct}% over the past 4 weeks. Consider adjusting volume or intensity.`,
      priority: 8,
    };
  }

  return null;
}
