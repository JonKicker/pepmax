/**
 * sendBeaconSms — Cloud Function (onCall v2).
 *
 * Sends SMS to a user's safety contacts when a beacon session starts or ends.
 *
 * Required environment config (set via Firebase Functions secrets):
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_PHONE_NUMBER   (E.164 Twilio sender number)
 *   APP_BASE_URL          (e.g. https://pepmax.app)
 *
 * Input: { shareToken: string, type: 'start' | 'complete' }
 */
import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';

const twilioSid = defineSecret('TWILIO_ACCOUNT_SID');
const twilioToken = defineSecret('TWILIO_AUTH_TOKEN');
const twilioFrom = defineSecret('TWILIO_PHONE_NUMBER');
const appBaseUrl = defineSecret('APP_BASE_URL');

interface SendBeaconSmsInput {
  shareToken: string;
  type: 'start' | 'complete';
}

interface SendBeaconSmsResult {
  success: boolean;
  sentCount: number;
}

export const sendBeaconSms = onCall<SendBeaconSmsInput, Promise<SendBeaconSmsResult>>(
  {
    secrets: [twilioSid, twilioToken, twilioFrom, appBaseUrl],
    region: 'us-central1',
  },
  async (request) => {
    // Require authenticated caller
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be signed in.');
    }

    const { shareToken, type } = request.data;
    if (!shareToken || !type) {
      throw new HttpsError('invalid-argument', 'shareToken and type are required.');
    }

    // Read the beacon doc
    const beaconRef = admin.firestore().doc(`activeBeacons/${shareToken}`);
    const beaconSnap = await beaconRef.get();

    if (!beaconSnap.exists) {
      throw new HttpsError('not-found', 'Beacon not found.');
    }

    const beacon = beaconSnap.data()!;

    // Verify caller owns this beacon
    if (beacon.uid !== request.auth.uid) {
      throw new HttpsError('permission-denied', 'Not your beacon.');
    }

    const contactPhones: string[] = beacon.contactPhones ?? [];
    if (contactPhones.length === 0) {
      return { success: true, sentCount: 0 };
    }

    // Read contact names for personalized messages
    const contactsSnap = await admin.firestore()
      .collection(`users/${beacon.uid}/safetyContacts`)
      .get();
    const contactNames: Record<string, string> = {};
    contactsSnap.forEach((doc) => {
      const d = doc.data();
      if (d.phone) contactNames[d.phone] = d.name;
    });

    // Build Twilio client
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const twilio = require('twilio');
    const client = twilio(twilioSid.value(), twilioToken.value());
    const fromNumber = twilioFrom.value();
    const baseUrl = appBaseUrl.value() || 'https://pepmax.app';

    const firstName: string = beacon.firstName ?? 'Someone';
    const activityType: string = beacon.activityType ?? 'workout';

    let sentCount = 0;
    const sendPromises = contactPhones.map(async (phone: string) => {
      const contactName = contactNames[phone];
      let body: string;

      if (type === 'start') {
        const greeting = contactName ? `Hi ${contactName}, ` : '';
        body = `${greeting}${firstName} started a ${activityType} and is sharing their live location with you. Track them here: ${baseUrl}/beacon/${shareToken}`;
      } else {
        const greeting = contactName ? `Hi ${contactName}, ` : '';
        const distanceM: number = beacon.distance ?? 0;
        const distanceKm = (distanceM / 1000).toFixed(1);
        const elapsedSec: number = beacon.elapsedActive ?? 0;
        const mins = Math.floor(elapsedSec / 60);
        const secs = String(elapsedSec % 60).padStart(2, '0');
        body = `${greeting}${firstName}'s ${activityType} is complete. Distance: ${distanceKm} km, Duration: ${mins}:${secs}. They're safe! 🏃`;
      }

      try {
        await client.messages.create({ body, from: fromNumber, to: phone });
        sentCount++;
      } catch (err) {
        // Log with masked number — phone numbers are PII
        const masked = phone.slice(0, 3) + '•••' + phone.slice(-4);
        console.error(`[sendBeaconSms] Failed to send to ${masked}:`, err);
      }
    });

    await Promise.all(sendPromises);
    return { success: true, sentCount };
  },
);
