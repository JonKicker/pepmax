/**
 * HealthKit service — all Apple Health read/write operations.
 *
 * Every exported function:
 *  - Starts with a Platform.OS !== 'ios' guard → returns null/no-op
 *  - Is wrapped in try/catch → never throws, returns null on failure
 *  - Errors are breadcrumbed via errorReporting, never surfaced to UI
 *
 * Write functions are designed for fire-and-forget (.catch(() => {})) callers.
 * They return a UUID string on success (for deduplication) or null on failure.
 */
import { Platform } from 'react-native';
import {
  isHealthDataAvailable,
  requestAuthorization,
  queryCategorySamples,
  queryQuantitySamples,
  saveQuantitySample,
  saveWorkoutSample,
  WorkoutActivityType,
  CategoryValueSleepAnalysis,
} from '@kingstinct/react-native-healthkit';
import { addBreadcrumb } from './errorReporting';
import { HK_READ_IDENTIFIERS, HK_WRITE_IDENTIFIERS } from '../constants/healthKit';
import { isHKEnabled } from '../utils/hkEnabled';
import type { HealthKitRecoveryData, HealthKitSleepData } from '../types/healthKit';
import type { ActivityType } from '../types/cardio';

// ─── Availability ────────────────────────────────────────────────────────────

export async function isAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    return await isHealthDataAvailable();
  } catch {
    return false;
  }
}

// ─── Permissions ─────────────────────────────────────────────────────────────

export async function requestPermissions(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    await requestAuthorization({
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
  if (Platform.OS !== 'ios') return null;
  try {
    // Night before: 6pm previous day → noon same day
    const dayStart = new Date(`${date}T18:00:00`);
    dayStart.setDate(dayStart.getDate() - 1);
    const dayEnd = new Date(`${date}T12:00:00`);

    const samples = await queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis', {
      limit: 0,
      filter: { date: { startDate: dayStart, endDate: dayEnd } },
    });

    if (!samples || samples.length === 0) return null;

    let totalMinutes = 0;
    let deepMinutes = 0;
    let remMinutes = 0;

    for (const sample of samples) {
      const durationMs =
        new Date(sample.endDate).getTime() - new Date(sample.startDate).getTime();
      const minutes = durationMs / 60_000;
      const val = sample.value;

      if (
        val === CategoryValueSleepAnalysis.asleepCore ||
        val === CategoryValueSleepAnalysis.asleepUnspecified
      ) {
        totalMinutes += minutes;
      } else if (val === CategoryValueSleepAnalysis.asleepDeep) {
        totalMinutes += minutes;
        deepMinutes += minutes;
      } else if (val === CategoryValueSleepAnalysis.asleepREM) {
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
  if (Platform.OS !== 'ios') return null;
  try {
    const dayStart = new Date(`${date}T00:00:00`);
    const dayEnd = new Date(`${date}T23:59:59`);

    const samples = await queryQuantitySamples('HKQuantityTypeIdentifierRestingHeartRate', {
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
  if (Platform.OS !== 'ios') return null;
  try {
    const dayStart = new Date(`${date}T00:00:00`);
    const dayEnd = new Date(`${date}T23:59:59`);

    const samples = await queryQuantitySamples(
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

// ─── Read: Step Count ────────────────────────────────────────────────────────

export async function fetchStepCount(date: string): Promise<number | null> {
  if (Platform.OS !== 'ios') return null;
  try {
    const dayStart = new Date(`${date}T00:00:00`);
    const dayEnd = new Date(`${date}T23:59:59`);

    const samples = await queryQuantitySamples('HKQuantityTypeIdentifierStepCount', {
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
  if (Platform.OS !== 'ios') return null;
  try {
    const samples = await queryQuantitySamples('HKQuantityTypeIdentifierBodyMass', {
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
  if (Platform.OS !== 'ios') return {};
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
  if (Platform.OS !== 'ios') return null;
  if (!isHKEnabled()) return null;
  try {
    const startDate = new Date(`${data.date}T12:00:00`);
    const endDate = new Date(startDate.getTime() + 60_000);

    const calSample = await saveQuantitySample(
      'HKQuantityTypeIdentifierDietaryEnergyConsumed',
      'kcal',
      data.calories,
      startDate,
      endDate,
    );

    await Promise.allSettled([
      saveQuantitySample(
        'HKQuantityTypeIdentifierDietaryProtein',
        'g',
        data.protein,
        startDate,
        endDate,
      ),
      saveQuantitySample(
        'HKQuantityTypeIdentifierDietaryCarbohydrates',
        'g',
        data.carbs,
        startDate,
        endDate,
      ),
      saveQuantitySample(
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

const ACTIVITY_TYPE_MAP: Record<ActivityType, WorkoutActivityType> = {
  run: WorkoutActivityType.running,
  cycle: WorkoutActivityType.cycling,
  walk: WorkoutActivityType.walking,
  swim: WorkoutActivityType.swimming,
};

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
  if (Platform.OS !== 'ios') return null;
  if (!isHKEnabled()) return null;
  const hkType = ACTIVITY_TYPE_MAP[data.activityType];
  if (!hkType) return null;
  try {
    const workout = await saveWorkoutSample(
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
  if (Platform.OS !== 'ios') return null;
  if (!isHKEnabled()) return null;
  try {
    const workout = await saveWorkoutSample(
      WorkoutActivityType.traditionalStrengthTraining,
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
  if (Platform.OS !== 'ios') return null;
  if (!isHKEnabled()) return null;
  try {
    const sample = await saveQuantitySample(
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
  if (Platform.OS !== 'ios') return null;
  if (!isHKEnabled()) return null;
  try {
    // HealthKit stores body fat as a fraction 0–1
    const sample = await saveQuantitySample(
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
