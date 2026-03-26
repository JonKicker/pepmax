/**
 * insightService — pure functions that compute Smart Insights from dashboard data.
 * Zero Firestore calls. All functions accept data and return Insight | null.
 */
import type { FoodLogEntry } from '../types/nutrition';
import type { WorkoutSession } from '../types/workout';
import type { CardioSession } from '../types/cardio';
import type { BodyWeightEntry } from '../types/bodyTracking';
import type { Peptide, Dose } from '../types/peptide';
import type { Insight } from '../types/insight';
import { toLocalDateKey } from '../utils/nutrition';

type DailyTotals = { calories: number; protein: number; carbs: number; fat: number };

// ─── Helper ──────────────────────────────────────────────────────────────────

export function aggregateByDate(logs: FoodLogEntry[]): Map<string, DailyTotals> {
  const map = new Map<string, DailyTotals>();
  for (const entry of logs) {
    const existing = map.get(entry.date) ?? { calories: 0, protein: 0, carbs: 0, fat: 0 };
    map.set(entry.date, {
      calories: existing.calories + entry.calories,
      protein: existing.protein + entry.protein,
      carbs: existing.carbs + entry.carbs,
      fat: existing.fat + entry.fat,
    });
  }
  return map;
}

function dateKeyForDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return toLocalDateKey(d);
}

// ─── Insight checks ───────────────────────────────────────────────────────────

export function checkProteinGap(
  nutritionLogs: FoodLogEntry[],
  proteinTargetG: number,
): Insight | null {
  const today = toLocalDateKey();
  const sevenDaysAgo = dateKeyForDaysAgo(6); // inclusive range: 7 days

  const last7Logs = nutritionLogs.filter((e) => e.date >= sevenDaysAgo && e.date <= today);
  const byDate = aggregateByDate(last7Logs);

  const threshold = proteinTargetG * 0.8;
  let belowDays = 0;
  let totalProtein = 0;
  let loggedDays = 0;

  // Check each of the 7 days; days with no logs count as 0 protein
  for (let i = 0; i < 7; i++) {
    const key = dateKeyForDaysAgo(i);
    const totals = byDate.get(key);
    const protein = totals?.protein ?? 0;
    totalProtein += protein;
    loggedDays++;
    if (protein < threshold) belowDays++;
  }

  if (belowDays < 4) return null;

  const avgProtein = Math.round(totalProtein / loggedDays);
  return {
    id: 'proteinGap',
    emoji: '🥩',
    headline: `Protein gap on ${belowDays} of 7 days`,
    explanation: `You averaged ${avgProtein}g vs your ${Math.round(proteinTargetG)}g target. Consider adding a protein shake or extra serving.`,
    priority: 1,
  };
}

export function checkLiftingDayNutrition(
  nutritionLogs: FoodLogEntry[],
  sessions: WorkoutSession[],
): Insight | null {
  const today = toLocalDateKey();
  const fourteenDaysAgo = dateKeyForDaysAgo(13);

  const recentLogs = nutritionLogs.filter((e) => e.date >= fourteenDaysAgo && e.date <= today);
  const byDate = aggregateByDate(recentLogs);

  const gymDays = new Set<string>();
  for (const s of sessions) {
    if (s.status !== 'completed') continue;
    const key = toLocalDateKey(s.startedAt.toDate());
    if (key >= fourteenDaysAgo && key <= today) gymDays.add(key);
  }

  const gymCalories: number[] = [];
  const restCalories: number[] = [];

  for (let i = 0; i < 14; i++) {
    const key = dateKeyForDaysAgo(i);
    const cals = byDate.get(key)?.calories;
    if (cals === undefined) continue; // no log entry for this day, skip
    if (gymDays.has(key)) {
      gymCalories.push(cals);
    } else {
      restCalories.push(cals);
    }
  }

  if (gymCalories.length < 3 || restCalories.length < 3) return null;

  const avgGym = gymCalories.reduce((a, b) => a + b, 0) / gymCalories.length;
  const avgRest = restCalories.reduce((a, b) => a + b, 0) / restCalories.length;

  if (avgRest - avgGym < 300) return null;

  return {
    id: 'liftingDayNutrition',
    emoji: '📉',
    headline: 'Underfueling on gym days',
    explanation: `You averaged ~${Math.round(avgGym)}kcal on training days vs ~${Math.round(avgRest)}kcal on rest days.`,
    priority: 2,
  };
}

export function checkPeptideWeightTrend(
  peptides: Peptide[],
  weights: BodyWeightEntry[],
): Insight | null {
  if (peptides.length === 0 || weights.length === 0) return null;

  const mostRecent = peptides.reduce((a, b) =>
    a.createdAt.toMillis() > b.createdAt.toMillis() ? a : b,
  );

  const startMs = mostRecent.createdAt.toMillis();
  const sinceStart = weights.filter((w) => {
    const d = new Date(w.date);
    return d.getTime() >= startMs;
  });

  if (sinceStart.length < 2) return null;

  // Sort ascending by date
  sinceStart.sort((a, b) => a.date.localeCompare(b.date));

  const first = sinceStart[0];
  const last = sinceStart[sinceStart.length - 1];
  const unit = last.displayUnit;

  const firstVal = unit === 'lbs' ? first.weight * 2.20462 : first.weight;
  const lastVal = unit === 'lbs' ? last.weight * 2.20462 : last.weight;
  const diff = lastVal - firstVal;
  const direction = diff >= 0 ? 'up' : 'down';
  const absDiff = Math.abs(diff).toFixed(1);

  return {
    id: 'peptideWeightTrend',
    emoji: '⚖️',
    headline: `Weight ${direction} ${absDiff} ${unit} since starting ${mostRecent.name}`,
    explanation: `Since you started ${mostRecent.name}, your weight moved from ${firstVal.toFixed(1)} to ${lastVal.toFixed(1)} ${unit}.`,
    priority: 3,
  };
}

export function checkCardioAfterInjection(
  doses: Dose[],
  cardioSessions: CardioSession[],
): Insight | null {
  const injectionDates = new Set<string>();
  for (const dose of doses) {
    injectionDates.add(toLocalDateKey(dose.timestamp.toDate()));
  }

  if (injectionDates.size === 0) return null;

  const injectionDatesArr = Array.from(injectionDates).sort();

  const injectionDayPaces: number[] = [];
  const postInjectionPaces: number[] = [];

  for (const session of cardioSessions) {
    if (session.status !== 'completed') continue;
    if (!session.averagePace || session.averagePace <= 0) continue;

    const sessionDate = toLocalDateKey(session.startedAt.toDate());

    // Find days since nearest injection
    let minDays = Infinity;
    for (const injDate of injectionDatesArr) {
      const diff =
        (new Date(sessionDate).getTime() - new Date(injDate).getTime()) / (1000 * 60 * 60 * 24);
      if (diff >= 0 && diff < minDays) minDays = diff;
    }

    if (minDays === Infinity) continue;

    if (minDays === 0) {
      injectionDayPaces.push(session.averagePace);
    } else if (minDays >= 2) {
      postInjectionPaces.push(session.averagePace);
    }
  }

  if (injectionDayPaces.length < 2 || postInjectionPaces.length < 2) return null;

  const avgInjDay = injectionDayPaces.reduce((a, b) => a + b, 0) / injectionDayPaces.length;
  const avgPost = postInjectionPaces.reduce((a, b) => a + b, 0) / postInjectionPaces.length;

  if (avgInjDay <= avgPost * 1.1) return null;

  return {
    id: 'cardioAfterInjection',
    emoji: '💉',
    headline: 'Cardio pace dips on injection days',
    explanation: `Your average pace is slower on injection days. Consider scheduling cardio 1–2 days after injections.`,
    priority: 4,
  };
}

export function checkWeeklyConsistency(
  sessions: WorkoutSession[],
  cardioSessions: CardioSession[],
  weights: BodyWeightEntry[],
  doses: Dose[],
): Insight | null {
  const today = toLocalDateKey();
  const sevenDaysAgo = dateKeyForDaysAgo(6);

  const activeDates = new Set<string>();

  for (const s of sessions) {
    if (s.status !== 'completed') continue;
    const key = toLocalDateKey(s.startedAt.toDate());
    if (key >= sevenDaysAgo && key <= today) activeDates.add(key);
  }
  for (const s of cardioSessions) {
    if (s.status !== 'completed') continue;
    const key = toLocalDateKey(s.startedAt.toDate());
    if (key >= sevenDaysAgo && key <= today) activeDates.add(key);
  }
  for (const w of weights) {
    if (w.date >= sevenDaysAgo && w.date <= today) activeDates.add(w.date);
  }
  for (const d of doses) {
    const key = toLocalDateKey(d.timestamp.toDate());
    if (key >= sevenDaysAgo && key <= today) activeDates.add(key);
  }

  const count = activeDates.size;

  if (count >= 5) {
    return {
      id: 'weeklyConsistency',
      emoji: '🔥',
      headline: `This week: ${count} of 7 days active`,
      explanation: `Great consistency! You've logged activity on ${count} out of the last 7 days.`,
      priority: 5,
    };
  }

  if (count <= 2) {
    return {
      id: 'weeklyConsistency',
      emoji: '📅',
      headline: `This week: ${count} of 7 days active`,
      explanation: `You've only been active on ${count} days this week. Small consistent actions add up — even a short log counts.`,
      priority: 5,
    };
  }

  return null;
}

export function checkVolumeTrend(sessions: WorkoutSession[]): Insight | null {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
  const daysFromMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() - daysFromMon);
  thisMonday.setHours(0, 0, 0, 0);

  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(thisMonday.getDate() - 7);

  const lastSunday = new Date(thisMonday);
  lastSunday.setDate(thisMonday.getDate() - 1);
  lastSunday.setHours(23, 59, 59, 999);

  const thisMondayKey = toLocalDateKey(thisMonday);
  const todayKey = toLocalDateKey(now);
  const lastMondayKey = toLocalDateKey(lastMonday);
  const lastSundayKey = toLocalDateKey(lastSunday);

  let thisWeekVolume = 0;
  let thisWeekCount = 0;
  let lastWeekVolume = 0;
  let lastWeekCount = 0;

  for (const s of sessions) {
    if (s.status !== 'completed') continue;
    const key = toLocalDateKey(s.startedAt.toDate());
    if (key >= thisMondayKey && key <= todayKey) {
      thisWeekVolume += s.totalVolume;
      thisWeekCount++;
    } else if (key >= lastMondayKey && key <= lastSundayKey) {
      lastWeekVolume += s.totalVolume;
      lastWeekCount++;
    }
  }

  if (thisWeekCount < 1 || lastWeekCount < 1 || lastWeekVolume === 0) return null;

  const pctChange = ((thisWeekVolume - lastWeekVolume) / lastWeekVolume) * 100;

  if (pctChange > 10) {
    return {
      id: 'volumeTrend',
      emoji: '📈',
      headline: `Volume up ${Math.round(pctChange)}% this week`,
      explanation: `This week's total volume is ${Math.round(pctChange)}% higher than last week. Keep it up!`,
      priority: 6,
    };
  }

  if (pctChange < -20) {
    return {
      id: 'volumeTrend',
      emoji: '📉',
      headline: `Volume down ${Math.round(Math.abs(pctChange))}% this week`,
      explanation: `This week's total volume is ${Math.round(Math.abs(pctChange))}% lower than last week.`,
      priority: 6,
    };
  }

  return null;
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

type ComputeParams = {
  nutritionLogs: FoodLogEntry[];
  proteinTargetG: number;
  peptides: Peptide[];
  doses: Dose[];
  sessions: WorkoutSession[];
  cardioSessions: CardioSession[];
  weights: BodyWeightEntry[];
};

export function computeInsights(params: ComputeParams): Insight[] {
  const {
    nutritionLogs,
    proteinTargetG,
    peptides,
    doses,
    sessions,
    cardioSessions,
    weights,
  } = params;

  const checks = [
    () => checkProteinGap(nutritionLogs, proteinTargetG),
    () => checkLiftingDayNutrition(nutritionLogs, sessions),
    () => checkPeptideWeightTrend(peptides, weights),
    () => checkCardioAfterInjection(doses, cardioSessions),
    () => checkWeeklyConsistency(sessions, cardioSessions, weights, doses),
    () => checkVolumeTrend(sessions),
  ];

  const results: Insight[] = [];
  for (const check of checks) {
    try {
      const insight = check();
      if (insight) results.push(insight);
    } catch {
      // Individual failures don't block other insights
    }
  }

  return results.sort((a, b) => a.priority - b.priority).slice(0, 3);
}
