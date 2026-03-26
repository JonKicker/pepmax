/**
 * Optimized reminder service — HealthKit-aware notification scheduling.
 *
 * Analyses the last 7 days of HealthKit sleep data to determine the user's
 * average wake time, then computes optimal notification times:
 *   Recovery check-in = wake + 15 min
 *   Dose reminder     = wake + 60 min
 *   Workout reminder  = wake + 10 hours
 *
 * Falls back to fixed defaults when HealthKit data is unavailable.
 *
 * Profile updates are fire-and-forget to avoid blocking the caller.
 */
import { Platform } from 'react-native';
import { addBreadcrumb } from './errorReporting';
import { updateDocument, COLLECTIONS } from './firebase/firestore';
import {
  scheduleRecoveryReminder,
  scheduleDoseReminderDaily,
  scheduleWorkoutReminder,
} from './notificationService';
import type { ServiceResult } from '../types/service';

// ─── HealthKit lazy import (mirrors healthKitService.ts pattern) ─────────────

let HK: {
  queryCategorySamples: (type: string, opts: unknown) => Promise<Array<{ startDate: string; endDate: string; value: number }>>;
  CategoryValueSleepAnalysis: Record<string, number>;
} | null = null;

try {
  if (Platform.OS === 'ios') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('@kingstinct/react-native-healthkit');
    HK = {
      queryCategorySamples: mod.queryCategorySamples,
      CategoryValueSleepAnalysis: mod.CategoryValueSleepAnalysis,
    };
  }
} catch {
  HK = null;
}

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULTS = {
  recovery: { h: 7, m: 0 },
  dose: { h: 9, m: 0 },
  workout: { h: 17, m: 0 },
} as const;

type OptimizedTimes = {
  recovery: { h: number; m: number };
  dose: { h: number; m: number };
  workout: { h: number; m: number };
};

// ─── Core computation ────────────────────────────────────────────────────────

/**
 * Query last 7 days of HealthKit sleep data to derive average wake time.
 * Returns optimized notification times, or defaults when data is unavailable.
 */
export async function getOptimizedTimes(): Promise<ServiceResult<OptimizedTimes>> {
  try {
    if (!HK) {
      return { data: { ...DEFAULTS }, error: null };
    }

    addBreadcrumb('optimizedReminderService', 'getOptimizedTimes start');

    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);

    const samples = await HK.queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis', {
      limit: 0,
      filter: { date: { startDate: start, endDate: end } },
    });

    if (!samples || samples.length === 0) {
      return { data: { ...DEFAULTS }, error: null };
    }

    const CSV = HK.CategoryValueSleepAnalysis;
    const asleepValues = new Set([
      CSV.asleepCore,
      CSV.asleepDeep,
      CSV.asleepREM,
      CSV.asleepUnspecified,
    ]);

    // Group samples by calendar date (YYYY-MM-DD of the wake day)
    // For each day, track the latest endDate among asleep* samples
    const latestWakeByDay = new Map<string, number>();

    for (const s of samples) {
      if (!asleepValues.has(s.value)) continue;
      const endMs = new Date(s.endDate).getTime();
      const dayKey = new Date(s.endDate).toISOString().slice(0, 10);
      const existing = latestWakeByDay.get(dayKey) ?? 0;
      if (endMs > existing) {
        latestWakeByDay.set(dayKey, endMs);
      }
    }

    if (latestWakeByDay.size === 0) {
      return { data: { ...DEFAULTS }, error: null };
    }

    // Average wake time — compute mean of (hour * 60 + minute) across days
    let totalMinutes = 0;
    for (const ms of latestWakeByDay.values()) {
      const d = new Date(ms);
      totalMinutes += d.getHours() * 60 + d.getMinutes();
    }
    const avgWakeMinutes = Math.round(totalMinutes / latestWakeByDay.size);

    // Derive optimized offsets, clamp hours to 0–23
    const clampHour = (h: number) => Math.min(23, Math.max(0, h));

    const recoveryMinutes = avgWakeMinutes + 15;
    const doseMinutes = avgWakeMinutes + 60;
    const workoutMinutes = avgWakeMinutes + 600; // +10 hours

    const result: OptimizedTimes = {
      recovery: { h: clampHour(Math.floor(recoveryMinutes / 60) % 24), m: recoveryMinutes % 60 },
      dose: { h: clampHour(Math.floor(doseMinutes / 60) % 24), m: doseMinutes % 60 },
      workout: { h: clampHour(Math.floor(workoutMinutes / 60) % 24), m: workoutMinutes % 60 },
    };

    addBreadcrumb('optimizedReminderService', 'times computed', {
      avgWakeH: Math.floor(avgWakeMinutes / 60),
      avgWakeM: avgWakeMinutes % 60,
    });

    return { data: result, error: null };
  } catch (e) {
    // Graceful fallback
    return { data: { ...DEFAULTS }, error: null };
  }
}

// ─── Apply ───────────────────────────────────────────────────────────────────

/**
 * Compute optimized times and schedule the appropriate notification.
 * Profile notificationPrefs are updated fire-and-forget.
 */
export async function applyOptimizedSchedule(
  type: 'recovery' | 'dose' | 'workout',
): Promise<void> {
  try {
    addBreadcrumb('optimizedReminderService', 'applyOptimizedSchedule', { type });

    const result = await getOptimizedTimes();
    // Always has data (defaults on error)
    const times = result.data!;

    if (type === 'recovery') {
      const { h, m } = times.recovery;
      await scheduleRecoveryReminder(h, m);
      updateDocument(COLLECTIONS.PROFILE, 'data', {
        'notificationPrefs.recoveryCheckInHour': h,
        'notificationPrefs.recoveryCheckInMinute': m,
        'notificationPrefs.recoveryCheckInOptimized': true,
      }).catch(() => {});
    } else if (type === 'dose') {
      const { h, m } = times.dose;
      await scheduleDoseReminderDaily(h, m);
      updateDocument(COLLECTIONS.PROFILE, 'data', {
        'notificationPrefs.doseReminderHour': h,
        'notificationPrefs.doseReminderMinute': m,
        'notificationPrefs.doseReminderOptimized': true,
      }).catch(() => {});
    } else if (type === 'workout') {
      const { h, m } = times.workout;
      await scheduleWorkoutReminder(h, m);
      updateDocument(COLLECTIONS.PROFILE, 'data', {
        'notificationPrefs.workoutReminderHour': h,
        'notificationPrefs.workoutReminderMinute': m,
        'notificationPrefs.workoutReminderOptimized': true,
      }).catch(() => {});
    }
  } catch {
    // Best-effort — never block the UI
  }
}
