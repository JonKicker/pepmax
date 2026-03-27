/**
 * HydrationCard — dashboard card showing today's hydration progress.
 *
 * Includes:
 *  - Animated linear progress bar
 *  - oz consumed / goal summary
 *  - 8oz and 16oz quick-log buttons
 *  - Taps through to the nutrition screen
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { DashboardCard } from './DashboardCard';
import { Colors } from '../../constants/theme';
import type { Theme } from '../../constants/theme';
import { useWater } from '../../hooks/useWater';

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  colors: Theme['colors'];
  onPress: () => void;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function HydrationCard({ colors, onPress }: Props): React.ReactElement {
  const water = useWater();

  const progressValue = useSharedValue(0);

  useEffect(() => {
    progressValue.value = withTiming(water.progress, {
      duration: 700,
      easing: Easing.out(Easing.quad),
    });
  }, [water.progress]); // eslint-disable-line react-hooks/exhaustive-deps

  const barStyle = useAnimatedStyle(() => ({
    width: `${progressValue.value * 100}%`,
  }));

  const pctLabel = Math.round(water.progress * 100);

  const handleQuickLog = async (oz: number) => {
    await water.logWater(oz);
  };

  return (
    <DashboardCard
      title="Hydration"
      icon="water-outline"
      iconColor={Colors.teal}
      onPress={onPress}
      colors={colors}
    >
      {water.loading ? (
        <ActivityIndicator size="small" color={Colors.teal} />
      ) : (
        <View style={styles.content}>
          {/* Progress row */}
          <View style={styles.progressRow}>
            <View style={[styles.track, { backgroundColor: Colors.teal + '22' }]}>
              <Reanimated.View
                style={[styles.fill, barStyle, { backgroundColor: Colors.teal }]}
                accessibilityRole="progressbar"
                accessibilityValue={{ min: 0, max: water.goalOz, now: water.totalOz }}
              />
            </View>
            <Text style={[styles.pctText, { color: Colors.teal }]}>{pctLabel}%</Text>
          </View>

          {/* oz summary */}
          <View style={styles.summaryRow}>
            <Text style={[styles.ozBig, { color: colors.textPrimary }]}>
              {Math.round(water.totalOz)}
            </Text>
            <Text style={[styles.ozUnit, { color: colors.textSecondary }]}>
              {' '}/ {water.goalOz} oz
            </Text>
            {water.goalReached && (
              <View style={[styles.goalBadge, { backgroundColor: Colors.teal + '20' }]}>
                <Ionicons name="checkmark-circle" size={12} color={Colors.teal} />
                <Text style={[styles.goalBadgeText, { color: Colors.teal }]}>Goal</Text>
              </View>
            )}
          </View>

          {/* Quick-log buttons */}
          <View style={styles.buttonRow}>
            {([8, 16] as const).map((oz) => (
              <TouchableOpacity
                key={oz}
                style={[styles.quickBtn, { backgroundColor: Colors.teal + '18', borderColor: Colors.teal + '44' }]}
                onPress={() => handleQuickLog(oz)}
                accessibilityRole="button"
                accessibilityLabel={`Log ${oz} ounces`}
              >
                <Text style={[styles.quickBtnText, { color: Colors.teal }]}>+{oz} oz</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </DashboardCard>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  content: {
    gap: 10,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  track: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  pctText: {
    fontSize: 12,
    fontWeight: '700',
    minWidth: 34,
    textAlign: 'right',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  ozBig: {
    fontSize: 24,
    fontWeight: '800',
  },
  ozUnit: {
    fontSize: 14,
    fontWeight: '500',
  },
  goalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6,
  },
  goalBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  quickBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
