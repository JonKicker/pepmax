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
