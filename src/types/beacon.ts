/**
 * Safety Beacon types.
 *
 * SafetyContact  — stored at users/{uid}/safetyContacts/{id}
 * ActiveBeacon   — stored at top-level activeBeacons/{shareToken}
 *                  (token IS the doc ID — O(1) lookup by Cloud Function)
 */
import type { Timestamp } from 'firebase/firestore';
import type { ActivityType } from './cardio';

// ─── Safety Contacts ─────────────────────────────────────────────────────────

export type SafetyContact = {
  id: string;
  name: string;
  phone: string;       // E.164 format, e.g. "+15551234567"
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type SafetyContactInput = Omit<SafetyContact, 'id' | 'createdAt' | 'updatedAt'>;

// ─── Active Beacon ────────────────────────────────────────────────────────────

export type BeaconLocation = {
  latitude: number;
  longitude: number;
  timestamp: number;   // ms since epoch
};

export type ActiveBeacon = {
  shareToken: string;
  uid: string;
  firstName: string;           // Only first name — no full profile leak
  activityType: ActivityType;
  active: boolean;
  startedAt: Timestamp;
  endedAt: Timestamp | null;
  lastLocation: BeaconLocation | null;
  distance: number;            // meters
  elapsedActive: number;       // seconds
  contactPhones: string[];     // Denormalized — Cloud Function reads this to send SMS
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

// uid is always set by the service (auth.currentUser.uid) — never passed by callers
export type ActiveBeaconInput = Omit<ActiveBeacon, 'uid' | 'createdAt' | 'updatedAt'>;
