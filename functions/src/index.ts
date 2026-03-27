/**
 * PepMax Cloud Functions — entry point.
 * Initialize Firebase Admin once here. Export all functions.
 */
import * as admin from 'firebase-admin';

admin.initializeApp();

export { onReviewWrite } from './onReviewWrite';
export { onReportCreate } from './onReportCreate';
export { sendBeaconSms } from './sendBeaconSms';
export { beaconTrackingPage } from './beaconTrackingPage';
export { cleanupBeacons } from './cleanupBeacons';

// ─── PVP Phase 1C: Seasons, Leagues, RP ──────────────────────────────────────
export { assignWeeklyLeagues } from './assignWeeklyLeagues';
export { claimSeasonReward } from './claimSeasonReward';
// Note: updateRP is internal only — NOT exported as a callable endpoint
