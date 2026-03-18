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
  PACKAGE_TYPE,
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
      if (__DEV__) console.log('[PremiumContext] Skipping RevenueCat — no valid API key');
      setLoading(false);
      return;
    }

    if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    Purchases.configure({ apiKey });
    configuredRef.current = true;
  }, []);

  // ─── Identify / de-identify user ───────────────────────────────────────────

  useEffect(() => {
    if (!currentUser?.uid) {
      // User signed out — always clear local state + cache regardless of SDK config
      if (identifiedUidRef.current !== null) {
        identifiedUidRef.current = null;
        setIsPremium(false);
        setPlan(null);
        setExpirationDate(null);
        AsyncStorage.removeItem(CACHE_KEY).catch(() => {});
        // Only call SDK logOut if RevenueCat was configured
        if (configuredRef.current) {
          Purchases.logOut().catch((err) => {
            console.warn('[PremiumContext] logOut failed:', err);
          });
        }
      }
      return;
    }

    if (!configuredRef.current) return;
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

  const detectPlan = useCallback(
    (pkg: PurchasesPackage | null, productId: string): SubscriptionPlan => {
      // Prefer the explicit PackageType from RevenueCat
      if (pkg?.packageType === PACKAGE_TYPE.ANNUAL) return 'annual';
      if (pkg?.packageType === PACKAGE_TYPE.MONTHLY) return 'monthly';
      // Fallback: inspect product identifier string
      const lower = productId.toLowerCase();
      if (lower.includes('annual') || lower.includes('yearly') || lower.includes('year')) return 'annual';
      return 'monthly';
    },
    []
  );

  const applyCustomerInfo = useCallback(
    (info: CustomerInfo, purchasedPkg?: PurchasesPackage) => {
      const premiumEntitlement = info.entitlements.active[ENTITLEMENT_ID];
      const active = premiumEntitlement !== undefined;
      const detectedPlan: SubscriptionPlan | null = premiumEntitlement
        ? detectPlan(purchasedPkg ?? null, premiumEntitlement.productIdentifier)
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
    [cacheStatus, detectPlan]
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
        applyCustomerInfo(customerInfo, pkg);

        // Log to Firestore
        const premiumEnt = customerInfo.entitlements.active[ENTITLEMENT_ID];
        if (premiumEnt) {
          const detectedPlan: SubscriptionPlan = detectPlan(pkg, premiumEnt.productIdentifier);
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
    [applyCustomerInfo, detectPlan]
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
