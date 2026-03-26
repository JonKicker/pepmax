/**
 * Notification service — local push notification scheduling via expo-notifications.
 *
 * Notification IDs are persisted in AsyncStorage keyed by peptide ID so that
 * pre-existing reminders can be reliably cancelled before re-scheduling.
 * (Ray Item 3 — deterministic identifier scheme)
 */
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Frequency } from '../types/peptide';

const DOSE_IDS_KEY = 'pepmax:notif:doses';
const INVENTORY_IDS_KEY = 'pepmax:notif:inventory';

/** Maps Frequency enum values to approximate interval hours. 'custom' excluded — no reliable interval. */
export const FREQUENCY_TO_HOURS: Partial<Record<Frequency, number>> = {
  daily: 24,
  everyOtherDay: 48,
  '3xPerWeek': 56, // 168h / 3
  weekly: 168,
};

// ─── Storage helpers ──────────────────────────────────────────────────────────

async function readDoseIds(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(DOSE_IDS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

async function writeDoseIds(ids: Record<string, string>): Promise<void> {
  try {
    await AsyncStorage.setItem(DOSE_IDS_KEY, JSON.stringify(ids));
  } catch {
    // Non-fatal — reminder scheduling still succeeded
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Request notification permissions. Returns true if granted. */
export async function requestPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Schedule (or re-schedule) a dose reminder for a peptide.
 * Cancels any existing reminder for the same peptide before scheduling.
 * No-ops silently if scheduling fails — dose logging must not be blocked.
 */
export async function scheduleDoseReminder(
  peptideId: string,
  peptideName: string,
  intervalHours: number,
): Promise<void> {
  try {
    const ids = await readDoseIds();
    if (ids[peptideId]) {
      await Notifications.cancelScheduledNotificationAsync(ids[peptideId]).catch(() => {});
    }

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'PepMax — Dose Reminder',
        body: `Time for your ${peptideName.slice(0, 64)} dose`,
        sound: true,
      },
      trigger: { seconds: Math.round(intervalHours * 3600), type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL },
    });

    ids[peptideId] = id;
    await writeDoseIds(ids);
  } catch {
    // Silently swallow — reminder scheduling is best-effort
  }
}

/** Cancel a single peptide's dose reminder. */
export async function cancelDoseReminder(peptideId: string): Promise<void> {
  try {
    const ids = await readDoseIds();
    if (ids[peptideId]) {
      await Notifications.cancelScheduledNotificationAsync(ids[peptideId]).catch(() => {});
      delete ids[peptideId];
      await writeDoseIds(ids);
    }
  } catch {
    // Non-fatal
  }
}

// ─── Inventory low-stock notifications ────────────────────────────────────────

async function readInventoryIds(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(INVENTORY_IDS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

async function writeInventoryIds(ids: Record<string, string>): Promise<void> {
  try {
    await AsyncStorage.setItem(INVENTORY_IDS_KEY, JSON.stringify(ids));
  } catch {
    // Non-fatal
  }
}

/**
 * Schedule a low-stock notification for an inventory item.
 * Cancels any existing notification for the same item before scheduling.
 */
export async function scheduleLowStockNotification(
  itemId: string,
  itemName: string,
  daysRemaining: number,
): Promise<void> {
  try {
    const ids = await readInventoryIds();
    if (ids[itemId]) {
      await Notifications.cancelScheduledNotificationAsync(ids[itemId]).catch(() => {});
    }

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'PepMax — Low Stock Alert',
        body: `Your ${itemName.slice(0, 64)} supply will run out in approximately ${Math.round(daysRemaining)} days`,
        sound: true,
      },
      trigger: {
        seconds: 24 * 3600,
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      },
    });

    ids[itemId] = id;
    await writeInventoryIds(ids);
  } catch {
    // Silently swallow — low-stock alerts are best-effort
  }
}

/** Cancel a single item's low-stock notification. */
export async function cancelLowStockNotification(itemId: string): Promise<void> {
  try {
    const ids = await readInventoryIds();
    if (ids[itemId]) {
      await Notifications.cancelScheduledNotificationAsync(ids[itemId]).catch(() => {});
      delete ids[itemId];
      await writeInventoryIds(ids);
    }
  } catch {
    // Non-fatal
  }
}

/** Cancel ALL low-stock notifications. */
export async function cancelAllLowStockNotifications(): Promise<void> {
  try {
    const ids = await readInventoryIds();
    await Promise.all(
      Object.values(ids).map((id) =>
        Notifications.cancelScheduledNotificationAsync(id).catch(() => {}),
      ),
    );
    await AsyncStorage.removeItem(INVENTORY_IDS_KEY);
  } catch {
    // Non-fatal
  }
}

// ─── Recovery check-in reminder ─────────────────────────────────────────────

const RECOVERY_ID_KEY = 'pepmax:notif:recovery';

/**
 * Schedule a daily repeating recovery check-in reminder at the given time.
 * Cancels any existing reminder before scheduling.
 * Data payload includes `screen` for deep-link routing.
 */
export async function scheduleRecoveryReminder(
  hour: number,
  minute: number,
): Promise<void> {
  try {
    await cancelRecoveryReminder();

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'PepMax — Morning Check-In',
        body: 'How are you feeling? Tap to log your recovery.',
        sound: true,
        data: { screen: 'morning-check-in' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour,
        minute,
        repeats: true,
      },
    });

    await AsyncStorage.setItem(RECOVERY_ID_KEY, id);
  } catch {
    // Best-effort — scheduling failure should not block the app
  }
}

/** Cancel the daily recovery check-in reminder. */
export async function cancelRecoveryReminder(): Promise<void> {
  try {
    const id = await AsyncStorage.getItem(RECOVERY_ID_KEY);
    if (id) {
      await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
      await AsyncStorage.removeItem(RECOVERY_ID_KEY);
    }
  } catch {
    // Non-fatal
  }
}

// ─── Workout reminders ───────────────────────────────────────────────────────

const WORKOUT_ID_KEY = 'pepmax:notif:workout';

/**
 * Schedule a daily repeating workout reminder at the given time.
 * Cancels any existing reminder before scheduling.
 */
export async function scheduleWorkoutReminder(
  hour: number,
  minute: number,
): Promise<void> {
  try {
    await cancelWorkoutReminder();

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'PepMax — Workout Reminder',
        body: 'Time to hit the gym! Tap to start your session.',
        sound: true,
        data: { screen: 'training' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour,
        minute,
        repeats: true,
      },
    });

    await AsyncStorage.setItem(WORKOUT_ID_KEY, id);
  } catch {
    // Best-effort — scheduling failure should not block the app
  }
}

/** Cancel the daily workout reminder. */
export async function cancelWorkoutReminder(): Promise<void> {
  try {
    const id = await AsyncStorage.getItem(WORKOUT_ID_KEY);
    if (id) {
      await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
      await AsyncStorage.removeItem(WORKOUT_ID_KEY);
    }
  } catch {
    // Non-fatal
  }
}

// ─── Daily dose reminders (time-of-day, not peptide-specific) ───────────────

const DOSE_DAILY_ID_KEY = 'pepmax:notif:doseDaily';

/**
 * Schedule a daily repeating dose reminder at the given time.
 * This is distinct from per-peptide interval reminders — it fires once per day
 * at a user-chosen time as a general prompt to log their dose.
 * Cancels any existing reminder before scheduling.
 */
export async function scheduleDoseReminderDaily(
  hour: number,
  minute: number,
): Promise<void> {
  try {
    await cancelDoseReminderDaily();

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'PepMax — Dose Reminder',
        body: 'Time for your scheduled dose. Tap to log it.',
        sound: true,
        data: { screen: 'peptides' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour,
        minute,
        repeats: true,
      },
    });

    await AsyncStorage.setItem(DOSE_DAILY_ID_KEY, id);
  } catch {
    // Best-effort — scheduling failure should not block the app
  }
}

/** Cancel the daily dose reminder. */
export async function cancelDoseReminderDaily(): Promise<void> {
  try {
    const id = await AsyncStorage.getItem(DOSE_DAILY_ID_KEY);
    if (id) {
      await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
      await AsyncStorage.removeItem(DOSE_DAILY_ID_KEY);
    }
  } catch {
    // Non-fatal
  }
}

// ─── Fasting window reminders ────────────────────────────────────────────────

export const FASTING_OPEN_ID_KEY = 'pepmax:notif:fasting:open';
export const FASTING_CLOSE_ID_KEY = 'pepmax:notif:fasting:close';

/**
 * Schedule two daily repeating reminders for the fasting window:
 *   - 30 minutes before the eating window opens (fast about to end)
 *   - 30 minutes before the eating window closes (window about to end)
 *
 * Cancels any existing fasting reminders before scheduling.
 * Both use CALENDAR triggers with repeats:true for daily recurrence.
 */
export async function scheduleFastingReminders(
  windowStart: string,
  windowEnd: string,
): Promise<void> {
  try {
    await cancelFastingReminders();

    const parseTime = (hhmm: string): { hour: number; minute: number } => {
      const parts = hhmm.split(':');
      return {
        hour: parseInt(parts[0] ?? '0', 10),
        minute: parseInt(parts[1] ?? '0', 10),
      };
    };

    const subtractMinutes = (
      hour: number,
      minute: number,
      mins: number,
    ): { hour: number; minute: number } => {
      const totalMinutes = hour * 60 + minute - mins;
      const adjusted = ((totalMinutes % 1440) + 1440) % 1440; // wrap at midnight
      return { hour: Math.floor(adjusted / 60), minute: adjusted % 60 };
    };

    const startTime = parseTime(windowStart);
    const openReminder = subtractMinutes(startTime.hour, startTime.minute, 30);

    const endTime = parseTime(windowEnd);
    const closeReminder = subtractMinutes(endTime.hour, endTime.minute, 30);

    const openId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'PepMax — Fast Ending Soon',
        body: 'Your eating window opens in 30 minutes.',
        sound: true,
        data: { screen: 'fasting-timer' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour: openReminder.hour,
        minute: openReminder.minute,
        repeats: true,
      },
    });

    await AsyncStorage.setItem(FASTING_OPEN_ID_KEY, openId);

    const closeId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'PepMax — Eating Window Closing Soon',
        body: 'Your eating window closes in 30 minutes.',
        sound: true,
        data: { screen: 'fasting-timer' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour: closeReminder.hour,
        minute: closeReminder.minute,
        repeats: true,
      },
    });

    await AsyncStorage.setItem(FASTING_CLOSE_ID_KEY, closeId);
  } catch {
    // Best-effort — scheduling failure should not block config save
  }
}

/** Cancel both fasting window reminders and clear their stored IDs. */
export async function cancelFastingReminders(): Promise<void> {
  try {
    const openId = await AsyncStorage.getItem(FASTING_OPEN_ID_KEY);
    if (openId) {
      await Notifications.cancelScheduledNotificationAsync(openId).catch(() => {});
      await AsyncStorage.removeItem(FASTING_OPEN_ID_KEY);
    }
    const closeId = await AsyncStorage.getItem(FASTING_CLOSE_ID_KEY);
    if (closeId) {
      await Notifications.cancelScheduledNotificationAsync(closeId).catch(() => {});
      await AsyncStorage.removeItem(FASTING_CLOSE_ID_KEY);
    }
  } catch {
    // Non-fatal
  }
}

// ─── Peptide fasting window notifications ────────────────────────────────────
// Key format: pepmax:notif:peptidefasting:{peptideId}
// Does NOT collide with pepmax:notif:fasting:open / pepmax:notif:fasting:close
// which belong to the intermittent-fasting feature.

const PEPTIDE_FASTING_IDS_KEY = 'pepmax:notif:peptidefasting';

async function readPeptideFastingIds(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(PEPTIDE_FASTING_IDS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

async function writePeptideFastingIds(ids: Record<string, string>): Promise<void> {
  try {
    await AsyncStorage.setItem(PEPTIDE_FASTING_IDS_KEY, JSON.stringify(ids));
  } catch {
    // Non-fatal
  }
}

/**
 * Schedule a one-shot notification that fires when the post-injection fasting
 * window ends for a given peptide.
 *
 * Cancels any existing notification for the same peptide before scheduling.
 * No-ops silently on failure — food logging must not be blocked.
 *
 * @param peptideId  Unique peptide document ID
 * @param peptideName  Human-readable name for the notification body
 * @param secondsUntilOpen  Seconds from now until the eating window opens
 */
export async function schedulePeptideFastingWindowNotification(
  peptideId: string,
  peptideName: string,
  secondsUntilOpen: number,
): Promise<void> {
  // Guard against non-positive values — can happen if the window already passed
  if (secondsUntilOpen <= 0) return;

  try {
    const ids = await readPeptideFastingIds();
    if (ids[peptideId]) {
      await Notifications.cancelScheduledNotificationAsync(ids[peptideId]).catch(() => {});
    }

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'PepMax — Eating Window Open',
        body: `Your ${peptideName.slice(0, 64)} fasting window has ended. You can eat now.`,
        sound: true,
        data: { screen: 'peptides' },
      },
      trigger: {
        seconds: Math.round(secondsUntilOpen),
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      },
    });

    ids[peptideId] = id;
    await writePeptideFastingIds(ids);
  } catch {
    // Silently swallow — reminder scheduling is best-effort
  }
}

/** Cancel the eating-window notification for a single peptide. */
export async function cancelPeptideFastingWindowNotification(peptideId: string): Promise<void> {
  try {
    const ids = await readPeptideFastingIds();
    if (ids[peptideId]) {
      await Notifications.cancelScheduledNotificationAsync(ids[peptideId]).catch(() => {});
      delete ids[peptideId];
      await writePeptideFastingIds(ids);
    }
  } catch {
    // Non-fatal
  }
}

/** Cancel ALL peptide-fasting eating-window notifications. */
export async function cancelAllPeptideFastingWindowNotifications(): Promise<void> {
  try {
    const ids = await readPeptideFastingIds();
    await Promise.all(
      Object.values(ids).map((id) =>
        Notifications.cancelScheduledNotificationAsync(id).catch(() => {}),
      ),
    );
    await AsyncStorage.removeItem(PEPTIDE_FASTING_IDS_KEY);
  } catch {
    // Non-fatal
  }
}

/** Cancel ALL dose reminders (e.g. when user disables the global toggle). */
export async function cancelAllDoseReminders(): Promise<void> {
  try {
    const ids = await readDoseIds();
    await Promise.all(
      Object.values(ids).map((id) =>
        Notifications.cancelScheduledNotificationAsync(id).catch(() => {}),
      ),
    );
    await AsyncStorage.removeItem(DOSE_IDS_KEY);
  } catch {
    // Non-fatal
  }
}
