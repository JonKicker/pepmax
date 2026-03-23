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
