/**
 * PremiumContext — RevenueCat subscription state for the entire app.
 *
 * Design notes (for Ray):
 * - configuredRef ensures Purchases.configure() runs exactly once.
 * - Purchases.logIn(uid) is called when the Firebase user changes.
 * - Subscription status is checked on mount and every time the app returns
 *   to the foreground (AppState 'active').
 * - On network failure, falls back to AsyncStorage cached premium status.
 * - purchasePackage() and restorePurchases() update state and cache.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AppState, Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  PurchasesPackage,
  CustomerInfo,
  PURCHASES_ERROR_CODE,
} from 'react-native-purchases';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import {
  logSubscription,
  buildSubscriptionRecord,
} from '../services/subscriptionService';
import type { PremiumState, SubscriptionPlan } from '../types/subscription';

// ─── Constants ────────────────────────────────────────────────────────────────

const APPLE_KEY = process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY ?? '';
const GOOGLE_KEY = process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY ?? '';
const CACHE_KEY = '@pepmax_premium_status';
const ENTITLEMENT_ID = 'premium';

type CachedStatus = {
  isPremium: boolean;
  plan: SubscriptionPlan | null;
  expirationDate: string | null;
  checkedAt: number;
};

// ─── Context ──────────────────────────────────────────────────────────────────

const PremiumContext = createContext<PremiumState | undefined>(undefined);

export function PremiumProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [expirationDate, setExpirationDate] = useState<string | null>(null);

  const configuredRef = useRef(false);
  const identifiedUidRef = useRef<string | null>(null);

  // ─── Configure SDK (once) ───────────────────────────────────────────────────

  useEffect(() => {
    if (configuredRef.current) return;
    const apiKey = Platform.OS === 'ios' ? APPLE_KEY : GOOGLE_KEY;
    if (!apiKey || apiKey === 'appl_xxxxx' || apiKey === 'goog_xxxxx') {
      // Placeholder keys — skip configuration (dev without RevenueCat setup)
      console.log('[PremiumContext] Skipping RevenueCat — no valid API key');
      setLoading(false);
      return;
    }

    if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    Purchases.configure({ apiKey });
    configuredRef.current = true;
  }, []);

  // ─── Identify user ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!configuredRef.current) return;
    if (!currentUser?.uid) return;
    if (identifiedUidRef.current === currentUser.uid) return;

    identifiedUidRef.current = currentUser.uid;
    Purchases.logIn(currentUser.uid).catch((err) => {
      console.warn('[PremiumContext] logIn failed:', err);
    });
  }, [currentUser?.uid]);

  // ─── Cache helpers ──────────────────────────────────────────────────────────

  const cacheStatus = useCallback(async (status: CachedStatus) => {
    try {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(status));
    } catch {
      // non-critical
    }
  }, []);

  const loadCachedStatus = useCallback(async (): Promise<CachedStatus | null> => {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  // ─── Check subscription ─────────────────────────────────────────────────────

  const applyCustomerInfo = useCallback(
    (info: CustomerInfo) => {
      const premiumEntitlement = info.entitlements.active[ENTITLEMENT_ID];
      const active = premiumEntitlement !== undefined;
      const detectedPlan: SubscriptionPlan | null = premiumEntitlement
        ? premiumEntitlement.productIdentifier.includes('annual')
          ? 'annual'
          : 'monthly'
        : null;
      const expDate = premiumEntitlement?.expirationDate ?? null;

      setIsPremium(active);
      setPlan(detectedPlan);
      setExpirationDate(expDate);

      cacheStatus({
        isPremium: active,
        plan: detectedPlan,
        expirationDate: expDate,
        checkedAt: Date.now(),
      });
    },
    [cacheStatus]
  );

  const checkSubscription = useCallback(async () => {
    if (!configuredRef.current) {
      setLoading(false);
      return;
    }

    try {
      const info = await Purchases.getCustomerInfo();
      applyCustomerInfo(info);
    } catch {
      // Offline or error — fall back to cache
      const cached = await loadCachedStatus();
      if (cached) {
        setIsPremium(cached.isPremium);
        setPlan(cached.plan);
        setExpirationDate(cached.expirationDate);
      }
    } finally {
      setLoading(false);
    }
  }, [applyCustomerInfo, loadCachedStatus]);

  // ─── Check on mount + foreground ────────────────────────────────────────────

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkSubscription();
    });
    return () => subscription.remove();
  }, [checkSubscription]);

  // ─── Purchase ───────────────────────────────────────────────────────────────

  const purchasePackage = useCallback(
    async (pkg: PurchasesPackage): Promise<boolean> => {
      try {
        const { customerInfo } = await Purchases.purchasePackage(pkg);
        applyCustomerInfo(customerInfo);

        // Log to Firestore
        const premiumEnt = customerInfo.entitlements.active[ENTITLEMENT_ID];
        if (premiumEnt) {
          const detectedPlan: SubscriptionPlan =
            premiumEnt.productIdentifier.includes('annual') ? 'annual' : 'monthly';
          const record = buildSubscriptionRecord(
            detectedPlan,
            premiumEnt.productIdentifier,
            premiumEnt.expirationDate
          );
          logSubscription(record).catch((err) =>
            console.warn('[PremiumContext] logSubscription failed:', err)
          );
        }

        return true;
      } catch (err: any) {
        // User cancelled — not an error
        if (err?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
          return false;
        }
        throw err;
      }
    },
    [applyCustomerInfo]
  );

  // ─── Restore ────────────────────────────────────────────────────────────────

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    try {
      const info = await Purchases.restorePurchases();
      applyCustomerInfo(info);
      return info.entitlements.active[ENTITLEMENT_ID] !== undefined;
    } catch {
      return false;
    }
  }, [applyCustomerInfo]);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <PremiumContext.Provider
      value={{
        isPremium,
        loading,
        plan,
        expirationDate,
        checkSubscription,
        purchasePackage,
        restorePurchases,
      }}
    >
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium(): PremiumState {
  const ctx = useContext(PremiumContext);
  if (ctx === undefined) {
    throw new Error('usePremium must be used within a PremiumProvider');
  }
  return ctx;
}
