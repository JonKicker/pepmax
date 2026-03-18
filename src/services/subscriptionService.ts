/**
 * Subscription service — logs subscription events to Firestore.
 *
 * Writes to: users/{uid}/subscription/current
 */
import { Platform } from 'react-native';
import { mergeDocument, COLLECTIONS } from './firebase/firestore';
import type { SubscriptionRecord, SubscriptionPlan } from '../types/subscription';
import type { ServiceResult } from '../types/service';

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
