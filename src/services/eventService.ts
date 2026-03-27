/**
 * eventService — read-only Firestore service for Seasonal Events & Crew PVP.
 *
 * All functions follow the ServiceResult<T> pattern — never throw.
 * Cloud Functions manage all writes; clients only read and join events.
 *
 * Collections:
 *   /events/{eventId}
 *   /users/{uid}/eventProgress/{eventId}
 *   /crewChallenges/{challengeId}
 *   /crewChallengeEntries/{entryId}
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from './firebase/index';
import { addBreadcrumb } from './errorReporting';
import { analytics, AnalyticsEvent } from './analytics';
import type { ServiceResult } from '../types/service';
import type {
  SeasonalEvent,
  UserEventProgress,
  CrewChallenge,
  CrewChallengeEntry,
} from '../types/pvpEvents';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function requireAuth(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('eventService: no authenticated user');
  return uid;
}

// ─── Active Events ────────────────────────────────────────────────────────────

/**
 * Fetches all currently active seasonal events.
 */
export async function getActiveEvents(): Promise<ServiceResult<SeasonalEvent[]>> {
  try {
    addBreadcrumb('eventService', 'getActiveEvents', {});
    const q = query(
      collection(db, 'events'),
      where('status', '==', 'active'),
    );
    const snap = await getDocs(q);
    const events = snap.docs.map(
      (d) => ({ id: d.id, ...d.data() } as SeasonalEvent),
    );

    analytics.track(AnalyticsEvent.EVENT_VIEWED, { count: events.length });

    return { data: events, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── Event Progress ───────────────────────────────────────────────────────────

/**
 * Fetches the authenticated user's progress on a specific event.
 * Returns null data (not an error) if the user hasn't joined.
 */
export async function getEventProgress(
  uid: string,
  eventId: string,
): Promise<ServiceResult<UserEventProgress | null>> {
  try {
    addBreadcrumb('eventService', 'getEventProgress', { eventId });
    const ref = doc(db, 'users', uid, 'eventProgress', eventId);
    const snap = await getDoc(ref);
    return {
      data: snap.exists() ? (snap.data() as UserEventProgress) : null,
      error: null,
    };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── Join Event ───────────────────────────────────────────────────────────────

/**
 * Marks the user as having joined an event.
 * Creates an initial eventProgress document with empty challenge progress.
 * Note: joining is not security-sensitive; the client may write this directly.
 */
export async function joinEvent(
  uid: string,
  eventId: string,
): Promise<ServiceResult<void>> {
  try {
    addBreadcrumb('eventService', 'joinEvent', { eventId });
    const ref = doc(db, 'users', uid, 'eventProgress', eventId);
    // Use a loose Record type so serverTimestamp() (FieldValue) is accepted
    // for joinedAt — Firestore resolves it to a number server-side.
    const progress: Record<string, unknown> = {
      eventId,
      challengeProgress: {},
      completedChallenges: [],
      joinedAt: serverTimestamp(),
      badgeClaimed: false,
    };
    await setDoc(ref, progress, { merge: false });

    analytics.track(AnalyticsEvent.EVENT_JOINED, { eventId });

    return { data: undefined, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── Crew Challenges ──────────────────────────────────────────────────────────

/**
 * Fetches all active crew challenges.
 */
export async function getCrewChallenges(): Promise<ServiceResult<CrewChallenge[]>> {
  try {
    addBreadcrumb('eventService', 'getCrewChallenges', {});
    const q = query(
      collection(db, 'crewChallenges'),
      where('status', '==', 'active'),
    );
    const snap = await getDocs(q);
    const challenges = snap.docs.map(
      (d) => ({ id: d.id, ...d.data() } as CrewChallenge),
    );

    analytics.track(AnalyticsEvent.CREW_CHALLENGE_VIEWED, {
      count: challenges.length,
    });

    return { data: challenges, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── Crew Challenge Entries ───────────────────────────────────────────────────

/**
 * Fetches all crew entries for a given crew challenge.
 * Results are aggregated by Cloud Functions — read-only here.
 */
export async function getCrewChallengeEntries(
  challengeId: string,
): Promise<ServiceResult<CrewChallengeEntry[]>> {
  try {
    addBreadcrumb('eventService', 'getCrewChallengeEntries', { challengeId });
    const q = query(
      collection(db, 'crewChallengeEntries'),
      where('challengeId', '==', challengeId),
    );
    const snap = await getDocs(q);
    const entries = snap.docs.map(
      (d) => ({ ...d.data() } as CrewChallengeEntry),
    );
    return { data: entries, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}
