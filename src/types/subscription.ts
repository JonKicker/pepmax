/** Subscription types for RevenueCat integration. */
import type { PurchasesPackage } from 'react-native-purchases';

export type SubscriptionPlan = 'monthly' | 'annual';

export type SubscriptionStatus = 'active' | 'expired' | 'trial' | 'none';

export type SubscriptionRecord = {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  purchaseDate: string;
  expirationDate: string;
  source: 'apple' | 'google';
  productId: string;
};

export type PremiumState = {
  isPremium: boolean;
  isTrial: boolean;
  loading: boolean;
  plan: SubscriptionPlan | null;
  expirationDate: string | null;
  checkSubscription: () => Promise<void>;
  purchasePackage: (pkg: PurchasesPackage) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  startTrial: () => Promise<void>;
};
