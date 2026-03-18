/**
 * Consistency service — computes and persists daily on-plan status.
 *
 * Architecture:
 * - computeConsistency() is a pure function — takes pre-fetched data, returns
 *   ConsistencyData. No Firestore calls. Easily testable.
 * - persistConsistencyDays() writes today + yesterday to Firestore.
 * - getConsistencyDocs() reads 30-day history from Firestore.
 *
 * Mutable window: today + yesterday are always recomputed. Older days are
 * immutable — written once, read from Firestore on subsequent loads.
 */
import { where, orderBy } from 'firebase/firestore';
import { setDocument, mergeDocument, queryDocuments, COLLECTIONS } from './firebase/firestore';
import { toLocalDateKey } from '../utils/nutrition';
import type { DashboardData } from '../types/dashboard';
import type { DayConsistency, ConsistencyData, DayStatus } from '../types/consistency';
import type { Goal } from '../types/profile';
import type { ServiceResult } from '../types/service';

// ─── Date helpers ─────────────────────────────────────────────────────────────

function subtractDays(dateKey: string, days: number): string {
  const d = new Date(dateKey + 'T12:00:00');
  d.setDate(d.getDate() - days);
  return toLocalDateKey(d);
}

function dateKeyFromTimestamp(ts: { toDate: () => Date } | null | undefined): string | null {
  if (!ts?.toDate) return null;
  return toLocalDateKey(ts.toDate());
}

/**
 * Returns true if the given dateKey is a configured rest day.
 * If trainingDays is empty/undefined, every day is a training day.
 */
export function isConfiguredRestDay(dateKey: string, trainingDays: number[] | undefined): boolean {
  if (!trainingDays?.length) return false;
  const d = new Date(dateKey + 'T12:00:00');
  return !trainingDays.includes(d.getDay());
}

// ─── Core computation (pure) ──────────────────────────────────────────────────

export function computeConsistency(params: {
  recentSessions: DashboardData['recentSessions'];
  recentCardio: DashboardData['recentCardio'];
  allDoses: import('../types/peptide').Dose[] | null;  // 30-day doses
  nutritionLogsByDate: Map<string, number>; // date → total calories
  savedDocs: DayConsistency[];
  calorieTarget: number;
  trainingDays: number[];
  userGoals: Goal[];
}): ConsistencyData {
  const { recentSessions, recentCardio, allDoses, nutritionLogsByDate, savedDocs, calorieTarget, trainingDays, userGoals } =
    params;
  const today = toLocalDateKey();

  const savedByDate = new Map(savedDocs.map((d) => [d.date, d]));

  // Workout + cardio by date
  const workoutByDate = new Map<string, { logged: boolean; isBareMinimum: boolean }>();
  if (recentSessions) {
    for (const s of recentSessions) {
      if (s.status !== 'completed') continue;
      const key = dateKeyFromTimestamp(s.startedAt);
      if (!key) continue;
      const existing = workoutByDate.get(key);
      const isBM = s.isBareMinimum ?? false;
      // If multiple sessions on same day, prefer the non-bare-minimum one
      if (!existing || (!isBM && existing.isBareMinimum)) {
        workoutByDate.set(key, { logged: true, isBareMinimum: isBM });
      }
    }
  }
  if (recentCardio) {
    for (const s of recentCardio) {
      const key = dateKeyFromTimestamp(s.startedAt);
      if (key && !workoutByDate.has(key)) {
        workoutByDate.set(key, { logged: true, isBareMinimum: false });
      }
    }
  }

  // Peptide dates (30-day window)
  const peptideDates = new Set<string>();
  if (allDoses) {
    for (const dose of allDoses) {
      const key = dateKeyFromTimestamp(dose.timestamp);
      if (key) peptideDates.add(key);
    }
  }

  const hasTraining = userGoals.includes('training') || userGoals.includes('cardio');
  const hasNutrition = userGoals.includes('nutrition');
  const hasPeptides = userGoals.includes('peptides');

  // Build 30-day array (oldest → newest)
  const days: DayConsistency[] = [];
  for (let i = 29; i >= 0; i--) {
    const dateKey = subtractDays(today, i);
    const saved = savedByDate.get(dateKey);

    // Rest day: explicit override > configured training days
    const restDayOverride = saved?.restDayOverride ?? false;
    const configuredRestDay = isConfiguredRestDay(dateKey, trainingDays);
    const isRestDay = restDayOverride || configuredRestDay;

    const workout = workoutByDate.get(dateKey);
    const workoutLogged = workout?.logged ?? false;
    const isBareMinimum = workout?.isBareMinimum ?? false;
    const totalCals = nutritionLogsByDate.get(dateKey) ?? 0;
    const nutritionPercent =
      calorieTarget > 0 ? (totalCals / calorieTarget) * 100 : 0;
    const peptideLogged = peptideDates.has(dateKey);

    let status: DayStatus;

    if (isRestDay && !workoutLogged && totalCals === 0 && !peptideLogged) {
      // Rest day with no activity — neutral
      status = 'rest';
    } else {
      // Determine "on plan" based on user goals
      const fullCriteria: boolean[] = [];
      const partialCriteria: boolean[] = [];

      if (hasTraining) {
        if (workoutLogged && !isBareMinimum) fullCriteria.push(true);
        else if (workoutLogged && isBareMinimum) partialCriteria.push(true);
        else fullCriteria.push(false);
      }

      if (hasNutrition) {
        if (nutritionPercent >= 80) fullCriteria.push(true);
        else if (nutritionPercent > 0) partialCriteria.push(true);
        else fullCriteria.push(false);
      }

      if (hasPeptides) {
        if (peptideLogged) fullCriteria.push(true);
        else fullCriteria.push(false);
      }

      // Fallback: if no goals configured, any activity = full
      const noGoalsConfigured = !hasTraining && !hasNutrition && !hasPeptides;
      if (noGoalsConfigured) {
        status =
          workoutLogged || totalCals > 0 || peptideLogged
            ? 'full'
            : isRestDay
              ? 'rest'
              : 'missed';
      } else {
        const allFull = fullCriteria.length > 0 && fullCriteria.every(Boolean);
        const anyMet = fullCriteria.some(Boolean) || partialCriteria.length > 0;
        if (allFull) status = 'full';
        else if (anyMet) status = 'partial';
        else status = isRestDay ? 'rest' : 'missed';
      }
    }

    days.push({
      date: dateKey,
      status,
      workoutLogged,
      isBareMinimum,
      nutritionPercent,
      peptideLogged,
      isRestDay,
      restDayOverride: saved?.restDayOverride,
      updatedAt: saved?.updatedAt ?? 0,
    });
  }

  // ─── Aggregate scores ─────────────────────────────────────────────────────

  const isOnPlan = (d: DayConsistency) => d.status === 'full' || d.status === 'partial';

  const last14 = days.slice(-14);
  const onPlanCount14 = last14.filter(isOnPlan).length;

  const now = new Date();
  const firstOfMonth = toLocalDateKey(new Date(now.getFullYear(), now.getMonth(), 1));
  const monthDays = days.filter((d) => d.date >= firstOfMonth && d.date <= today);
  const monthPlanned = monthDays.filter((d) => d.status !== 'rest');
  const monthlyPercent =
    monthPlanned.length > 0
      ? Math.round((monthPlanned.filter(isOnPlan).length / monthPlanned.length) * 100)
      : 100;

  const dayOfWeek = now.getDay();
  const daysFromMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = subtractDays(today, daysFromMon);
  const weekDays = days.filter((d) => d.date >= weekStart && d.date <= today);
  const weekPlanned = weekDays.filter((d) => d.status !== 'rest');
  const weeklyScore =
    weekPlanned.length > 0
      ? Math.round((weekPlanned.filter(isOnPlan).length / weekPlanned.length) * 100)
      : 100;

  return { days, onPlanLast14: onPlanCount14, monthlyPercent, weeklyScore };
}

// ─── Firestore helpers ────────────────────────────────────────────────────────

export async function getConsistencyDocs(
  startDate: string,
  endDate: string,
): Promise<ServiceResult<DayConsistency[]>> {
  return queryDocuments<DayConsistency>(COLLECTIONS.CONSISTENCY, [
    where('date', '>=', startDate),
    where('date', '<=', endDate),
    orderBy('date', 'asc'),
  ]);
}

export async function persistConsistencyDay(day: DayConsistency): Promise<void> {
  await setDocument(COLLECTIONS.CONSISTENCY, day.date, { ...day, updatedAt: Date.now() } as DayConsistency);
}

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Mark a specific day as a manual rest day override.
 * Called when user taps "Mark as rest day" in the calendar tooltip.
 */
export async function markRestDayOverride(dateKey: string): Promise<void> {
  if (!DATE_KEY_RE.test(dateKey)) return;
  await mergeDocument(COLLECTIONS.CONSISTENCY, dateKey, {
    date: dateKey,
    status: 'rest' as DayStatus,
    isRestDay: false,
    restDayOverride: true,
    updatedAt: Date.now(),
  } as unknown as DayConsistency);
}

/**
 * Toggle rest day override for a date.
 * Sets restDayOverride to the given value.
 */
export async function toggleRestDay(dateKey: string, isRestDay: boolean): Promise<void> {
  if (!DATE_KEY_RE.test(dateKey)) return;
  await mergeDocument(COLLECTIONS.CONSISTENCY, dateKey, {
    date: dateKey,
    restDayOverride: isRestDay,
    updatedAt: Date.now(),
  } as unknown as DayConsistency);
}
