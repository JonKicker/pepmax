/**
 * CompareButton — reusable outlined button that navigates to the Compare screen.
 *
 * Used across friend profile, social hub, and anywhere a "Compare" action
 * is needed. Keeps styling consistent across all entry points.
 */
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { analytics, AnalyticsEvent } from '../../services/analytics';

// ─── Props ────────────────────────────────────────────────────────────────────

type CompareButtonProps = {
  opponentId: string;
  opponentName: string;
  opponentAvatar?: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const PURPLE = '#7C3AED';

// ─── Component ────────────────────────────────────────────────────────────────

export function CompareButton({ opponentId, opponentName, opponentAvatar }: CompareButtonProps) {
  const router = useRouter();

  function handlePress() {
    analytics.track(AnalyticsEvent.COMPARE_INITIATED, { opponentId });
    router.push({
      pathname: '/(tabs)/dashboard/compare',
      params: { opponentId, opponentName, ...(opponentAvatar ? { opponentAvatar } : {}) },
    });
  }

  return (
    <TouchableOpacity style={styles.button} onPress={handlePress} activeOpacity={0.7}>
      <Ionicons name="git-compare-outline" size={16} color={PURPLE} />
      <Text style={styles.label}>Compare</Text>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: PURPLE,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  label: {
    color: PURPLE,
    fontSize: 14,
    fontWeight: '700',
  },
});
