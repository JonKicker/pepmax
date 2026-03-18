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
