/**
 * Paywall — full-screen modal for subscription purchase.
 *
 * Accessible from any tab via router.push('/paywall').
 * Registered in app/_layout.tsx with presentation: 'modal'.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Purchases, { PACKAGE_TYPE, type PurchasesPackage } from 'react-native-purchases';
import { useTheme } from '../src/hooks/useTheme';
import { Colors } from '../src/constants/theme';
import { usePremium } from '../src/contexts/PremiumContext';
import { analytics, AnalyticsEvent } from '../src/services/analytics';

// ─── Legal URLs ───────────────────────────────────────────────────────────────
// TODO: Replace with production URLs before App Store / Play Store submission
const TERMS_URL = 'https://pepmax.app/terms';
const PRIVACY_URL = 'https://pepmax.app/privacy';

// ─── Feature list ─────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: 'sparkles' as const, label: 'AI-Powered Weekly Insights', sub: 'personalized analysis of your progress' },
  { icon: 'images' as const, label: 'Unlimited Progress Photos', sub: 'store and compare unlimited photos' },
  { icon: 'stats-chart' as const, label: 'Advanced Charts & Analytics', sub: 'deep dive into your trends' },
  { icon: 'barbell' as const, label: 'Custom Workout Templates', sub: 'create unlimited workout plans' },
  { icon: 'headset' as const, label: 'Priority Support', sub: 'get help when you need it' },
  { icon: 'download' as const, label: 'Export Your Data', sub: 'download all your tracking data as CSV' },
  { icon: 'phone-portrait' as const, label: 'Home Screen Widget', sub: 'coming soon', badge: 'SOON' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function PaywallScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { purchasePackage, restorePurchases } = usePremium();

  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual');
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [monthlyPrice, setMonthlyPrice] = useState<string | null>(null);
  const [annualPrice, setAnnualPrice] = useState<string | null>(null);
  const [offeringsLoading, setOfferingsLoading] = useState(true);
  const [annualPkg, setAnnualPkg] = useState<PurchasesPackage | null>(null);
  const [monthlyPkg, setMonthlyPkg] = useState<PurchasesPackage | null>(null);

  // Track paywall view on mount
  useEffect(() => {
    analytics.track(AnalyticsEvent.PAYWALL_VIEWED);
  }, []);

  // Fetch live pricing once on mount — packages cached in state for purchase flow.
  useEffect(() => {
    Purchases.getOfferings()
      .then((offerings) => {
        const packages = offerings.current?.availablePackages ?? [];
        const annual = packages.find((p) => p.packageType === PACKAGE_TYPE.ANNUAL) ?? null;
        const monthly = packages.find((p) => p.packageType === PACKAGE_TYPE.MONTHLY) ?? null;
        setAnnualPkg(annual);
        setMonthlyPkg(monthly);
        if (monthly) setMonthlyPrice(monthly.product.priceString);
        if (annual) setAnnualPrice(annual.product.priceString);
      })
      .catch(() => {})
      .finally(() => setOfferingsLoading(false));
  }, []);

  // Derived: does the selected plan have a free trial?
  const hasTrial = selectedPlan === 'annual'
    ? !!annualPkg?.product?.introPrice
    : !!monthlyPkg?.product?.introPrice;

  // Staggered feature animations
  const featureAnims = useRef(FEATURES.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const animations = featureAnims.map((anim, i) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 350,
        delay: 200 + i * 80,
        useNativeDriver: true,
      })
    );
    Animated.stagger(80, animations).start();
  }, []);

  // ─── Purchase ───────────────────────────────────────────────────────────────

  const handlePurchase = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPurchasing(true);

    try {
      // Use cached packages — no extra network call on purchase tap.
      const pkg = selectedPlan === 'annual' ? annualPkg : monthlyPkg;

      if (!pkg) {
        Alert.alert('Unavailable', 'This plan is not available right now. Please try again later.');
        setPurchasing(false);
        return;
      }

      const success = await purchasePackage(pkg);
      if (success) {
        analytics.track(AnalyticsEvent.SUBSCRIPTION_STARTED, { plan: selectedPlan });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
        Alert.alert('Welcome to Premium!', 'You now have full access to all PepMax features.');
      }
    } catch (err: any) {
      Alert.alert('Purchase Failed', err?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  // ─── Restore ────────────────────────────────────────────────────────────────

  const handleRestore = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRestoring(true);

    try {
      const restored = await restorePurchases();
      if (restored) {
        analytics.track(AnalyticsEvent.SUBSCRIPTION_RESTORED);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
        Alert.alert('Restored!', 'Your premium subscription has been restored.');
      } else {
        Alert.alert(
          'No Subscription Found',
          'We could not find an active subscription for your account. If you believe this is an error, contact support.'
        );
      }
    } catch {
      Alert.alert('Error', 'Could not restore purchases. Please try again.');
    } finally {
      setRestoring(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Close button — disabled during active purchase to prevent mid-transaction navigation */}
      <TouchableOpacity
        style={[styles.closeBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => router.back()}
        activeOpacity={0.7}
        disabled={purchasing}
      >
        <Ionicons name="close" size={22} color={colors.textPrimary} />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconCircle, { backgroundColor: Colors.gold + '20' }]}>
            <Ionicons name="fitness" size={40} color={Colors.gold} />
          </View>
          <Text style={[styles.headline, { color: colors.textPrimary }]}>
            Unlock Your Full Potential
          </Text>
          <Text style={[styles.subheadline, { color: colors.textSecondary }]}>
            Get personalized AI insights, unlimited tracking, and premium features
          </Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          {FEATURES.map((f, i) => (
            <Animated.View
              key={f.label}
              style={[
                styles.featureRow,
                {
                  opacity: featureAnims[i],
                  transform: [
                    {
                      translateY: featureAnims[i].interpolate({
                        inputRange: [0, 1],
                        outputRange: [12, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={[styles.featureIcon, { backgroundColor: Colors.accent + '18' }]}>
                <Ionicons name={f.icon} size={18} color={Colors.accent} />
              </View>
              <View style={styles.featureText}>
                <View style={styles.featureLabelRow}>
                  <Text style={[styles.featureLabel, { color: colors.textPrimary }]}>
                    {f.label}
                  </Text>
                  {f.badge && (
                    <View style={styles.soonBadge}>
                      <Text style={styles.soonBadgeText}>{f.badge}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.featureSub, { color: colors.textSecondary }]}>
                  {f.sub}
                </Text>
              </View>
            </Animated.View>
          ))}
        </View>

        {/* Pricing cards */}
        <View style={styles.planRow}>
          {/* Monthly */}
          <TouchableOpacity
            style={[
              styles.planCard,
              {
                backgroundColor: colors.surface,
                borderColor: selectedPlan === 'monthly' ? Colors.accent : colors.border,
                borderWidth: selectedPlan === 'monthly' ? 2 : 1,
              },
            ]}
            onPress={() => {
              setSelectedPlan('monthly');
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.planName, { color: colors.textPrimary }]}>Monthly</Text>
            {offeringsLoading ? (
              <ActivityIndicator size="small" color={Colors.accent} style={styles.priceLoader} />
            ) : (
              <Text style={[styles.planPrice, { color: colors.textPrimary }]}>
                {monthlyPrice ?? '—'}
              </Text>
            )}
            <Text style={[styles.planSub, { color: colors.textSecondary }]}>per month</Text>
            <Text style={[styles.planNote, { color: colors.textSecondary }]}>Cancel anytime</Text>
          </TouchableOpacity>

          {/* Annual */}
          <TouchableOpacity
            style={[
              styles.planCard,
              {
                backgroundColor: colors.surface,
                borderColor: selectedPlan === 'annual' ? Colors.gold : colors.border,
                borderWidth: selectedPlan === 'annual' ? 2 : 1,
              },
            ]}
            onPress={() => {
              setSelectedPlan('annual');
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            activeOpacity={0.7}
          >
            {/* Best value badge */}
            <View style={styles.bestValueBadge}>
              <Text style={styles.bestValueText}>BEST VALUE</Text>
            </View>
            <Text style={[styles.planName, { color: colors.textPrimary }]}>Annual</Text>
            {offeringsLoading ? (
              <ActivityIndicator size="small" color={Colors.gold} style={styles.priceLoader} />
            ) : (
              <Text style={[styles.planPrice, { color: colors.textPrimary }]}>
                {annualPrice ?? '—'}
              </Text>
            )}
            <Text style={[styles.planSub, { color: colors.textSecondary }]}>billed annually</Text>
            <View style={styles.saveBadge}>
              <Text style={styles.saveBadgeText}>BEST VALUE</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.ctaBtn, { backgroundColor: Colors.accent }]}
          onPress={handlePurchase}
          disabled={purchasing}
          activeOpacity={0.7}
        >
          {purchasing ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.ctaText}>{hasTrial ? 'Start Free Trial' : 'Subscribe Now'}</Text>
          )}
        </TouchableOpacity>

        {/* Restore */}
        <TouchableOpacity
          style={styles.restoreBtn}
          onPress={handleRestore}
          disabled={restoring}
          activeOpacity={0.7}
        >
          {restoring ? (
            <ActivityIndicator color={colors.textSecondary} size="small" />
          ) : (
            <Text style={[styles.restoreText, { color: colors.textSecondary }]}>
              Restore Purchases
            </Text>
          )}
        </TouchableOpacity>

        {/* Legal */}
        <View style={styles.legal}>
          <View style={styles.legalLinks}>
            <TouchableOpacity onPress={() => Linking.openURL(TERMS_URL)} activeOpacity={0.7}>
              <Text style={[styles.legalLink, { color: Colors.accent }]}>Terms of Service</Text>
            </TouchableOpacity>
            <Text style={[styles.legalDot, { color: colors.textSecondary }]}> · </Text>
            <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_URL)} activeOpacity={0.7}>
              <Text style={[styles.legalLink, { color: Colors.accent }]}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.legalDisclaimer, { color: colors.textSecondary }]}>
            Payment will be charged to your {Platform.OS === 'ios' ? 'Apple ID' : 'Google Play'} account.
            Subscription automatically renews unless auto-renew is turned off at least 24 hours
            before the end of the current period. Account will be charged for renewal within 24 hours
            prior to the end of the current period.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },

  closeBtn: {
    position: 'absolute',
    top: 56,
    right: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Header
  header: { alignItems: 'center', marginTop: 24, marginBottom: 28 },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headline: { fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  subheadline: { fontSize: 15, textAlign: 'center', lineHeight: 21, paddingHorizontal: 12 },

  // Features
  features: { gap: 14, marginBottom: 28 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: { flex: 1 },
  featureLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  featureLabel: { fontSize: 15, fontWeight: '600' },
  featureSub: { fontSize: 13, marginTop: 1 },
  soonBadge: {
    backgroundColor: Colors.warning + '25',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  soonBadgeText: { fontSize: 9, fontWeight: '700', color: Colors.warning },

  // Plans
  planRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  planCard: {
    flex: 1,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  planName: { fontSize: 14, fontWeight: '600' },
  priceLoader: { height: 28, justifyContent: 'center' },
  planPrice: { fontSize: 24, fontWeight: '800' },
  planSub: { fontSize: 12 },
  planNote: { fontSize: 11, marginTop: 4 },

  bestValueBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: Colors.gold,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderBottomLeftRadius: 8,
  },
  bestValueText: { fontSize: 9, fontWeight: '800', color: '#1A1A2E' },

  saveBadge: {
    backgroundColor: Colors.gold + '25',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 4,
  },
  saveBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.gold },

  // CTA
  ctaBtn: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  ctaText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },

  // Restore
  restoreBtn: { alignItems: 'center', paddingVertical: 8, marginBottom: 20 },
  restoreText: { fontSize: 14, textDecorationLine: 'underline' },

  // Legal
  legal: { alignItems: 'center', gap: 8 },
  legalLinks: { flexDirection: 'row', alignItems: 'center' },
  legalLink: { fontSize: 13, fontWeight: '500' },
  legalDot: { fontSize: 13 },
  legalDisclaimer: { fontSize: 11, textAlign: 'center', lineHeight: 16, paddingHorizontal: 8 },
});
