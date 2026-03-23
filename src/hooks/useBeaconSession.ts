/**
 * useBeaconSession — session-scoped beacon lifecycle.
 *
 * activate()        — creates the Firestore doc + triggers SMS
 * updateLocation()  — throttled to 15s; piggybacked on existing GPS route changes
 * deactivate()      — marks beacon inactive; optionally triggers completion SMS
 */
import { useState, useRef, useCallback } from 'react';
import {
  createActiveBeacon,
  updateBeaconLocation,
  deactivateBeacon,
  triggerBeaconSms,
} from '../services/beaconService';
import { analytics, AnalyticsEvent } from '../services/analytics';
import { Timestamp } from 'firebase/firestore';
import type { ActivityType } from '../types/cardio';
import type { SafetyContact } from '../types/beacon';

const BEACON_UPDATE_INTERVAL_MS = 15_000;

export function useBeaconSession() {
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const lastUpdateRef = useRef<number>(0);
  const tokenRef = useRef<string | null>(null); // stable ref for callbacks

  const activate = useCallback(async (
    firstName: string,
    activityType: ActivityType,
    contacts: SafetyContact[],
  ): Promise<void> => {
    try {
      const token = crypto.randomUUID();
      const result = await createActiveBeacon({
        shareToken: token,
        firstName,
        activityType,
        active: true,
        startedAt: Timestamp.now(),
        endedAt: null,
        lastLocation: null,
        distance: 0,
        elapsedActive: 0,
        contactPhones: contacts.map((c) => c.phone),
      });

      if (result.error) {
        console.warn('[useBeaconSession] Failed to create beacon:', result.error);
        return;
      }

      setShareToken(token);
      tokenRef.current = token;
      setIsActive(true);
      analytics.track(AnalyticsEvent.BEACON_ACTIVATED, { activityType, contacts: contacts.length });

      // Fire-and-forget SMS — non-critical
      triggerBeaconSms(token).catch(() => {});
    } catch (e) {
      console.warn('[useBeaconSession] activate error:', e);
    }
  }, []);

  const updateLocation = useCallback((
    latitude: number,
    longitude: number,
    timestamp: number,
    distance: number,
    elapsedActive: number,
  ): void => {
    const token = tokenRef.current;
    if (!token) return;

    const now = Date.now();
    if (now - lastUpdateRef.current < BEACON_UPDATE_INTERVAL_MS) return;
    lastUpdateRef.current = now;

    // Fire-and-forget location update
    updateBeaconLocation(token, latitude, longitude, timestamp, distance, elapsedActive)
      .catch(() => {});
  }, []);

  const deactivate = useCallback(async (): Promise<void> => {
    const token = tokenRef.current;
    if (!token) return;

    await deactivateBeacon(token).catch(() => {});
    analytics.track(AnalyticsEvent.BEACON_DEACTIVATED);

    setIsActive(false);
    setShareToken(null);
    tokenRef.current = null;
    lastUpdateRef.current = 0;
  }, []);

  return { shareToken, isActive, activate, updateLocation, deactivate };
}
