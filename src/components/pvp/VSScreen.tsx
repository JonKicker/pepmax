/**
 * VSScreen — full-screen VS reveal for duels.
 *
 * Dramatic animation sequence:
 * 1. Black screen, 200ms pause
 * 2. Left panel slides in from left (withSpring damping 15 / stiffness 100)
 * 3. Right panel slides in from right (100ms delay)
 * 4. "VS" text scales up from center with glow (200ms delay after panels)
 * 5. Metric label fades in below VS (300ms delay after VS)
 * 6. Auto-calls onComplete after 2500ms, or on tap
 *
 * useReducedMotion → static split screen, no animations.
 */
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableWithoutFeedback,
  Dimensions,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { RankBadge } from './RankBadge';
import { RANK_TIERS_V2 } from '../../utils/rankTierV2';
import type { RankTierV2 } from '../../types/rankV2';

// ─── Constants ────────────────────────────────────────────────────────────────

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BG_COLOR = '#000000';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = '#A0A0B8';
const ACCENT = '#6C5CE7';
const AUTO_COMPLETE_MS = 2500;

// ─── Props ────────────────────────────────────────────────────────────────────

type PlayerInfo = {
  name: string;
  tier: RankTierV2;
};

type Props = {
  challenger: PlayerInfo;
  opponent: PlayerInfo;
  metric: string;
  onComplete: () => void;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTierColor(tier: RankTierV2): string {
  return RANK_TIERS_V2.find((t) => t.tier === tier)?.color ?? '#FFFFFF';
}

function fireHeavyHaptic(): void {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VSScreen({ challenger, opponent, metric, onComplete }: Props) {
  const reducedMotion = useReducedMotion();
  const dismissed = useRef(false);

  const challengerX = useSharedValue(-SCREEN_WIDTH);
  const opponentX = useSharedValue(SCREEN_WIDTH);
  const vsScale = useSharedValue(0);
  const vsOpacity = useSharedValue(0);
  const metricOpacity = useSharedValue(0);
  const screenOpacity = useSharedValue(0);

  const challengerColor = getTierColor(challenger.tier);
  const opponentColor = getTierColor(opponent.tier);

  function dismiss() {
    if (!dismissed.current) {
      dismissed.current = true;
      onComplete();
    }
  }

  useEffect(() => {
    let hapticTimer: ReturnType<typeof setTimeout> | null = null;

    if (reducedMotion) {
      // Static: just show everything immediately
      screenOpacity.value = 1;
      challengerX.value = 0;
      opponentX.value = 0;
      vsScale.value = 1;
      vsOpacity.value = 1;
      metricOpacity.value = 1;
    } else {
      // Step 1: fade screen in from black (200ms pause effect)
      screenOpacity.value = withTiming(1, { duration: 100 });

      // Step 2: left panel slides in
      challengerX.value = withDelay(
        200,
        withSpring(0, { damping: 15, stiffness: 100 }),
      );

      // Step 3: right panel slides in (100ms after left)
      opponentX.value = withDelay(
        300,
        withSpring(0, { damping: 15, stiffness: 100 }),
      );

      // Step 4: VS text scales up (200ms after panels start)
      vsOpacity.value = withDelay(700, withTiming(1, { duration: 200 }));
      vsScale.value = withDelay(
        700,
        withSpring(1, { damping: 12, stiffness: 120 }),
      );

      // Step 5: metric label fades in (300ms after VS)
      metricOpacity.value = withDelay(1100, withTiming(1, { duration: 300 }));

      // Fire haptic when VS appears — stored so it can be cancelled on unmount
      hapticTimer = setTimeout(() => {
        runOnJS(fireHeavyHaptic)();
      }, 700);
    }

    // Auto-complete
    const timer = setTimeout(() => {
      dismiss();
    }, AUTO_COMPLETE_MS);

    return () => {
      clearTimeout(timer);
      if (hapticTimer !== null) clearTimeout(hapticTimer);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const screenStyle = useAnimatedStyle(() => ({ opacity: screenOpacity.value }));
  const challengerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: challengerX.value }],
  }));
  const opponentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: opponentX.value }],
  }));
  const vsStyle = useAnimatedStyle(() => ({
    opacity: vsOpacity.value,
    transform: [{ scale: vsScale.value }],
  }));
  const metricStyle = useAnimatedStyle(() => ({ opacity: metricOpacity.value }));

  return (
    <TouchableWithoutFeedback
      onPress={dismiss}
      accessibilityRole="button"
      accessibilityLabel="Dismiss versus screen"
    >
      <Animated.View style={[styles.container, screenStyle]}>
        {/* Left panel — challenger */}
        <Animated.View
          style={[
            styles.panel,
            styles.leftPanel,
            { backgroundColor: challengerColor + '18' },
            challengerStyle,
          ]}
          accessibilityLabel={`${challenger.name}, ${challenger.tier} tier`}
        >
          <View style={styles.panelContent}>
            <RankBadge tier={challenger.tier} size="lg" glow />
            <Text style={styles.playerName} numberOfLines={1}>
              {challenger.name}
            </Text>
            <Text style={[styles.tierLabel, { color: challengerColor }]}>
              {challenger.tier.toUpperCase()}
            </Text>
          </View>
          {/* Diagonal edge overlay — skewed right border */}
          <View style={[styles.diagonalEdge, styles.diagonalEdgeLeft, { backgroundColor: challengerColor + '30' }]} />
        </Animated.View>

        {/* Right panel — opponent */}
        <Animated.View
          style={[
            styles.panel,
            styles.rightPanel,
            { backgroundColor: opponentColor + '18' },
            opponentStyle,
          ]}
          accessibilityLabel={`${opponent.name}, ${opponent.tier} tier`}
        >
          <View style={styles.panelContent}>
            <RankBadge tier={opponent.tier} size="lg" glow />
            <Text style={styles.playerName} numberOfLines={1}>
              {opponent.name}
            </Text>
            <Text style={[styles.tierLabel, { color: opponentColor }]}>
              {opponent.tier.toUpperCase()}
            </Text>
          </View>
          {/* Diagonal edge */}
          <View style={[styles.diagonalEdge, styles.diagonalEdgeRight, { backgroundColor: opponentColor + '30' }]} />
        </Animated.View>

        {/* Center overlay: VS text + metric */}
        <View style={styles.centerOverlay} pointerEvents="none">
          {/* VS text */}
          <Animated.View style={[styles.vsContainer, vsStyle]}>
            <Text
              style={[styles.vsText, { textShadowColor: ACCENT }]}
              accessibilityRole="header"
            >
              VS
            </Text>
          </Animated.View>

          {/* Metric pill */}
          <Animated.View style={[styles.metricPill, metricStyle]}>
            <Text style={styles.metricText}>{metric}</Text>
          </Animated.View>
        </View>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: BG_COLOR,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  panel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  leftPanel: {
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.1)',
  },
  rightPanel: {
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.1)',
  },
  panelContent: {
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
  },
  playerName: {
    color: TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  tierLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    opacity: 0.9,
  },
  diagonalEdge: {
    position: 'absolute',
    width: 20,
    height: SCREEN_HEIGHT * 1.5,
    transform: [{ skewX: '-8deg' }],
  },
  diagonalEdgeLeft: {
    right: -10,
  },
  diagonalEdgeRight: {
    left: -10,
  },
  centerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  vsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderWidth: 2,
    borderColor: ACCENT,
  },
  vsText: {
    color: TEXT_PRIMARY,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 3,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  metricPill: {
    backgroundColor: 'rgba(30,30,46,0.9)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  metricText: {
    color: TEXT_SECONDARY,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
