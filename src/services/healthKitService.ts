/**
 * HealthKit service — all Apple Health read/write operations.
 *
 * Every exported function:
 *  - Starts with a `!HK` guard → returns null/no-op when native module is absent
 *  - Is wrapped in try/catch → never throws, returns null on failure
 *  - Errors are breadcrumbed via errorReporting, never surfaced to UI
 *
 * Write functions are designed for fire-and-forget (.catch(() => {})) callers.
 * They return a UUID string on success (for deduplication) or null on failure.
 *
 * NitroModules guard: the @kingstinct/react-native-healthkit import is wrapped
 * in a try/catch so the app doesn't crash in Expo Go (which lacks NitroModules).
 * When unavailable, every function degrades to a safe no-op.
 */
import { Platform } from 'react-native';
import { addBreadcrumb } from './errorReporting';
import { HK_READ_IDENTIFIERS, HK_WRITE_IDENTIFIERS } from '../constants/healthKit';
import { isHKEnabled } from '../utils/hkEnabled';
import type { HealthKitRecoveryData, HealthKitSleepData } from '../types/healthKit';
import type { ActivityType } from '../types/cardio';

// ─── Lazy native module import (safe for Expo Go) ────────────────────────────

let HK: {
  isHealthDataAvailable: () => Promise<boolean>;
  requestAuthorization: (opts: { toRead: string[]; toShare: string[] }) => Promise<void>;
  queryCategorySamples: (type: string, opts: unknown) => Promise<Array<{ startDate: string; endDate: string; value: number }>>;
  queryQuantitySamples: (type: string, opts: unknown) => Promise<Array<{ quantity: number; endDate: string; uuid?: string }>>;
  saveQuantitySample: (type: string, unit: string, value: number, start: Date, end: Date) => Promise<{ uuid?: string } | null>;
  saveWorkoutSample: (type: number, samples: unknown[], start: Date, end: Date, opts?: unknown) => Promise<{ uuid?: string } | null>;
  WorkoutActivityType: Record<string, number>;
  CategoryValueSleepAnalysis: Record<string, number>;
} | null = null;

/** true when the native HealthKit module loaded successfully */
export function isHealthKitAvailable(): boolean {
  return HK !== null;
}

try {
  if (Platform.OS === 'ios') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('@kingstinct/react-native-healthkit');
    // Manual shim — signatures may drift if upstream package changes
    HK = {
      isHealthDataAvailable: mod.isHealthDataAvailable,
      requestAuthorization: mod.requestAuthorization,
      queryCategorySamples: mod.queryCategorySamples,
      queryQuantitySamples: mod.queryQuantitySamples,
      saveQuantitySample: mod.saveQuantitySample,
      saveWorkoutSample: mod.saveWorkoutSample,
      WorkoutActivityType: mod.WorkoutActivityType,
      CategoryValueSleepAnalysis: mod.CategoryValueSleepAnalysis,
    };
  }
} catch {
  // NitroModules not available (e.g. Expo Go) — all functions will no-op
  if (__DEV__) console.log('[HealthKit] Native module unavailable — running in stub mode');
  HK = null;
}

// ─── Availability ────────────────────────────────────────────────────────────

export async function isAvailable(): Promise<boolean> {
  if (!HK) return false;
  try {
    return await HK.isHealthDataAvailable();
  } catch {
    return false;
  }
}

// ─── Permissions ─────────────────────────────────────────────────────────────

export async function requestPermissions(): Promise<boolean> {
  if (!HK) return false;
  try {
    await HK.requestAuthorization({
      toRead: HK_READ_IDENTIFIERS,
      toShare: HK_WRITE_IDENTIFIERS,
    });
    return true;
  } catch (e) {
    addBreadcrumb('healthKit', 'requestPermissions failed', { error: String(e) });
    return false;
  }
}

// ─── Read: Sleep ─────────────────────────────────────────────────────────────

export async function fetchSleepData(date: string): Promise<HealthKitSleepData | null> {
  if (!HK) return null;
  try {
    // Night before: 6pm previous day → noon same day
    const dayStart = new Date(`${date}T18:00:00`);
    dayStart.setDate(dayStart.getDate() - 1);
    const dayEnd = new Date(`${date}T12:00:00`);

    const samples = await HK.queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis', {
      limit: 0,
      filter: { date: { startDate: dayStart, endDate: dayEnd } },
    });

    if (!samples || samples.length === 0) return null;

    let totalMinutes = 0;
    let deepMinutes = 0;
    let remMinutes = 0;

    const CSV = HK.CategoryValueSleepAnalysis;
    for (const sample of samples) {
      const durationMs =
        new Date(sample.endDate).getTime() - new Date(sample.startDate).getTime();
      const minutes = durationMs / 60_000;
      const val = sample.value;

      if (
        val === CSV.asleepCore ||
        val === CSV.asleepUnspecified
      ) {
        totalMinutes += minutes;
      } else if (val === CSV.asleepDeep) {
        totalMinutes += minutes;
        deepMinutes += minutes;
      } else if (val === CSV.asleepREM) {
        totalMinutes += minutes;
        remMinutes += minutes;
      }
      // inBed values don't count toward sleep totals
    }

    const totalHours = Math.round((totalMinutes / 60) * 2) / 2; // 0.5 increments
    if (totalHours === 0) return null;

    // Estimate quality 1–5 from total hours
    let quality: number;
    if (totalHours < 5) quality = 1;
    else if (totalHours < 6) quality = 2;
    else if (totalHours < 7) quality = 3;
    else if (totalHours < 8.5) quality = 4;
    else quality = 5;

    return {
      totalHours,
      quality,
      deepSleepMinutes: deepMinutes > 0 ? Math.round(deepMinutes) : undefined,
      remSleepMinutes: remMinutes > 0 ? Math.round(remMinutes) : undefined,
    };
  } catch (e) {
    addBreadcrumb('healthKit', 'fetchSleepData failed', { error: String(e) });
    return null;
  }
}

// ─── Read: Resting Heart Rate ────────────────────────────────────────────────

export async function fetchRestingHeartRate(date: string): Promise<number | null> {
  if (!HK) return null;
  try {
    const dayStart = new Date(`${date}T00:00:00`);
    const dayEnd = new Date(`${date}T23:59:59`);

    const samples = await HK.queryQuantitySamples('HKQuantityTypeIdentifierRestingHeartRate', {
      limit: 1,
      ascending: false,
      filter: { date: { startDate: dayStart, endDate: dayEnd } },
    });

    if (!samples || samples.length === 0) return null;
    return Math.round(samples[0].quantity);
  } catch (e) {
    addBreadcrumb('healthKit', 'fetchRestingHeartRate failed', { error: String(e) });
    return null;
  }
}

// ─── Read: HRV ───────────────────────────────────────────────────────────────

export async function fetchHRV(date: string): Promise<number | null> {
  if (!HK) return null;
  try {
    const dayStart = new Date(`${date}T00:00:00`);
    const dayEnd = new Date(`${date}T23:59:59`);

    const samples = await HK.queryQuantitySamples(
      'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
      {
        limit: 1,
        ascending: false,
        filter: { date: { startDate: dayStart, endDate: dayEnd } },
      },
    );

    if (!samples || samples.length === 0) return null;
    return Math.round(samples[0].quantity);
  } catch (e) {
    addBreadcrumb('healthKit', 'fetchHRV failed', { error: String(e) });
    return null;
  }
}

// ─── Read: HRV History (multi-day) ──────────────────────────────────────────

/**
 * Fetch the last N days of daily HRV samples from HealthKit.
 * Returns one value per day (latest sample for that day). Used to bootstrap
 * the 30-day HRV baseline on first recovery score computation.
 */
export async function fetchHRVHistory(
  days: number,
): Promise<Array<{ date: string; value: number }> | null> {
  if (!HK) return null;
  try {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    const samples = await HK.queryQuantitySamples(
      'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
      { limit: 0, ascending: false, filter: { date: { startDate: start, endDate: end } } },
    );
    if (!samples || samples.length === 0) return null;

    // Group by date, keep latest per day
    const byDate = new Map<string, number>();
    for (const s of samples) {
      const d = new Date(s.endDate).toISOString().slice(0, 10);
      if (!byDate.has(d)) byDate.set(d, Math.round(s.quantity));
    }
    return Array.from(byDate, ([date, value]) => ({ date, value }));
  } catch (e) {
    addBreadcrumb('healthKit', 'fetchHRVHistory failed', { error: String(e) });
    return null;
  }
}

// ─── Read: RHR History (multi-day) ──────────────────────────────────────────

/**
 * Fetch the last N days of daily resting heart rate samples from HealthKit.
 * Returns one value per day (latest sample for that day). Used to bootstrap
 * the 30-day RHR baseline on first recovery score computation.
 */
export async function fetchRHRHistory(
  days: number,
): Promise<Array<{ date: string; value: number }> | null> {
  if (!HK) return null;
  try {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    const samples = await HK.queryQuantitySamples(
      'HKQuantityTypeIdentifierRestingHeartRate',
      { limit: 0, ascending: false, filter: { date: { startDate: start, endDate: end } } },
    );
    if (!samples || samples.length === 0) return null;

    const byDate = new Map<string, number>();
    for (const s of samples) {
      const d = new Date(s.endDate).toISOString().slice(0, 10);
      if (!byDate.has(d)) byDate.set(d, Math.round(s.quantity));
    }
    return Array.from(byDate, ([date, value]) => ({ date, value }));
  } catch (e) {
    addBreadcrumb('healthKit', 'fetchRHRHistory failed', { error: String(e) });
    return null;
  }
}

// ─── Read: Step Count ────────────────────────────────────────────────────────

export async function fetchStepCount(date: string): Promise<number | null> {
  if (!HK) return null;
  try {
    const dayStart = new Date(`${date}T00:00:00`);
    const dayEnd = new Date(`${date}T23:59:59`);

    const samples = await HK.queryQuantitySamples('HKQuantityTypeIdentifierStepCount', {
      limit: 0,
      filter: { date: { startDate: dayStart, endDate: dayEnd } },
    });

    if (!samples || samples.length === 0) return null;
    return Math.round(samples.reduce((sum, s) => sum + s.quantity, 0));
  } catch (e) {
    addBreadcrumb('healthKit', 'fetchStepCount failed', { error: String(e) });
    return null;
  }
}

// ─── Read: Weight ────────────────────────────────────────────────────────────

export async function fetchLatestWeight(): Promise<{ kg: number; date: Date } | null> {
  if (!HK) return null;
  try {
    const samples = await HK.queryQuantitySamples('HKQuantityTypeIdentifierBodyMass', {
      limit: 1,
      ascending: false,
      filter: {},
    });

    if (!samples || samples.length === 0) return null;
    return { kg: samples[0].quantity, date: new Date(samples[0].endDate) };
  } catch (e) {
    addBreadcrumb('healthKit', 'fetchLatestWeight failed', { error: String(e) });
    return null;
  }
}

// ─── Read: Combined Recovery Data ────────────────────────────────────────────

export async function fetchRecoveryData(date: string): Promise<HealthKitRecoveryData> {
  if (!HK) return {};
  const [sleep, restingHR, hrv] = await Promise.all([
    fetchSleepData(date),
    fetchRestingHeartRate(date),
    fetchHRV(date),
  ]);
  return {
    ...(sleep ? { sleep } : {}),
    ...(restingHR != null ? { restingHR } : {}),
    ...(hrv != null ? { hrv } : {}),
  };
}

// ─── Write: Nutrition ────────────────────────────────────────────────────────

type NutritionWriteData = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  date: string;
};

export async function writeNutrition(data: NutritionWriteData): Promise<string | null> {
  if (!HK) return null;
  if (!isHKEnabled()) return null;
  try {
    const startDate = new Date(`${data.date}T12:00:00`);
    const endDate = new Date(startDate.getTime() + 60_000);

    const calSample = await HK.saveQuantitySample(
      'HKQuantityTypeIdentifierDietaryEnergyConsumed',
      'kcal',
      data.calories,
      startDate,
      endDate,
    );

    await Promise.allSettled([
      HK.saveQuantitySample(
        'HKQuantityTypeIdentifierDietaryProtein',
        'g',
        data.protein,
        startDate,
        endDate,
      ),
      HK.saveQuantitySample(
        'HKQuantityTypeIdentifierDietaryCarbohydrates',
        'g',
        data.carbs,
        startDate,
        endDate,
      ),
      HK.saveQuantitySample(
        'HKQuantityTypeIdentifierDietaryFatTotal',
        'g',
        data.fat,
        startDate,
        endDate,
      ),
    ]);

    return calSample?.uuid ?? null;
  } catch (e) {
    addBreadcrumb('healthKit', 'writeNutrition failed', { error: String(e) });
    return null;
  }
}

// ─── Write: Cardio Workout ───────────────────────────────────────────────────

type CardioWriteData = {
  activityType: ActivityType;
  startDate: Date;
  endDate: Date;
  distanceMeters: number;
  durationSeconds: number;
  calories: number;
  avgHeartRate?: number;
};

export async function writeCardioWorkout(data: CardioWriteData): Promise<string | null> {
  if (!HK) return null;
  if (!isHKEnabled()) return null;
  const WAT = HK.WorkoutActivityType;
  const ACTIVITY_TYPE_MAP: Record<string, number> = {
    run: WAT.running,
    cycle: WAT.cycling,
    walk: WAT.walking,
    swim: WAT.swimming,
  };
  const hkType = ACTIVITY_TYPE_MAP[data.activityType];
  if (hkType == null) return null;
  try {
    const workout = await HK.saveWorkoutSample(
      hkType,
      [],
      data.startDate,
      data.endDate,
      {
        energyBurned: data.calories,
        distance: data.distanceMeters / 1000, // km
      },
    );
    return workout?.uuid ?? null;
  } catch (e) {
    addBreadcrumb('healthKit', 'writeCardioWorkout failed', { error: String(e) });
    return null;
  }
}

// ─── Write: Strength Workout ─────────────────────────────────────────────────

type StrengthWriteData = {
  startDate: Date;
  endDate: Date;
};

export async function writeStrengthWorkout(data: StrengthWriteData): Promise<string | null> {
  if (!HK) return null;
  if (!isHKEnabled()) return null;
  try {
    const workout = await HK.saveWorkoutSample(
      HK.WorkoutActivityType.traditionalStrengthTraining,
      [],
      data.startDate,
      data.endDate,
    );
    return workout?.uuid ?? null;
  } catch (e) {
    addBreadcrumb('healthKit', 'writeStrengthWorkout failed', { error: String(e) });
    return null;
  }
}

// ─── Write: Body Weight ──────────────────────────────────────────────────────

export async function writeBodyWeight(kg: number, date: Date): Promise<string | null> {
  if (!HK) return null;
  if (!isHKEnabled()) return null;
  try {
    const sample = await HK.saveQuantitySample(
      'HKQuantityTypeIdentifierBodyMass',
      'kg',
      kg,
      date,
      date,
    );
    return sample?.uuid ?? null;
  } catch (e) {
    addBreadcrumb('healthKit', 'writeBodyWeight failed', { error: String(e) });
    return null;
  }
}

// ─── Write: Body Fat ─────────────────────────────────────────────────────────

export async function writeBodyFat(percent: number, date: Date): Promise<string | null> {
  if (!HK) return null;
  if (!isHKEnabled()) return null;
  try {
    // HealthKit stores body fat as a fraction 0–1
    const sample = await HK.saveQuantitySample(
      'HKQuantityTypeIdentifierBodyFatPercentage',
      '%',
      percent / 100,
      date,
      date,
    );
    return sample?.uuid ?? null;
  } catch (e) {
    addBreadcrumb('healthKit', 'writeBodyFat failed', { error: String(e) });
    return null;
  }
}
