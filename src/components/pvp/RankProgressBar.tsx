/**
 * RankProgressBar — division progress visualization for the V2 RP rank system.
 *
 * Shows progress within the current tier toward the next tier.
 * Supports compact (single bar) and full (bar + labels + tick marks) modes.
 * Respects useReducedMotion for accessibility.
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { useTheme } from '../../hooks/useTheme';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { getTierForRP, getRPProgress, RANK_TIERS_V2 } from '../../utils/rankTierV2';

// ─── Props ───────────────────────────────────────────────────────────────────

type Props = {
  currentRP: number;
  size?: 'compact' | 'full';
  rpChange?: number;
  style?: ViewStyle;
};

// ─── Component ───────────────────────────────────────────────────────────────

export function RankProgressBar({ currentRP, size = 'full', rpChange, style }: Props) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();

  const { progress, next } = getRPProgress(currentRP);
  const currentTier = getTierForRP(currentRP);
  const fillWidth = useSharedValue(0);
  const rpChangeFade = useSharedValue(0);

  // Animate fill on mount and progress change
  useEffect(() => {
    if (reducedMotion) {
      fillWidth.value = progress;
    } else {
      fillWidth.value = withTiming(Math.min(progress, 1), {
        duration: 700,
        easing: Easing.out(Easing.quad),
      });
    }
  }, [progress, reducedMotion]); // eslint-disable-line react-hooks/exhaustive-deps

  // Animate rpChange label
  useEffect(() => {
    if (rpChange === undefined || rpChange === 0) {
      rpChangeFade.value = 0;
      return;
    }
    if (reducedMotion) {
      rpChangeFade.value = 1;
    } else {
      rpChangeFade.value = withSequence(
        withTiming(1, { duration: 200 }),
        withTiming(1, { duration: 1600 }),
        withTiming(0, { duration: 400 }),
      );
    }
  }, [rpChange, reducedMotion]); // eslint-disable-line react-hooks/exhaustive-deps

  const fillStyle = useAnimatedStyle(() => ({
    width: `${fillWidth.value * 100}%`,
  }));

  const rpChangeLabelStyle = useAnimatedStyle(() => ({
    opacity: rpChangeFade.value,
  }));

  const isInPromotionZone = progress > 0.8 && next !== null;
  const rpChangePositive = rpChange !== undefined && rpChange > 0;
  const rpChangeLabel =
    rpChange !== undefined && rpChange !== 0
      ? rpChange > 0
        ? `+${rpChange}`
        : `${rpChange}`
      : null;

  if (size === 'compact') {
    return (
      <View style={[styles.compactContainer, style]}>
        <View style={styles.compactLabelRow}>
          <Text style={[styles.compactTierLabel, { color: currentTier.color }]}>
            {currentTier.label}
          </Text>
          {rpChangeLabel !== null && (
            <Animated.Text
              style={[
                styles.compactRPChange,
                { color: rpChangePositive ? colors.success : colors.error },
                rpChangeLabelStyle,
              ]}
            >
              {rpChangeLabel} RP
            </Animated.Text>
          )}
        </View>
        <View style={[styles.track, styles.compactTrack, { backgroundColor: colors.border }]}>
          <Animated.View
            style={[styles.fill, fillStyle, { backgroundColor: currentTier.color }]}
          />
        </View>
      </View>
    );
  }

  // Full size
  const currentTierIndex = RANK_TIERS_V2.findIndex((t) => t.tier === currentTier.tier);
  const nextTier = RANK_TIERS_V2[currentTierIndex + 1] ?? null;

  return (
    <View style={[styles.fullContainer, style]}>
      {/* Label row */}
      <View style={styles.fullLabelRow}>
        <Text style={[styles.fullTierLabel, { color: currentTier.color }]}>
          {currentTier.label}
        </Text>
        <View style={styles.fullRightLabels}>
          {rpChangeLabel !== null && (
            <Animated.Text
              style={[
                styles.fullRPChange,
                { color: rpChangePositive ? colors.success : colors.error },
                rpChangeLabelStyle,
              ]}
            >
              {rpChangeLabel} RP
            </Animated.Text>
          )}
          {nextTier !== null && (
            <Text style={[styles.fullNextTierLabel, { color: colors.textSecondary }]}>
              {currentRP} / {nextTier.minRP} RP
            </Text>
          )}
          {nextTier === null && (
            <Text style={[styles.fullNextTierLabel, { color: currentTier.color }]}>
              MAX
            </Text>
          )}
        </View>
      </View>

      {/* Progress track with tick marks */}
      <View style={styles.trackWrapper}>
        <View style={[styles.track, styles.fullTrack, { backgroundColor: colors.border }]}>
          <Animated.View
            style={[styles.fill, fillStyle, { backgroundColor: currentTier.color }]}
          />
          {/* Promotion zone overlay */}
          {isInPromotionZone && (
            <View style={[styles.promotionZone, { borderColor: currentTier.color }]} />
          )}
        </View>

        {/* Tick marks at tier boundaries (relative to the track) */}
        {RANK_TIERS_V2.slice(1).map((t, i) => {
          if (!nextTier) return null;
          // Only draw ticks that are within the current tier's range
          const tickRP = t.minRP;
          const rangeStart = currentTier.minRP;
          const rangeEnd = nextTier.minRP;
          if (tickRP <= rangeStart || tickRP > rangeEnd) return null;
          const tickPos = (tickRP - rangeStart) / (rangeEnd - rangeStart);
          return (
            <View
              key={t.tier}
              style={[
                styles.tickMark,
                {
                  left: `${tickPos * 100}%`,
                  backgroundColor: colors.textSecondary,
                },
              ]}
            />
          );
        })}
      </View>

      {/* Promotion zone label */}
      {isInPromotionZone && (
        <Text style={[styles.promotionZoneText, { color: currentTier.color }]}>
          PROMOTION ZONE
        </Text>
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Compact
  compactContainer: { gap: 4 },
  compactLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactTierLabel: { fontSize: 13, fontWeight: '700' },
  compactRPChange: { fontSize: 12, fontWeight: '600' },
  compactTrack: { height: 6, borderRadius: 3 },

  // Full
  fullContainer: { gap: 8 },
  fullLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fullTierLabel: { fontSize: 17, fontWeight: '700' },
  fullRightLabels: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fullRPChange: { fontSize: 14, fontWeight: '700' },
  fullNextTierLabel: { fontSize: 13 },
  fullTrack: { height: 10, borderRadius: 5 },

  // Shared track
  track: {
    overflow: 'hidden',
    borderRadius: 5,
  },
  fill: {
    height: '100%',
    borderRadius: 5,
  },

  // Tick marks
  trackWrapper: {
    position: 'relative',
  },
  tickMark: {
    position: 'absolute',
    top: 0,
    width: 2,
    height: 10,
    borderRadius: 1,
    marginLeft: -1,
  },

  // Promotion zone
  promotionZone: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '20%',
    borderWidth: 1,
    borderRadius: 5,
    opacity: 0.4,
  },
  promotionZoneText: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'right',
    letterSpacing: 0.5,
    opacity: 0.8,
  },
});
