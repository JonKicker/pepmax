/** Subscription types for RevenueCat integration. */

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
  loading: boolean;
  plan: SubscriptionPlan | null;
  expirationDate: string | null;
  checkSubscription: () => Promise<void>;
  purchasePackage: (pkg: any) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
};
