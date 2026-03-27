/**
 * DuelProgressBar — horizontal tug-of-war progress bar for active duels.
 *
 * Left side fills in challenger's tier color, right side in opponent's tier color.
 * Split point animates with withTiming as progress changes.
 * Pulsing dot indicator on whoever is currently ahead.
 *
 * useReducedMotion: no pulse animation, static display.
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { RankBadge } from './RankBadge';
import { RANK_TIERS_V2 } from '../../utils/rankTierV2';
import type { RankTierV2 } from '../../types/rankV2';

// ─── Constants ────────────────────────────────────────────────────────────────

const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = '#A0A0B8';
const BORDER = '#2E2E42';
const TRACK_HEIGHT = 14;
const DOT_SIZE = 10;

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  challengerProgress: number;
  opponentProgress: number;
  challengerName: string;
  opponentName: string;
  challengerTier: RankTierV2;
  opponentTier: RankTierV2;
  targetValue: number;
  unit: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTierColor(tier: RankTierV2): string {
  return RANK_TIERS_V2.find((t) => t.tier === tier)?.color ?? '#FFFFFF';
}

// ─── PulsingDot ───────────────────────────────────────────────────────────────

type PulsingDotProps = {
  color: string;
  reducedMotion: boolean;
};

function PulsingDot({ color, reducedMotion }: PulsingDotProps) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (!reducedMotion) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.4, { duration: 500, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    } else {
      scale.value = 1;
    }
  }, [reducedMotion]); // eslint-disable-line react-hooks/exhaustive-deps

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.pulsingDot,
        { backgroundColor: color },
        dotStyle,
      ]}
    />
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DuelProgressBar({
  challengerProgress,
  opponentProgress,
  challengerName,
  opponentName,
  challengerTier,
  opponentTier,
  targetValue,
  unit,
}: Props) {
  const reducedMotion = useReducedMotion();

  const challengerColor = getTierColor(challengerTier);
  const opponentColor = getTierColor(opponentTier);

  // Calculate split percentage (challenger's share of total)
  const total = challengerProgress + opponentProgress;
  const rawSplit = total > 0 ? challengerProgress / total : 0.5;
  const splitPercent = useSharedValue(rawSplit);

  useEffect(() => {
    const newTotal = challengerProgress + opponentProgress;
    const newSplit = newTotal > 0 ? challengerProgress / newTotal : 0.5;
    if (reducedMotion) {
      splitPercent.value = newSplit;
    } else {
      splitPercent.value = withTiming(newSplit, { duration: 600, easing: Easing.out(Easing.quad) });
    }
  }, [challengerProgress, opponentProgress, reducedMotion]); // eslint-disable-line react-hooks/exhaustive-deps

  const challengerFillStyle = useAnimatedStyle(() => ({
    flex: splitPercent.value,
  }));

  const opponentFillStyle = useAnimatedStyle(() => ({
    flex: 1 - splitPercent.value,
  }));

  const challengerAhead = challengerProgress >= opponentProgress;
  const opponentAhead = opponentProgress > challengerProgress;
  const tied = challengerProgress === opponentProgress;

  // Format progress values
  const fmtProgress = (v: number) =>
    v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v));

  const capPct = targetValue > 0
    ? `${Math.round(Math.min(100, (challengerProgress / targetValue) * 100))}% / ${Math.round(Math.min(100, (opponentProgress / targetValue) * 100))}%`
    : null;

  return (
    <View style={styles.container}>
      {/* Names row */}
      <View style={styles.namesRow}>
        <View style={styles.nameLeft}>
          <RankBadge tier={challengerTier} size="sm" />
          <Text style={[styles.nameText, { color: challengerColor }]} numberOfLines={1}>
            {challengerName}
          </Text>
        </View>
        <View style={styles.nameRight}>
          <Text style={[styles.nameText, { color: opponentColor }]} numberOfLines={1}>
            {opponentName}
          </Text>
          <RankBadge tier={opponentTier} size="sm" />
        </View>
      </View>

      {/* Progress values row */}
      <View style={styles.valuesRow}>
        <View style={styles.valueLeft}>
          {!tied && challengerAhead && (
            <PulsingDot color={challengerColor} reducedMotion={reducedMotion} />
          )}
          <Text style={[styles.progressValue, { color: challengerAhead ? TEXT_PRIMARY : TEXT_SECONDARY }]}>
            {fmtProgress(challengerProgress)} {unit}
          </Text>
        </View>
        <View style={styles.valueRight}>
          <Text style={[styles.progressValue, { color: opponentAhead ? TEXT_PRIMARY : TEXT_SECONDARY }]}>
            {fmtProgress(opponentProgress)} {unit}
          </Text>
          {!tied && opponentAhead && (
            <PulsingDot color={opponentColor} reducedMotion={reducedMotion} />
          )}
        </View>
      </View>

      {/* Tug-of-war bar */}
      <View style={styles.trackOuter}>
        <View style={styles.track}>
          <Animated.View
            style={[
              styles.fillLeft,
              { backgroundColor: challengerColor },
              challengerFillStyle,
            ]}
          />
          <Animated.View
            style={[
              styles.fillRight,
              { backgroundColor: opponentColor },
              opponentFillStyle,
            ]}
          />
        </View>
        {/* Center divider */}
        <View style={styles.centerDivider} />
      </View>

      {/* Optional target cap row */}
      {capPct && (
        <Text style={styles.capText}>Target: {capPct}</Text>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    gap: 6,
    paddingVertical: 8,
  },
  namesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nameLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  nameRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    justifyContent: 'flex-end',
  },
  nameText: {
    fontSize: 12,
    fontWeight: '700',
  },
  valuesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  valueLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  valueRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  progressValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  pulsingDot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
  trackOuter: {
    position: 'relative',
    borderRadius: TRACK_HEIGHT / 2,
    overflow: 'hidden',
  },
  track: {
    flexDirection: 'row',
    height: TRACK_HEIGHT,
    backgroundColor: BORDER,
    borderRadius: TRACK_HEIGHT / 2,
    overflow: 'hidden',
  },
  fillLeft: {
    height: TRACK_HEIGHT,
    borderTopLeftRadius: TRACK_HEIGHT / 2,
    borderBottomLeftRadius: TRACK_HEIGHT / 2,
  },
  fillRight: {
    height: TRACK_HEIGHT,
    borderTopRightRadius: TRACK_HEIGHT / 2,
    borderBottomRightRadius: TRACK_HEIGHT / 2,
  },
  centerDivider: {
    position: 'absolute',
    top: 0,
    left: '50%',
    width: 2,
    height: TRACK_HEIGHT,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginLeft: -1,
  },
  capText: {
    color: TEXT_SECONDARY,
    fontSize: 10,
    textAlign: 'center',
  },
});
