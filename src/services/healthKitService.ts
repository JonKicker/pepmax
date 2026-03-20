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
import HealthKit, {
  HKQuantityTypeIdentifier,
  HKCategoryTypeIdentifier,
  HKWorkoutActivityType,
  HKCategoryValueSleepAnalysis,
  HKUnit,
} from '@kingstinct/react-native-healthkit';
import { addBreadcrumb } from './errorReporting';
import { HK_READ_PERMISSIONS, HK_WRITE_PERMISSIONS } from '../constants/healthKit';
import type { HealthKitRecoveryData, HealthKitSleepData } from '../types/healthKit';
import type { ActivityType } from '../types/cardio';

// ─── Availability ────────────────────────────────────────────────────────────

export async function isAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    return await HealthKit.isHealthDataAvailable();
  } catch {
    return false;
  }
}

// ─── Permissions ─────────────────────────────────────────────────────────────

export async function requestPermissions(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    await HealthKit.requestAuthorization(
      HK_READ_PERMISSIONS as (HKQuantityTypeIdentifier | HKCategoryTypeIdentifier)[],
      HK_WRITE_PERMISSIONS as HKQuantityTypeIdentifier[],
    );
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
    const dayStart = new Date(`${date}T06:00:00`);
    dayStart.setDate(dayStart.getDate() - 1);
    const dayEnd = new Date(`${date}T12:00:00`);

    const samples = await HealthKit.queryCategorySamples(
      HKCategoryTypeIdentifier.sleepAnalysis,
      { from: dayStart, to: dayEnd },
    );

    if (!samples || samples.length === 0) return null;

    let totalMinutes = 0;
    let deepMinutes = 0;
    let remMinutes = 0;

    for (const sample of samples) {
      const durationMs =
        new Date(sample.endDate).getTime() - new Date(sample.startDate).getTime();
      const minutes = durationMs / 60_000;

      // HKCategoryValueSleepAnalysis: 0=inBed, 1=asleep(core), 2=awake,
      // 3=deep, 4=rem (watchOS 9+ / iOS 16+ values)
      const val = sample.value;
      if (val === HKCategoryValueSleepAnalysis.asleepCore || val === 1) {
        totalMinutes += minutes;
      } else if (val === HKCategoryValueSleepAnalysis.asleepDeep || val === 3) {
        totalMinutes += minutes;
        deepMinutes += minutes;
      } else if (val === HKCategoryValueSleepAnalysis.asleepREM || val === 4) {
        totalMinutes += minutes;
        remMinutes += minutes;
      } else if (val === HKCategoryValueSleepAnalysis.asleepUnspecified || val === 0) {
        totalMinutes += minutes;
      }
    }

    const totalHours = Math.round((totalMinutes / 60) * 2) / 2; // 0.5 increments
    if (totalHours === 0) return null;

    // Base quality 1–5 from total duration
    let quality: number;
    if (totalHours < 5) quality = 1;
    else if (totalHours < 6) quality = 2;
    else if (totalHours < 7) quality = 3;
    else if (totalHours < 8.5) quality = 4;
    else quality = 5;

    // Refine quality using restorative sleep stages when available
    if (totalMinutes > 0 && (deepMinutes > 0 || remMinutes > 0)) {
      const restorativeRatio = (deepMinutes + remMinutes) / totalMinutes;
      if (restorativeRatio > 0.35) quality = Math.min(5, quality + 1);
      else if (restorativeRatio < 0.15) quality = Math.max(1, quality - 1);
    }

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

    const samples = await HealthKit.queryQuantitySamples(
      HKQuantityTypeIdentifier.restingHeartRate,
      { from: dayStart, to: dayEnd, limit: 1, ascending: false },
    );

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

    const samples = await HealthKit.queryQuantitySamples(
      HKQuantityTypeIdentifier.heartRateVariabilitySDNN,
      { from: dayStart, to: dayEnd, limit: 1, ascending: false },
    );

    if (!samples || samples.length === 0) return null;
    return Math.round(samples[0].quantity);
  } catch (e) {
    addBreadcrumb('healthKit', 'fetchHRV failed', { error: String(e) });
    return null;
  }
}

// ─── Read: Step Count ─────────────────────────────────────────────────────────

export async function fetchStepCount(date: string): Promise<number | null> {
  if (Platform.OS !== 'ios') return null;
  try {
    const dayStart = new Date(`${date}T00:00:00`);
    const dayEnd = new Date(`${date}T23:59:59`);

    const samples = await HealthKit.queryQuantitySamples(
      HKQuantityTypeIdentifier.stepCount,
      { from: dayStart, to: dayEnd },
    );

    if (!samples || samples.length === 0) return null;
    return Math.round(samples.reduce((sum, s) => sum + s.quantity, 0));
  } catch (e) {
    addBreadcrumb('healthKit', 'fetchStepCount failed', { error: String(e) });
    return null;
  }
}

// ─── Read: Weight ─────────────────────────────────────────────────────────────

export async function fetchLatestWeight(): Promise<{ kg: number; date: Date } | null> {
  if (Platform.OS !== 'ios') return null;
  try {
    const samples = await HealthKit.queryQuantitySamples(
      HKQuantityTypeIdentifier.bodyMass,
      { limit: 1, ascending: false },
    );

    if (!samples || samples.length === 0) return null;
    return { kg: samples[0].quantity, date: new Date(samples[0].endDate) };
  } catch (e) {
    addBreadcrumb('healthKit', 'fetchLatestWeight failed', { error: String(e) });
    return null;
  }
}

// ─── Read: Combined Recovery Data ────────────────────────────────────────────

export async function fetchRecoveryData(date: string): Promise<HealthKitRecoveryData> {
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
  try {
    const startDate = new Date(`${data.date}T12:00:00`);
    const endDate = new Date(startDate.getTime() + 60_000);

    // Write each macro as a separate sample; use calories UUID as the canonical one
    const uuid = await HealthKit.saveQuantitySample(
      HKQuantityTypeIdentifier.dietaryEnergyConsumed,
      HKUnit.Kilocalorie,
      data.calories,
      startDate,
      endDate,
    );

    await Promise.allSettled([
      HealthKit.saveQuantitySample(
        HKQuantityTypeIdentifier.dietaryProtein,
        HKUnit.Gram,
        data.protein,
        startDate,
        endDate,
      ),
      HealthKit.saveQuantitySample(
        HKQuantityTypeIdentifier.dietaryCarbohydrates,
        HKUnit.Gram,
        data.carbs,
        startDate,
        endDate,
      ),
      HealthKit.saveQuantitySample(
        HKQuantityTypeIdentifier.dietaryFatTotal,
        HKUnit.Gram,
        data.fat,
        startDate,
        endDate,
      ),
    ]);

    return uuid ?? null;
  } catch (e) {
    addBreadcrumb('healthKit', 'writeNutrition failed', { error: String(e) });
    return null;
  }
}

// ─── Write: Cardio Workout ───────────────────────────────────────────────────

const ACTIVITY_TYPE_MAP: Record<ActivityType, HKWorkoutActivityType> = {
  run: HKWorkoutActivityType.running,
  cycle: HKWorkoutActivityType.cycling,
  walk: HKWorkoutActivityType.walking,
  swim: HKWorkoutActivityType.swimming,
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
  try {
    const uuid = await HealthKit.saveWorkout({
      startDate: data.startDate,
      endDate: data.endDate,
      activityType: ACTIVITY_TYPE_MAP[data.activityType],
      totalEnergyBurned: data.calories,
      totalEnergyBurnedUnit: HKUnit.Kilocalorie,
      totalDistance: data.distanceMeters / 1000,
      totalDistanceUnit: HKUnit.Kilometer,
    });

    return uuid ?? null;
  } catch (e) {
    addBreadcrumb('healthKit', 'writeCardioWorkout failed', { error: String(e) });
    return null;
  }
}

// ─── Write: Strength Workout ─────────────────────────────────────────────────

type StrengthWriteData = {
  startDate: Date;
  endDate: Date;
  durationSeconds: number;
};

export async function writeStrengthWorkout(data: StrengthWriteData): Promise<string | null> {
  if (Platform.OS !== 'ios') return null;
  try {
    const uuid = await HealthKit.saveWorkout({
      startDate: data.startDate,
      endDate: data.endDate,
      activityType: HKWorkoutActivityType.traditionalStrengthTraining,
    });

    return uuid ?? null;
  } catch (e) {
    addBreadcrumb('healthKit', 'writeStrengthWorkout failed', { error: String(e) });
    return null;
  }
}

// ─── Write: Body Weight ──────────────────────────────────────────────────────

export async function writeBodyWeight(kg: number, date: Date): Promise<string | null> {
  if (Platform.OS !== 'ios') return null;
  try {
    const uuid = await HealthKit.saveQuantitySample(
      HKQuantityTypeIdentifier.bodyMass,
      HKUnit.Kilogram,
      kg,
      date,
      date,
    );
    return uuid ?? null;
  } catch (e) {
    addBreadcrumb('healthKit', 'writeBodyWeight failed', { error: String(e) });
    return null;
  }
}

// ─── Write: Body Fat ─────────────────────────────────────────────────────────

export async function writeBodyFat(percent: number, date: Date): Promise<string | null> {
  if (Platform.OS !== 'ios') return null;
  try {
    const uuid = await HealthKit.saveQuantitySample(
      HKQuantityTypeIdentifier.bodyFatPercentage,
      HKUnit.Percent,
      percent / 100, // HK stores as 0–1 fraction
      date,
      date,
    );
    return uuid ?? null;
  } catch (e) {
    addBreadcrumb('healthKit', 'writeBodyFat failed', { error: String(e) });
    return null;
  }
}
