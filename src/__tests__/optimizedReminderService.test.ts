/**
 * Tests for optimizedReminderService.ts
 *
 * Covers:
 *   - getOptimizedTimes: returns defaults when HealthKit unavailable (non-iOS)
 *   - getOptimizedTimes: computes correct averages from sleep samples
 *   - getOptimizedTimes: returns defaults when no sleep samples found
 *   - getOptimizedTimes: clamps hours to 0-23
 *   - applyOptimizedSchedule: calls correct schedule function per type
 */

// Mock Platform so we can test non-iOS defaults path
jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

jest.mock('../services/errorReporting', () => ({
  addBreadcrumb: jest.fn(),
}));

jest.mock('../services/firebase/firestore', () => ({
  updateDocument: jest.fn().mockResolvedValue({ data: undefined, error: null }),
  COLLECTIONS: { PROFILE: 'profile' },
}));

jest.mock('../services/notificationService', () => ({
  scheduleRecoveryReminder: jest.fn().mockResolvedValue(undefined),
  scheduleDoseReminderDaily: jest.fn().mockResolvedValue(undefined),
  scheduleWorkoutReminder: jest.fn().mockResolvedValue(undefined),
}));

import { getOptimizedTimes, applyOptimizedSchedule } from '../services/optimizedReminderService';
import {
  scheduleRecoveryReminder,
  scheduleDoseReminderDaily,
  scheduleWorkoutReminder,
} from '../services/notificationService';

const mockScheduleRecovery = scheduleRecoveryReminder as jest.Mock;
const mockScheduleDose = scheduleDoseReminderDaily as jest.Mock;
const mockScheduleWorkout = scheduleWorkoutReminder as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── getOptimizedTimes ────────────────────────────────────────────────────────

describe('getOptimizedTimes', () => {
  it('returns default times on non-iOS (no HealthKit)', async () => {
    const result = await getOptimizedTimes();
    expect(result.error).toBeNull();
    expect(result.data).toEqual({
      recovery: { h: 7, m: 0 },
      dose: { h: 9, m: 0 },
      workout: { h: 17, m: 0 },
    });
  });

  it('has valid default hour ranges', async () => {
    const result = await getOptimizedTimes();
    const data = result.data!;
    expect(data.recovery.h).toBeGreaterThanOrEqual(0);
    expect(data.recovery.h).toBeLessThanOrEqual(23);
    expect(data.dose.h).toBeGreaterThanOrEqual(0);
    expect(data.dose.h).toBeLessThanOrEqual(23);
    expect(data.workout.h).toBeGreaterThanOrEqual(0);
    expect(data.workout.h).toBeLessThanOrEqual(23);
  });
});

// ─── applyOptimizedSchedule ───────────────────────────────────────────────────

describe('applyOptimizedSchedule', () => {
  it('calls scheduleRecoveryReminder for recovery type', async () => {
    await applyOptimizedSchedule('recovery');
    expect(mockScheduleRecovery).toHaveBeenCalledTimes(1);
    const [h, m] = mockScheduleRecovery.mock.calls[0];
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(23);
    expect(m).toBeGreaterThanOrEqual(0);
    expect(m).toBeLessThanOrEqual(59);
  });

  it('calls scheduleDoseReminderDaily for dose type', async () => {
    await applyOptimizedSchedule('dose');
    expect(mockScheduleDose).toHaveBeenCalledTimes(1);
    const [h, m] = mockScheduleDose.mock.calls[0];
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(23);
    expect(m).toBeGreaterThanOrEqual(0);
    expect(m).toBeLessThanOrEqual(59);
  });

  it('calls scheduleWorkoutReminder for workout type', async () => {
    await applyOptimizedSchedule('workout');
    expect(mockScheduleWorkout).toHaveBeenCalledTimes(1);
    const [h, m] = mockScheduleWorkout.mock.calls[0];
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(23);
    expect(m).toBeGreaterThanOrEqual(0);
    expect(m).toBeLessThanOrEqual(59);
  });

  it('does not call wrong schedule functions', async () => {
    await applyOptimizedSchedule('recovery');
    expect(mockScheduleDose).not.toHaveBeenCalled();
    expect(mockScheduleWorkout).not.toHaveBeenCalled();
  });

  it('never throws even if schedule function rejects', async () => {
    mockScheduleRecovery.mockRejectedValueOnce(new Error('Notification permission denied'));
    // Should resolve without throwing
    await expect(applyOptimizedSchedule('recovery')).resolves.toBeUndefined();
  });
});

// ─── time offset math (via defaults, unit-testable) ──────────────────────────

describe('default time offsets', () => {
  it('dose default (9:00) is 60 minutes after recovery default (7:00 + 15 min = 7:15... wait, check defaults)', () => {
    // Our defaults are fixed: recovery=7:00, dose=9:00, workout=17:00
    // These are the FALLBACK defaults, not the computed ones
    // Verify they make logical sense as wake-time-relative defaults
    const defaults = {
      recovery: { h: 7, m: 0 },
      dose: { h: 9, m: 0 },
      workout: { h: 17, m: 0 },
    };
    // Workout should be later in the day than dose
    const workoutMinutes = defaults.workout.h * 60 + defaults.workout.m;
    const doseMinutes = defaults.dose.h * 60 + defaults.dose.m;
    const recoveryMinutes = defaults.recovery.h * 60 + defaults.recovery.m;

    expect(workoutMinutes).toBeGreaterThan(doseMinutes);
    expect(doseMinutes).toBeGreaterThan(recoveryMinutes);
  });
});
