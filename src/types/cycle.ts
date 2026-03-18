import { Timestamp } from 'firebase/firestore';
import type { Unit } from './peptide';

// ─── Increment frequency ─────────────────────────────────────────────────────

export type IncrementFrequency = 'weekly' | 'biweekly' | 'monthly' | 'manual';

export const INCREMENT_FREQUENCIES: IncrementFrequency[] = [
  'weekly',
  'biweekly',
  'monthly',
  'manual',
];

export const INCREMENT_FREQUENCY_LABELS: Record<IncrementFrequency, string> = {
  weekly: 'Every week',
  biweekly: 'Every 2 weeks',
  monthly: 'Every 4 weeks',
  manual: 'Manual',
};

/** How many weeks per period (manual excluded — no auto-increment). */
export const INCREMENT_FREQUENCY_WEEKS: Record<Exclude<IncrementFrequency, 'manual'>, number> = {
  weekly: 1,
  biweekly: 2,
  monthly: 4,
};

// ─── Injection frequency ─────────────────────────────────────────────────────

export type InjectionFrequency = 'daily' | 'eod' | '2xWeek' | '3xWeek' | 'weekly';

export const INJECTION_FREQUENCIES: InjectionFrequency[] = [
  'daily',
  'eod',
  '2xWeek',
  '3xWeek',
  'weekly',
];

export const INJECTION_FREQUENCY_LABELS: Record<InjectionFrequency, string> = {
  daily: 'Daily',
  eod: 'Every Other Day',
  '2xWeek': '2x / Week',
  '3xWeek': '3x / Week',
  weekly: 'Weekly',
};

/** Number of preferred days required for each injection frequency. */
export const INJECTION_FREQ_DAY_COUNT: Partial<Record<InjectionFrequency, number>> = {
  '2xWeek': 2,
  '3xWeek': 3,
  weekly: 1,
};

// ─── Day of week ─────────────────────────────────────────────────────────────

export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export const DAYS_OF_WEEK: DayOfWeek[] = [
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
  'Sun',
];

// ─── Core types ───────────────────────────────────────────────────────────────

export type CycleStatus = 'active' | 'completed' | 'paused';

export type TaperConfig = {
  taperWeeks: number;
  taperStepAmount: number;
  taperStepFrequency: Exclude<IncrementFrequency, 'manual'>;
};

export type PlannedDose = {
  date: string; // 'YYYY-MM-DD'
  amount: number;
  isIncreaseDay: boolean;
  isTaperDay: boolean;
  completedAt?: Timestamp;
  completedDoseId?: string;
};

export type Cycle = {
  id: string;
  compoundId: string;
  compoundName: string;
  unit: Unit;
  startingDose: number;
  incrementAmount: number;
  incrementFrequency: IncrementFrequency;
  maxDose: number;
  injectionFrequency: InjectionFrequency;
  preferredDays: DayOfWeek[];
  preferredTime: string; // 'HH:mm' 24-hour
  startDate: string; // 'YYYY-MM-DD'
  durationWeeks: number | null; // null = open-ended
  taperEnabled: boolean;
  taperConfig: TaperConfig | null;
  plannedDoses: PlannedDose[];
  status: CycleStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

// ─── Wizard form state ────────────────────────────────────────────────────────
// String fields for TextInput binding; parsed to numbers on save.

export type CycleWizardData = {
  // Step 1
  compoundId: string;
  compoundName: string;
  unit: Unit;
  // Step 2
  startingDose: string;
  incrementAmount: string;
  incrementFrequency: IncrementFrequency;
  maxDose: string;
  taperEnabled: boolean;
  taperWeeks: string;
  taperStepAmount: string;
  taperStepFrequency: Exclude<IncrementFrequency, 'manual'>;
  // Step 3
  injectionFrequency: InjectionFrequency;
  preferredDays: DayOfWeek[];
  preferredTime: string; // 'HH:mm'
  startDate: string; // 'YYYY-MM-DD'
  durationWeeks: string; // '' = not set
  openEnded: boolean;
};
