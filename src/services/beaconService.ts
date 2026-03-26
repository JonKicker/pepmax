/**
 * Beacon service — CRUD for safety contacts and active beacons.
 *
 * Safety contacts are user-scoped: users/{uid}/safetyContacts/{id}
 * Active beacons are top-level:    activeBeacons/{shareToken}
 *   (token IS the doc ID — O(1) lookup by Cloud Function, no query needed)
 *
 * All functions return ServiceResult<T> and never throw.
 */
import {
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, auth, functions } from './firebase/index';
import {
  addDocument,
  queryDocuments,
  deleteDocument,
  COLLECTIONS,
} from './firebase/firestore';
import { addBreadcrumb } from './errorReporting';
import type { ServiceResult } from '../types/service';
import type { SafetyContact, SafetyContactInput, ActiveBeacon, ActiveBeaconInput } from '../types/beacon';

// ─── Safety Contacts ─────────────────────────────────────────────────────────

export async function getSafetyContacts(): Promise<ServiceResult<SafetyContact[]>> {
  return queryDocuments<SafetyContact>(COLLECTIONS.SAFETY_CONTACTS);
}

export async function addSafetyContact(
  input: SafetyContactInput,
): Promise<ServiceResult<string>> {
  addBreadcrumb('beacon', 'addSafetyContact');
  return addDocument<SafetyContactInput>(COLLECTIONS.SAFETY_CONTACTS, input);
}

export async function deleteSafetyContact(id: string): Promise<ServiceResult<void>> {
  addBreadcrumb('beacon', 'deleteSafetyContact');
  return deleteDocument(COLLECTIONS.SAFETY_CONTACTS, id);
}

// ─── Active Beacon ────────────────────────────────────────────────────────────

/**
 * Create a new activeBeacon document.
 * Top-level collection — uses direct Firestore SDK (not user-scoped helpers).
 * The shareToken IS the document ID.
 */
export async function createActiveBeacon(
  input: ActiveBeaconInput,
): Promise<ServiceResult<string>> {
  try {
    // uid is always sourced from the authenticated user — never from the caller
    const uid = auth.currentUser?.uid;
    if (!uid) return { data: null, error: new Error('Not authenticated') };
    addBreadcrumb('beacon', 'createActiveBeacon', { token: input.shareToken });
    const ref = doc(db, 'activeBeacons', input.shareToken);
    await setDoc(ref, {
      ...input,
      uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { data: input.shareToken, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

/**
 * Update lastLocation, distance, and elapsedActive on an active beacon.
 * Called every 15s (throttled by useBeaconSession).
 */
export async function updateBeaconLocation(
  shareToken: string,
  latitude: number,
  longitude: number,
  timestamp: number,
  distance: number,
  elapsedActive: number,
): Promise<ServiceResult<void>> {
  try {
    addBreadcrumb('beacon', 'updateBeaconLocation', { token: shareToken });
    const ref = doc(db, 'activeBeacons', shareToken);
    await updateDoc(ref, {
      lastLocation: { latitude, longitude, timestamp },
      distance,
      elapsedActive,
      updatedAt: serverTimestamp(),
    });
    return { data: undefined, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

/**
 * Mark a beacon as inactive (workout ended).
 */
export async function deactivateBeacon(shareToken: string): Promise<ServiceResult<void>> {
  try {
    addBreadcrumb('beacon', 'deactivateBeacon', { token: shareToken });
    const ref = doc(db, 'activeBeacons', shareToken);
    await updateDoc(ref, {
      active: false,
      endedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { data: undefined, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── Cloud Function callables ─────────────────────────────────────────────────

/**
 * Trigger the sendBeaconSms Cloud Function.
 * Fire-and-forget — SMS delivery is non-critical to the session flow.
 */
export async function triggerBeaconSms(shareToken: string): Promise<void> {
  try {
    addBreadcrumb('beacon', 'triggerBeaconSms', { token: shareToken });
    const fn = httpsCallable(functions, 'sendBeaconSms');
    await fn({ shareToken, type: 'start' });
  } catch (e) {
    // Non-fatal — SMS failure should not interrupt the workout
    console.warn('[beaconService] SMS trigger failed:', e);
  }
}

// Re-export the type for consumers
export type { SafetyContact, ActiveBeacon };
