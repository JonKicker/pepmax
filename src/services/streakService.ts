/**
 * Streak service — pure computation from already-fetched dashboard data.
 * No Firestore calls — derives streak by walking dates backwards.
 */
import type { DashboardData, StreakData } from '../types/dashboard';

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function subtractDays(dateKey: string, days: number): string {
  const d = new Date(dateKey + 'T12:00:00');
  d.setDate(d.getDate() - days);
  return toDateKey(d);
}

/**
 * Collect all unique date keys where user had activity across modules.
 */
function collectActiveDates(data: DashboardData): Set<string> {
  const dates = new Set<string>();

  // Peptide doses
  if (data.doses) {
    for (const dose of data.doses) {
      if (dose.timestamp?.toDate) {
        dates.add(toDateKey(dose.timestamp.toDate()));
      }
    }
  }

  // Nutrition (only today if totals exist with calories > 0)
  if (data.totals && data.totals.calories > 0) {
    dates.add(toDateKey(new Date()));
  }

  // Workout sessions
  if (data.recentSessions) {
    for (const s of data.recentSessions) {
      const d = s.startedAt?.toDate ? s.startedAt.toDate() : null;
      if (d) dates.add(toDateKey(d));
    }
  }

  // Cardio sessions
  if (data.recentCardio) {
    for (const s of data.recentCardio) {
      const d = s.startedAt?.toDate ? s.startedAt.toDate() : null;
      if (d) dates.add(toDateKey(d));
    }
  }

  // Body weight logs
  if (data.recentWeights) {
    for (const w of data.recentWeights) {
      if (w.date) dates.add(w.date);
    }
  }

  return dates;
}

export function computeStreak(data: DashboardData): StreakData {
  const activeDates = collectActiveDates(data);
  if (activeDates.size === 0) {
    return { current: 0, longest: 0, lastActiveDate: '' };
  }

  const today = toDateKey(new Date());
  let current = 0;
  let checkDate = today;

  // Walk backwards from today
  while (activeDates.has(checkDate)) {
    current++;
    checkDate = subtractDays(checkDate, 1);
  }

  // If today has no activity yet, check if yesterday was active (streak not broken yet)
  if (current === 0) {
    const yesterday = subtractDays(today, 1);
    checkDate = yesterday;
    while (activeDates.has(checkDate)) {
      current++;
      checkDate = subtractDays(checkDate, 1);
    }
  }

  // Compute longest streak from all dates
  const sorted = Array.from(activeDates).sort();
  let longest = 0;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = subtractDays(sorted[i], 1);
    if (prev === sorted[i - 1]) {
      run++;
    } else {
      longest = Math.max(longest, run);
      run = 1;
    }
  }
  longest = Math.max(longest, run, current);

  const lastActiveDate = sorted[sorted.length - 1];

  return { current, longest, lastActiveDate };
}
