/**
 * Subscription service — logs subscription events to Firestore.
 *
 * Writes to: users/{uid}/subscription/current
 */
import { Platform } from 'react-native';
import { mergeDocument, getDocument, setDocument, COLLECTIONS } from './firebase/firestore';
import type { SubscriptionRecord, SubscriptionPlan } from '../types/subscription';
import type { ServiceResult } from '../types/service';

type TrialRecord = {
  startedAt: string;
  expiresAt: string;
};

/**
 * Write a 7-day dev trial to Firestore.
 */
export async function startDevTrial(): Promise<ServiceResult<void>> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return setDocument<TrialRecord>(COLLECTIONS.SUBSCRIPTION, 'trial', {
    startedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  });
}

/**
 * Read the dev trial document from Firestore.
 */
export async function getDevTrial(): Promise<ServiceResult<TrialRecord | null>> {
  return getDocument<TrialRecord>(COLLECTIONS.SUBSCRIPTION, 'trial');
}

/**
 * Persist a subscription record after a successful purchase or restore.
 */
export async function logSubscription(
  record: SubscriptionRecord
): Promise<ServiceResult<void>> {
  return mergeDocument(COLLECTIONS.SUBSCRIPTION, 'current', record as any);
}

/**
 * Build a SubscriptionRecord from a RevenueCat CustomerInfo after purchase.
 */
export function buildSubscriptionRecord(
  plan: SubscriptionPlan,
  productId: string,
  expirationDate: string | null
): SubscriptionRecord {
  return {
    plan,
    status: 'active',
    purchaseDate: new Date().toISOString(),
    expirationDate: expirationDate ?? '',
    source: Platform.OS === 'ios' ? 'apple' : 'google',
    productId,
  };
}
