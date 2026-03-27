/**
 * waterService — phone-side hydration tracking.
 *
 * Design decisions:
 * - totalOz is maintained by Firestore via FieldValue.increment() to avoid
 *   race conditions when phone and watch log simultaneously.
 * - entries[] is append-only via arrayUnion(); undo uses arrayRemove().
 * - Undo decrements totalOz by the last entry's oz via increment(-oz).
 * - All writes guard against the 300oz daily cap (client side; Firestore
 *   rules enforce the same limit server-side).
 */
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove,
  Timestamp,
} from 'firebase/firestore';
import { db, auth } from './firebase/index';
import { COLLECTIONS } from './firebase/firestore';
import { addBreadcrumb } from './errorReporting';
import { analytics, AnalyticsEvent } from './analytics';
import { awardXP } from './gamificationService';
import type { ServiceResult } from '../types/service';
import type { WaterLogDoc, WaterEntry } from '../types/water';
import {
  DEFAULT_WATER_GOAL_OZ,
  MAX_SINGLE_LOG_OZ,
  MAX_DAILY_OZ,
} from '../types/water';
import { toLocalDateKey } from '../utils/nutrition';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function requireAuth(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');
  return uid;
}

function waterDocRef(uid: string, dateKey: string) {
  return doc(db, 'users', uid, COLLECTIONS.WATER_LOG, dateKey);
}

// ─── getTodayWaterLog ─────────────────────────────────────────────────────────

/**
 * Fetch today's water log document. Returns zeros when no doc exists yet.
 * Never throws — returns ServiceResult.
 */
export async function getTodayWaterLog(): Promise<ServiceResult<WaterLogDoc>> {
  try {
    const uid = requireAuth();
    const dateKey = toLocalDateKey(new Date());

    addBreadcrumb('waterService', 'getTodayWaterLog', { dateKey });

    const ref = waterDocRef(uid, dateKey);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      const empty: WaterLogDoc = {
        totalOz: 0,
        goalOz: DEFAULT_WATER_GOAL_OZ,
        entries: [],
        lastLoggedAt: Timestamp.now(),
        source: 'phone',
        updatedAt: Timestamp.now(),
      };
      return { data: empty, error: null };
    }

    return { data: snap.data() as WaterLogDoc, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── logWater ────────────────────────────────────────────────────────────────

/**
 * Log a drink of water for today.
 *
 * Uses FieldValue.increment() for totalOz (race-condition safe) and
 * arrayUnion() to append to entries[].
 *
 * Client-side guards:
 *  - oz must be 1–128 (MAX_SINGLE_LOG_OZ)
 *  - totalOz after increment must not exceed 300 (MAX_DAILY_OZ)
 *
 * XP: 10 points if this log pushes totalOz from below-goal to at/above-goal.
 * Deduped via the "was below goal before, now at/above" check.
 */
export async function logWater(
  oz: number,
  currentTotalOz: number,
  goalOz: number = DEFAULT_WATER_GOAL_OZ
): Promise<ServiceResult<void>> {
  try {
    // ── Client-side validation ────────────────────────────────────────────────
    if (oz <= 0 || oz > MAX_SINGLE_LOG_OZ) {
      return {
        data: null,
        error: new Error(`Water log must be between 1 and ${MAX_SINGLE_LOG_OZ} oz`),
      };
    }

    if (currentTotalOz >= MAX_DAILY_OZ) {
      return {
        data: null,
        error: new Error(`Daily cap of ${MAX_DAILY_OZ} oz already reached`),
      };
    }

    // Clamp so we don't exceed the daily cap
    const allowedOz = Math.min(oz, MAX_DAILY_OZ - currentTotalOz);

    const uid = requireAuth();
    const dateKey = toLocalDateKey(new Date());
    const now = Timestamp.now();

    const entry: WaterEntry = {
      oz: allowedOz,
      loggedAt: now,
      source: 'phone',
    };

    addBreadcrumb('waterService', 'logWater', { oz: allowedOz, dateKey });

    const ref = waterDocRef(uid, dateKey);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      // First log of the day — create doc with known values
      await setDoc(ref, {
        totalOz: allowedOz,
        goalOz,
        entries: [entry],
        lastLoggedAt: now,
        source: 'phone',
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        totalOz: increment(allowedOz),
        entries: arrayUnion(entry),
        lastLoggedAt: now,
        source: 'phone',
        updatedAt: serverTimestamp(),
      });
    }

    // ── Analytics ─────────────────────────────────────────────────────────────
    analytics.track(AnalyticsEvent.WATER_LOGGED, {
      oz: allowedOz,
      date_key: dateKey,
    });

    // ── XP: award 10 pts when crossing the goal threshold ─────────────────────
    const wasBelow = currentTotalOz < goalOz;
    const isNowAtOrAbove = currentTotalOz + allowedOz >= goalOz;
    if (wasBelow && isNowAtOrAbove) {
      awardXP(10, 'water_goal_reached', 'nutrition').catch(() => {});
      analytics.track(AnalyticsEvent.WATER_GOAL_REACHED, { goal_oz: goalOz });
    }

    return { data: undefined, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── undoLastWater ────────────────────────────────────────────────────────────

/**
 * Remove the last entry from today's log and decrement totalOz accordingly.
 *
 * Uses arrayRemove() for the entry and FieldValue.increment(-oz) for the total.
 * Guards against negative totalOz — if the decrement would go below 0, skips.
 */
export async function undoLastWater(
  entries: WaterEntry[],
  currentTotalOz: number
): Promise<ServiceResult<void>> {
  try {
    if (entries.length === 0) {
      return { data: null, error: new Error('No entries to undo') };
    }

    const lastEntry = entries[entries.length - 1];

    // Guard: do not allow totalOz to go negative
    if (currentTotalOz - lastEntry.oz < 0) {
      return {
        data: null,
        error: new Error('Cannot undo: would result in negative total'),
      };
    }

    const uid = requireAuth();
    const dateKey = toLocalDateKey(new Date());

    addBreadcrumb('waterService', 'undoLastWater', {
      oz: lastEntry.oz,
      dateKey,
    });

    const ref = waterDocRef(uid, dateKey);

    await updateDoc(ref, {
      totalOz: increment(-lastEntry.oz),
      entries: arrayRemove(lastEntry),
      updatedAt: serverTimestamp(),
    });

    analytics.track(AnalyticsEvent.WATER_UNDO, { oz: lastEntry.oz });

    return { data: undefined, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── setWaterGoal ─────────────────────────────────────────────────────────────

/**
 * Update today's goalOz field. Also persists to the user's profile via
 * the profile service (caller handles profile update separately to avoid
 * a circular dependency here).
 *
 * Validation: goal must be > 0 and <= MAX_DAILY_OZ.
 */
export async function setWaterGoal(
  goalOz: number
): Promise<ServiceResult<void>> {
  try {
    if (goalOz <= 0 || goalOz > MAX_DAILY_OZ) {
      return {
        data: null,
        error: new Error(`Water goal must be between 1 and ${MAX_DAILY_OZ} oz`),
      };
    }

    const uid = requireAuth();
    const dateKey = toLocalDateKey(new Date());

    addBreadcrumb('waterService', 'setWaterGoal', { goalOz, dateKey });

    const ref = waterDocRef(uid, dateKey);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      await setDoc(ref, {
        totalOz: 0,
        goalOz,
        entries: [],
        lastLoggedAt: Timestamp.now(),
        source: 'phone',
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        goalOz,
        updatedAt: serverTimestamp(),
      });
    }

    analytics.track(AnalyticsEvent.WATER_GOAL_SET, { goal_oz: goalOz });

    return { data: undefined, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}
