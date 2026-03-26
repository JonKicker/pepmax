/**
 * Go Pro screen — feature comparison table + trial start.
 *
 * Free users see:
 *   - Free vs Pro feature comparison table
 *   - "Start Free Trial" (7-day, Firestore-backed, no IAP)
 *   - "View Plans" → /paywall
 *
 * Trial/Pro users see their current status.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../src/hooks/useTheme';
import { Colors } from '../src/constants/theme';
import { usePremium } from '../src/contexts/PremiumContext';
import { PRO_FEATURES } from '../src/constants/premium';

export default function GoProScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { isPremium, isTrial, plan, expirationDate, startTrial } = usePremium();
  const [starting, setStarting] = useState(false);

  const handleStartTrial = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStarting(true);
    try {
      await startTrial();
      // startTrial is idempotent — if isPremium is now true we succeeded;
      // if it was already used, isPremium stays false (trial expired).
      Alert.alert(
        'Trial Started!',
        'You now have 7 days of Pro access. Enjoy all premium features.',
        [{ text: 'Let\'s Go', onPress: () => router.back() }]
      );
    } catch (e: any) {
      if (e?.message === 'TRIAL_ALREADY_USED') {
        Alert.alert(
          'Trial Already Used',
          'Your free trial has already been used on this account. Tap "View Plans" to subscribe.',
        );
      } else {
        Alert.alert('Error', 'Could not start trial. Please try again.');
      }
    } finally {
      setStarting(false);
    }
  };

  const trialDaysRemaining = (): number | null => {
    if (!isTrial || !expirationDate) return null;
    const ms = new Date(expirationDate).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  };

  const daysLeft = trialDaysRemaining();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={[styles.goldBadge, { backgroundColor: Colors.gold + '20' }]}>
          <Ionicons name="star" size={18} color={Colors.gold} />
          <Text style={[styles.goldBadgeText, { color: Colors.gold }]}>PepMax Pro</Text>
        </View>
        <Text style={[styles.headline, { color: colors.textPrimary }]}>
          Unlock Your Full Potential
        </Text>
        <Text style={[styles.subheadline, { color: colors.textSecondary }]}>
          Advanced tools for serious athletes and biohackers.
        </Text>
      </View>

      {/* Status banner for trial / pro users */}
      {isPremium && (
        <View style={[styles.statusBanner, { backgroundColor: Colors.gold + '18', borderColor: Colors.gold + '40' }]}>
          <Ionicons name="checkmark-circle" size={18} color={Colors.gold} />
          <Text style={[styles.statusText, { color: Colors.gold }]}>
            {isTrial && daysLeft !== null
              ? `Trial active — ${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining`
              : plan === 'annual'
              ? 'Annual Pro — Active'
              : 'Monthly Pro — Active'}
          </Text>
        </View>
      )}

      {/* Feature list — all included */}
      <View style={[styles.tableCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.tableHeaderLabel, { color: colors.textSecondary }]}>Everything included</Text>
        </View>

        {PRO_FEATURES.map((feature, index) => (
          <View
            key={feature.id}
            style={[
              styles.tableRow,
              { borderBottomColor: colors.border },
              index === PRO_FEATURES.length - 1 && styles.tableRowLast,
            ]}
          >
            <Ionicons name="checkmark-circle" size={18} color={Colors.gold} />
            <Text style={[styles.featureLabel, { color: colors.textPrimary }]} numberOfLines={1}>
              {feature.label}
            </Text>
          </View>
        ))}
      </View>

      {/* CTAs */}
      {!isPremium && (
        <>
          <TouchableOpacity
            style={[styles.trialBtn, { backgroundColor: Colors.gold }]}
            onPress={handleStartTrial}
            disabled={starting}
            activeOpacity={0.7}
          >
            {starting ? (
              <ActivityIndicator color="#1A1A2E" />
            ) : (
              <>
                <Ionicons name="gift-outline" size={18} color="#1A1A2E" />
                <Text style={styles.trialBtnText}>Start Free 7-Day Trial</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.plansBtn, { borderColor: colors.border }]}
            onPress={() => router.push('/paywall')}
            activeOpacity={0.7}
          >
            <Text style={[styles.plansBtnText, { color: colors.textPrimary }]}>View Plans & Pricing</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </>
      )}

      {isPremium && !isTrial && (
        <TouchableOpacity
          style={[styles.plansBtn, { borderColor: colors.border }]}
          onPress={() => router.push('/paywall')}
          activeOpacity={0.7}
        >
          <Text style={[styles.plansBtnText, { color: colors.textPrimary }]}>Manage Subscription</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      )}

      <Text style={[styles.legalText, { color: colors.textSecondary }]}>
        Free trial is available once per account. No payment required to start.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 60 },

  header: { alignItems: 'center', marginBottom: 24 },
  closeBtn: {
    alignSelf: 'flex-start',
    padding: 4,
    marginBottom: 16,
  },
  goldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  goldBadgeText: { fontSize: 14, fontWeight: '700' },
  headline: { fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  subheadline: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  statusText: { fontSize: 14, fontWeight: '600' },

  tableCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  tableHeaderLabel: { fontSize: 12, fontWeight: '600', flex: 1 },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  tableRowLast: { borderBottomWidth: 0 },
  featureLabel: { flex: 1, fontSize: 13 },

  trialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 12,
  },
  trialBtnText: { fontSize: 16, fontWeight: '800', color: '#1A1A2E' },

  plansBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  plansBtnText: { fontSize: 15, fontWeight: '600' },

  legalText: { fontSize: 11, textAlign: 'center', lineHeight: 16 },
});
