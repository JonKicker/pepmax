/**
 * RankUpCeremony — rank change drama screen for the V2 RP rank system.
 *
 * Handles both promotion (up) and demotion (down) with distinct animations.
 * Integrates with the celebration engine for promotion particle effects.
 * Respects useReducedMotion for accessibility.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withSpring,
  withDelay,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useCelebration } from '../../hooks/useCelebration';
import { rankUp } from '../../utils/celebrationPresets';
import { RankBadge } from './RankBadge';
import type { RankTierV2Info } from '../../types/rankV2';

// ─── Props ───────────────────────────────────────────────────────────────────

type Props = {
  oldTier: RankTierV2Info;
  newTier: RankTierV2Info;
  direction: 'up' | 'down';
  onComplete: () => void;
};

// ─── Timings ─────────────────────────────────────────────────────────────────

const PROMOTION_DURATION_MS = 2800;
const DEMOTION_DURATION_MS = 2200;
const REDUCED_DURATION_MS = 1200;

// ─── Component ───────────────────────────────────────────────────────────────

export function RankUpCeremony({ oldTier, newTier, direction, onComplete }: Props) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const { triggerCelebration } = useCelebration();
  const dismissed = useRef(false);

  // Shared values for old badge
  const oldOpacity = useSharedValue(1);
  const oldScale = useSharedValue(1);

  // Shared values for new badge
  const newOpacity = useSharedValue(0);
  const newScale = useSharedValue(0);

  // Title fade-in
  const titleOpacity = useSharedValue(0);

  // Shake offset for demotion
  const shakeX = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      runSimpleCrossfade();
    } else if (direction === 'up') {
      runPromotionAnimation();
    } else {
      runDemotionAnimation();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function runSimpleCrossfade() {
    const duration = REDUCED_DURATION_MS;
    oldOpacity.value = withTiming(0, { duration: duration * 0.4 });
    newOpacity.value = withDelay(
      duration * 0.3,
      withTiming(1, { duration: duration * 0.5 }),
    );
    newScale.value = 1;
    titleOpacity.value = withDelay(duration * 0.5, withTiming(1, { duration: 300 }));

    // Auto-dismiss
    setTimeout(() => { if (!dismissed.current) { dismissed.current = true; onComplete(); } }, duration + 200);
  }

  function runPromotionAnimation() {
    // Trigger celebration engine with tier-aware config
    triggerCelebration(
      rankUp({
        title: `PROMOTED`,
        subtitle: newTier.label,
        accentColor: newTier.color,
        particleCount: newTier.particleCount,
      }),
    );

    // Old badge: fade out + scale down
    oldOpacity.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.quad) });
    oldScale.value = withTiming(0.7, { duration: 500, easing: Easing.out(Easing.quad) });

    // New badge: spring in from scale 0, delayed
    newOpacity.value = withDelay(400, withTiming(1, { duration: 300 }));
    newScale.value = withDelay(
      400,
      withSpring(1, { damping: 10, stiffness: 120, mass: 0.8 }),
    );

    // Title fades in after badge appears
    titleOpacity.value = withDelay(700, withTiming(1, { duration: 400 }));

    // Auto-dismiss
    setTimeout(() => { if (!dismissed.current) { dismissed.current = true; onComplete(); } }, PROMOTION_DURATION_MS);
  }

  function runDemotionAnimation() {
    // Single warning haptic
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    }

    // Old badge: shake then fade
    shakeX.value = withSequence(
      withTiming(-8, { duration: 80 }),
      withTiming(8, { duration: 80 }),
      withTiming(-6, { duration: 80 }),
      withTiming(6, { duration: 80 }),
      withTiming(-4, { duration: 60 }),
      withTiming(0, { duration: 60 }),
    );
    oldOpacity.value = withDelay(600, withTiming(0, { duration: 400 }));

    // New badge: fades in muted (opacity 0.7)
    newOpacity.value = withDelay(800, withTiming(0.7, { duration: 400 }));
    newScale.value = 1;

    // Title fades in
    titleOpacity.value = withDelay(900, withTiming(1, { duration: 400 }));

    // Auto-dismiss
    setTimeout(() => { if (!dismissed.current) { dismissed.current = true; onComplete(); } }, DEMOTION_DURATION_MS);
  }

  // Animated styles
  const oldBadgeStyle = useAnimatedStyle(() => ({
    opacity: oldOpacity.value,
    transform: [
      { scale: oldScale.value },
      { translateX: shakeX.value },
    ],
  }));

  const newBadgeStyle = useAnimatedStyle(() => ({
    opacity: newOpacity.value,
    transform: [{ scale: newScale.value }],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
  }));

  const isPromotion = direction === 'up';
  const titleText = isPromotion ? 'PROMOTED' : 'DEMOTED';
  const titleColor = isPromotion ? newTier.color : colors.textSecondary;
  const newTierLabelColor = isPromotion ? newTier.color : colors.textSecondary;

  return (
    <View style={styles.container}>
      {/* Old badge */}
      <Animated.View style={[styles.badgeWrapper, oldBadgeStyle]}>
        <RankBadge tier={oldTier.tier} size="lg" glow={false} />
        <Text style={[styles.tierName, { color: colors.textSecondary }]}>{oldTier.label}</Text>
      </Animated.View>

      {/* New badge */}
      <Animated.View style={[styles.badgeWrapper, styles.newBadgeWrapper, newBadgeStyle]}>
        <RankBadge tier={newTier.tier} size="lg" glow={isPromotion} />
        <Text style={[styles.tierName, { color: newTierLabelColor }]}>{newTier.label}</Text>
      </Animated.View>

      {/* Title */}
      <Animated.View style={[styles.titleWrapper, titleStyle]}>
        <Text style={[styles.titleText, { color: titleColor }]}>{titleText}</Text>
        <Text style={[styles.tierNameLarge, { color: newTierLabelColor }]}>
          {newTier.label}
        </Text>
      </Animated.View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 16,
  },
  badgeWrapper: {
    alignItems: 'center',
    gap: 8,
    position: 'absolute',
  },
  newBadgeWrapper: {
    // Positioned on top — old fades out as new appears
  },
  tierName: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  titleWrapper: {
    marginTop: 120,
    alignItems: 'center',
    gap: 4,
  },
  titleText: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 4,
  },
  tierNameLarge: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
