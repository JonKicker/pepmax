/**
 * Pure dose schedule generation utility for the Cycle Planner.
 * No React or Firebase dependencies — easy to test in isolation.
 */
import type {
  IncrementFrequency,
  InjectionFrequency,
  DayOfWeek,
  PlannedDose,
  TaperConfig,
} from '../types/cycle';

// ─── Input / Output types ─────────────────────────────────────────────────────

export type CyclePlannerInput = {
  startingDose: number;
  incrementAmount: number;
  incrementFrequency: IncrementFrequency;
  maxDose: number;
  injectionFrequency: InjectionFrequency;
  preferredDays: DayOfWeek[];
  startDate: string; // 'YYYY-MM-DD'
  durationWeeks: number | null; // null = open-ended (capped at 52)
  taperEnabled: boolean;
  taperConfig: TaperConfig | null;
};

export type CyclePlannerResult = {
  plannedDoses: PlannedDose[];
  totalInjections: number;
  totalCompoundNeeded: number;
  peakDose: number;
  cycleEndDate: string; // 'YYYY-MM-DD'
  isOpenEnded: boolean;
};

// ─── Date helpers ─────────────────────────────────────────────────────────────

/** Parse 'YYYY-MM-DD' to a local Date (midnight local time). */
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Format a local Date to 'YYYY-MM-DD'. */
export function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Get today as 'YYYY-MM-DD'. */
export function todayStr(): string {
  return toLocalDateStr(new Date());
}

function addDays(d: Date, n: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + n);
  return result;
}

// Maps DayOfWeek labels to JS getDay() values (0 = Sun, 1 = Mon, ..., 6 = Sat)
const DOW_TO_JS: Record<DayOfWeek, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 0,
};

const INCREMENT_PERIOD_WEEKS: Record<Exclude<IncrementFrequency, 'manual'>, number> = {
  weekly: 1,
  biweekly: 2,
  monthly: 4,
};

// ─── Core helpers ─────────────────────────────────────────────────────────────

function isInjectionDay(
  date: Date,
  startDate: Date,
  frequency: InjectionFrequency,
  preferredDays: DayOfWeek[],
): boolean {
  const daysDiff = Math.round(
    (date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  const jsDay = date.getDay();

  switch (frequency) {
    case 'daily':
      return true;

    case 'eod':
      return daysDiff % 2 === 0;

    case 'weekly': {
      const target =
        preferredDays.length > 0 ? DOW_TO_JS[preferredDays[0]] : startDate.getDay();
      return jsDay === target;
    }

    case '2xWeek': {
      const days = preferredDays.slice(0, 2).map((d) => DOW_TO_JS[d]);
      return days.includes(jsDay);
    }

    case '3xWeek': {
      const days = preferredDays.slice(0, 3).map((d) => DOW_TO_JS[d]);
      return days.includes(jsDay);
    }

    default:
      return false;
  }
}

function computeDoseForDay(
  daysDiff: number,
  startingDose: number,
  incrementAmount: number,
  incrementFrequency: IncrementFrequency,
  maxDose: number,
  taperEnabled: boolean,
  taperConfig: TaperConfig | null,
  durationWeeks: number | null,
): { amount: number; isIncreaseDay: boolean; isTaperDay: boolean } {
  const weekNumber = Math.floor(daysDiff / 7);

  // ── Taper phase check ────────────────────────────────────────────────────
  if (taperEnabled && taperConfig && durationWeeks !== null) {
    const mainPhaseWeeks = durationWeeks - taperConfig.taperWeeks;

    if (weekNumber >= mainPhaseWeeks) {
      const taperWeeksElapsed = weekNumber - mainPhaseWeeks;
      const taperPeriod = INCREMENT_PERIOD_WEEKS[taperConfig.taperStepFrequency] ?? 1;
      const tapersApplied = Math.floor(taperWeeksElapsed / taperPeriod);

      // Compute peak dose at end of main phase
      let peakDose = startingDose;
      if (incrementFrequency !== 'manual' && incrementAmount > 0) {
        const periodWeeks = INCREMENT_PERIOD_WEEKS[incrementFrequency];
        const increments = Math.floor(mainPhaseWeeks / periodWeeks);
        peakDose = Math.min(startingDose + increments * incrementAmount, maxDose);
      }

      const amount = Math.max(peakDose - tapersApplied * taperConfig.taperStepAmount, 0);
      // isTaperDay only when dose actually decreased (not on the taper start day at peak)
      const isTaperDay = taperWeeksElapsed > 0 && taperWeeksElapsed % taperPeriod === 0;

      return { amount, isIncreaseDay: false, isTaperDay };
    }
  }

  // ── Main phase (flat or titrating) ───────────────────────────────────────
  if (incrementFrequency === 'manual' || incrementAmount === 0) {
    return { amount: startingDose, isIncreaseDay: false, isTaperDay: false };
  }

  const periodWeeks = INCREMENT_PERIOD_WEEKS[incrementFrequency];
  const incrementsApplied = Math.floor(weekNumber / periodWeeks);
  const amount = Math.min(startingDose + incrementsApplied * incrementAmount, maxDose);

  // isIncreaseDay: first day of a new increment period where dose actually increased
  const isNewPeriod = weekNumber > 0 && weekNumber % periodWeeks === 0;
  const prevAmount = Math.min(
    startingDose + (incrementsApplied - 1) * incrementAmount,
    maxDose,
  );
  const isIncreaseDay = isNewPeriod && amount > prevAmount;

  return { amount, isIncreaseDay, isTaperDay: false };
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function generateCyclePlan(input: CyclePlannerInput): CyclePlannerResult {
  const {
    startingDose,
    incrementAmount,
    incrementFrequency,
    maxDose,
    injectionFrequency,
    preferredDays,
    startDate,
    durationWeeks,
    taperEnabled,
    taperConfig,
  } = input;

  const start = parseLocalDate(startDate);
  const totalWeeks = durationWeeks ?? 52; // cap open-ended at 52 weeks
  const end = addDays(start, totalWeeks * 7 - 1);

  const plannedDoses: PlannedDose[] = [];
  let current = new Date(start);

  while (current <= end) {
    if (isInjectionDay(current, start, injectionFrequency, preferredDays)) {
      const daysDiff = Math.round(
        (current.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
      );
      const { amount, isIncreaseDay, isTaperDay } = computeDoseForDay(
        daysDiff,
        startingDose,
        incrementAmount,
        incrementFrequency,
        maxDose,
        taperEnabled,
        taperConfig,
        durationWeeks,
      );

      if (amount > 0) {
        plannedDoses.push({
          date: toLocalDateStr(current),
          amount,
          isIncreaseDay,
          isTaperDay,
        });
      }
    }
    current = addDays(current, 1);
  }

  const totalCompoundNeeded = plannedDoses.reduce((sum, d) => sum + d.amount, 0);
  const peakDose = plannedDoses.reduce((max, d) => Math.max(max, d.amount), startingDose);

  return {
    plannedDoses,
    totalInjections: plannedDoses.length,
    totalCompoundNeeded: Math.round(totalCompoundNeeded * 1000) / 1000,
    peakDose,
    cycleEndDate: toLocalDateStr(end),
    isOpenEnded: durationWeeks === null,
  };
}
