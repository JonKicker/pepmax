/**
 * cleanupBeacons — scheduled Cloud Function.
 *
 * Runs daily to delete expired activeBeacon documents.
 * A beacon is expired when: active === false AND endedAt is > 24h ago.
 */
import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';

const EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export const cleanupBeacons = onSchedule(
  {
    schedule: 'every 24 hours',
    region: 'us-central1',
  },
  async () => {
    const db = admin.firestore();
    const cutoff = admin.firestore.Timestamp.fromMillis(Date.now() - EXPIRY_MS);

    const snap = await db
      .collection('activeBeacons')
      .where('active', '==', false)
      .where('endedAt', '<', cutoff)
      .get();

    if (snap.empty) {
      console.log('[cleanupBeacons] No expired beacons found.');
      return;
    }

    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    console.log(`[cleanupBeacons] Deleted ${snap.size} expired beacon(s).`);
  },
);
