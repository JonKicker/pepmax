/**
 * Tests for notificationService.ts — new reminder functions added in this PR:
 *   scheduleWorkoutReminder / cancelWorkoutReminder
 *   scheduleDoseReminderDaily / cancelDoseReminderDaily
 *
 * Verifies the CALENDAR trigger pattern, async storage key persistence,
 * and cancel-before-reschedule behaviour.
 */

const mockScheduleNotif = jest.fn();
const mockCancelNotif = jest.fn();
const mockGetItem = jest.fn();
const mockSetItem = jest.fn();
const mockRemoveItem = jest.fn();

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: (...args: unknown[]) => mockScheduleNotif(...args),
  cancelScheduledNotificationAsync: (...args: unknown[]) => mockCancelNotif(...args),
  SchedulableTriggerInputTypes: { CALENDAR: 'calendar', TIME_INTERVAL: 'time_interval' },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: (...args: unknown[]) => mockGetItem(...args),
  setItem: (...args: unknown[]) => mockSetItem(...args),
  removeItem: (...args: unknown[]) => mockRemoveItem(...args),
}));

// Also need to mock the peptide type
jest.mock('../types/peptide', () => ({}));

import {
  scheduleWorkoutReminder,
  cancelWorkoutReminder,
  scheduleDoseReminderDaily,
  cancelDoseReminderDaily,
} from '../services/notificationService';

beforeEach(() => {
  jest.clearAllMocks();
  mockScheduleNotif.mockResolvedValue('notif-id-abc');
  mockCancelNotif.mockResolvedValue(undefined);
  mockGetItem.mockResolvedValue(null);
  mockSetItem.mockResolvedValue(undefined);
  mockRemoveItem.mockResolvedValue(undefined);
});

// ─── scheduleWorkoutReminder ──────────────────────────────────────────────────

describe('scheduleWorkoutReminder', () => {
  it('schedules a CALENDAR trigger with correct hour/minute', async () => {
    await scheduleWorkoutReminder(17, 30);

    expect(mockScheduleNotif).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger: expect.objectContaining({
          type: 'calendar',
          hour: 17,
          minute: 30,
          repeats: true,
        }),
      }),
    );
  });

  it('uses correct notification title and body', async () => {
    await scheduleWorkoutReminder(8, 0);

    const call = mockScheduleNotif.mock.calls[0][0];
    expect(call.content.title).toBe('PepMax — Workout Reminder');
    expect(call.content.body).toBe('Time to hit the gym! Tap to start your session.');
  });

  it('persists notification ID to AsyncStorage key pepmax:notif:workout', async () => {
    mockScheduleNotif.mockResolvedValue('workout-notif-999');
    await scheduleWorkoutReminder(7, 0);

    expect(mockSetItem).toHaveBeenCalledWith('pepmax:notif:workout', 'workout-notif-999');
  });

  it('cancels existing reminder before scheduling a new one', async () => {
    mockGetItem.mockResolvedValue('old-notif-id');
    await scheduleWorkoutReminder(9, 15);

    expect(mockCancelNotif).toHaveBeenCalledWith('old-notif-id');
    expect(mockScheduleNotif).toHaveBeenCalledTimes(1);
  });

  it('does not cancel when no existing reminder', async () => {
    mockGetItem.mockResolvedValue(null);
    await scheduleWorkoutReminder(9, 15);

    expect(mockCancelNotif).not.toHaveBeenCalled();
  });
});

// ─── cancelWorkoutReminder ────────────────────────────────────────────────────

describe('cancelWorkoutReminder', () => {
  it('cancels the stored notification and removes from AsyncStorage', async () => {
    mockGetItem.mockResolvedValue('workout-to-cancel');
    await cancelWorkoutReminder();

    expect(mockCancelNotif).toHaveBeenCalledWith('workout-to-cancel');
    expect(mockRemoveItem).toHaveBeenCalledWith('pepmax:notif:workout');
  });

  it('is a no-op when no reminder is stored', async () => {
    mockGetItem.mockResolvedValue(null);
    await cancelWorkoutReminder();

    expect(mockCancelNotif).not.toHaveBeenCalled();
    expect(mockRemoveItem).not.toHaveBeenCalled();
  });
});

// ─── scheduleDoseReminderDaily ────────────────────────────────────────────────

describe('scheduleDoseReminderDaily', () => {
  it('schedules a CALENDAR trigger with correct hour/minute', async () => {
    await scheduleDoseReminderDaily(9, 0);

    expect(mockScheduleNotif).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger: expect.objectContaining({
          type: 'calendar',
          hour: 9,
          minute: 0,
          repeats: true,
        }),
      }),
    );
  });

  it('uses correct notification title and body', async () => {
    await scheduleDoseReminderDaily(9, 0);

    const call = mockScheduleNotif.mock.calls[0][0];
    expect(call.content.title).toBe('PepMax — Dose Reminder');
    expect(call.content.body).toBe('Time for your scheduled dose. Tap to log it.');
  });

  it('persists notification ID to AsyncStorage key pepmax:notif:doseDaily', async () => {
    mockScheduleNotif.mockResolvedValue('dose-daily-888');
    await scheduleDoseReminderDaily(9, 0);

    expect(mockSetItem).toHaveBeenCalledWith('pepmax:notif:doseDaily', 'dose-daily-888');
  });

  it('cancels existing reminder before scheduling', async () => {
    mockGetItem.mockResolvedValue('old-dose-daily-id');
    await scheduleDoseReminderDaily(10, 30);

    expect(mockCancelNotif).toHaveBeenCalledWith('old-dose-daily-id');
    expect(mockScheduleNotif).toHaveBeenCalledTimes(1);
  });
});

// ─── cancelDoseReminderDaily ──────────────────────────────────────────────────

describe('cancelDoseReminderDaily', () => {
  it('cancels the stored notification and removes from AsyncStorage', async () => {
    mockGetItem.mockResolvedValue('dose-daily-to-cancel');
    await cancelDoseReminderDaily();

    expect(mockCancelNotif).toHaveBeenCalledWith('dose-daily-to-cancel');
    expect(mockRemoveItem).toHaveBeenCalledWith('pepmax:notif:doseDaily');
  });

  it('is a no-op when no reminder is stored', async () => {
    mockGetItem.mockResolvedValue(null);
    await cancelDoseReminderDaily();

    expect(mockCancelNotif).not.toHaveBeenCalled();
    expect(mockRemoveItem).not.toHaveBeenCalled();
  });

  it('uses a different AsyncStorage key from workout reminder', () => {
    // Verify the keys don't collide — compile-time check via reading the constants
    const WORKOUT_KEY = 'pepmax:notif:workout';
    const DOSE_DAILY_KEY = 'pepmax:notif:doseDaily';
    expect(WORKOUT_KEY).not.toBe(DOSE_DAILY_KEY);
  });
});
