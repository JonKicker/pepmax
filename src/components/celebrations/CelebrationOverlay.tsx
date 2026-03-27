/**
 * CelebrationOverlay — renders tier-appropriate celebration UI.
 *
 * Tier behavior:
 *   micro     — nothing (handled inline via useMicroCelebration)
 *   medium    — ParticleSystem(20) + title fade-in
 *   major     — Full overlay + ParticleSystem(32) + ScreenFlash + title/subtitle/icon + spring scale-in
 *   legendary — ParticleSystem(40) + 3x screen flash pulse + sequential text animations
 *
 * useReducedMotion: shows static display only — no animations.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { Colors } from '../../constants/theme';
import { ParticleSystem } from './ParticleSystem';
import { ScreenFlash } from './ScreenFlash';
import type { CelebrationConfig } from '../../types/celebration';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Decorative particle palette — intentionally not theme-responsive
// Uses theme token constants where available; purely decorative hues noted inline.
const PARTICLE_COLORS = [
  Colors.gold,      // #FFD700
  Colors.cardio,    // #E74C3C
  Colors.accent,    // #2E86C1
  Colors.nutrition, // #27AE60
  Colors.gym,       // #8E44AD
  Colors.warning,   // #E67E22
  Colors.teal,      // #1ABC9C
  Colors.accent,    // #2E86C1 — accent repeated; no violet token in theme
];

type CelebrationOverlayProps = {
  config: CelebrationConfig;
  visible: boolean;
  onComplete?: () => void;
};

// ─── Medium tier ─────────────────────────────────────────────────────────────
function MediumOverlay({ config, onComplete, reducedMotion }: { config: CelebrationConfig; onComplete?: () => void; reducedMotion: boolean }) {
  const { colors } = useTheme();
  const titleOpacity = useSharedValue(reducedMotion ? 1 : 0);
  const titleY = useSharedValue(reducedMotion ? 0 : 20);

  useEffect(() => {
    if (reducedMotion) return;
    titleOpacity.value = withDelay(200, withTiming(1, { duration: 400 }));
    titleY.value = withDelay(200, withTiming(0, { duration: 400, easing: Easing.out(Easing.ease) }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));

  const accent = config.accentColor ?? colors.accent;

  return (
    <View style={styles.mediumContainer} pointerEvents="none">
      <ParticleSystem
        particleCount={config.particleCount}
        colors={PARTICLE_COLORS}
        accentColor={accent}
        spread={100}
        onComplete={onComplete}
      />
      {config.title ? (
        <Animated.View style={[styles.mediumTitleWrap, titleStyle]} pointerEvents="none">
          {config.icon ? (
            <Ionicons name={config.icon as any} size={28} color={accent} />
          ) : null}
          <Text style={[styles.mediumTitle, { color: colors.textPrimary }]}>{config.title}</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

// ─── Major tier ──────────────────────────────────────────────────────────────
function MajorOverlay({ config, onComplete, reducedMotion }: { config: CelebrationConfig; onComplete?: () => void; reducedMotion: boolean }) {
  const { colors } = useTheme();
  const cardScale = useSharedValue(reducedMotion ? 1 : 0.4);
  const cardOpacity = useSharedValue(reducedMotion ? 1 : 0);
  const titleOpacity = useSharedValue(reducedMotion ? 1 : 0);
  const subtitleOpacity = useSharedValue(reducedMotion ? 1 : 0);
  const [showFlash, setShowFlash] = useState(!reducedMotion);

  useEffect(() => {
    if (reducedMotion) return;
    cardScale.value = withDelay(100, withSpring(1, { damping: 14, stiffness: 140 }));
    cardOpacity.value = withDelay(100, withTiming(1, { duration: 250 }));
    titleOpacity.value = withDelay(350, withTiming(1, { duration: 300 }));
    subtitleOpacity.value = withDelay(500, withTiming(1, { duration: 300 }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
    opacity: cardOpacity.value,
  }));
  const titleStyle = useAnimatedStyle(() => ({ opacity: titleOpacity.value }));
  const subtitleStyle = useAnimatedStyle(() => ({ opacity: subtitleOpacity.value }));

  const accent = config.accentColor ?? colors.accent;

  return (
    <View style={styles.majorOverlay} pointerEvents="none">
      <ParticleSystem
        particleCount={config.particleCount}
        colors={PARTICLE_COLORS}
        accentColor={accent}
        spread={130}
        onComplete={onComplete}
      />
      {showFlash && (
        <ScreenFlash color={accent} onComplete={() => setShowFlash(false)} />
      )}
      <Animated.View style={[styles.majorCard, { backgroundColor: colors.surface }, cardStyle]} pointerEvents="none">
        {config.icon ? (
          <Ionicons name={config.icon as any} size={48} color={accent} />
        ) : null}
        {config.title ? (
          <Animated.Text style={[styles.majorTitle, { color: colors.textPrimary }, titleStyle]}>
            {config.title}
          </Animated.Text>
        ) : null}
        {config.subtitle ? (
          <Animated.Text style={[styles.majorSubtitle, { color: colors.textSecondary }, subtitleStyle]}>
            {config.subtitle}
          </Animated.Text>
        ) : null}
      </Animated.View>
    </View>
  );
}

// ─── Legendary tier ──────────────────────────────────────────────────────────
function LegendaryOverlay({ config, onComplete, reducedMotion }: { config: CelebrationConfig; onComplete?: () => void; reducedMotion: boolean }) {
  const { colors } = useTheme();
  const [flashCount, setFlashCount] = useState(0);

  const titleOpacity = useSharedValue(reducedMotion ? 1 : 0);
  const titleScale = useSharedValue(reducedMotion ? 1 : 0.6);
  const subtitleOpacity = useSharedValue(reducedMotion ? 1 : 0);
  const iconRotate = useSharedValue(reducedMotion ? 0 : -15);

  useEffect(() => {
    if (reducedMotion) return;
    // Sequential text animations
    titleOpacity.value = withDelay(300, withTiming(1, { duration: 400 }));
    titleScale.value = withDelay(300, withSpring(1, { damping: 10, stiffness: 100 }));
    subtitleOpacity.value = withDelay(600, withTiming(1, { duration: 350 }));
    iconRotate.value = withDelay(
      300,
      withSequence(
        withTiming(15, { duration: 150 }),
        withTiming(-8, { duration: 120 }),
        withTiming(0, { duration: 100 }),
      ),
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ scale: titleScale.value }],
  }));
  const subtitleStyle = useAnimatedStyle(() => ({ opacity: subtitleOpacity.value }));
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${iconRotate.value}deg` }] }));

  const accent = config.accentColor ?? colors.gold;

  const handleFlashComplete = () => {
    setFlashCount((n) => n + 1);
  };

  return (
    <View style={styles.majorOverlay} pointerEvents="none">
      <ParticleSystem
        particleCount={config.particleCount}
        colors={PARTICLE_COLORS}
        accentColor={accent}
        spread={160}
        onComplete={onComplete}
      />
      {/* 3x pulse flashes */}
      {!reducedMotion && flashCount < 3 && (
        <ScreenFlash color={accent} onComplete={handleFlashComplete} />
      )}
      <View style={styles.legendaryContent} pointerEvents="none">
        {config.icon ? (
          <Animated.View style={iconStyle}>
            <Ionicons name={config.icon as any} size={64} color={accent} />
          </Animated.View>
        ) : null}
        {config.title ? (
          <Animated.Text style={[styles.legendaryTitle, { color: colors.textPrimary }, titleStyle]}>
            {config.title}
          </Animated.Text>
        ) : null}
        {config.subtitle ? (
          <Animated.Text style={[styles.legendarySubtitle, { color: colors.textSecondary }, subtitleStyle]}>
            {config.subtitle}
          </Animated.Text>
        ) : null}
      </View>
    </View>
  );
}

// ─── Main CelebrationOverlay ──────────────────────────────────────────────────
export function CelebrationOverlay({ config, visible, onComplete }: CelebrationOverlayProps) {
  const reducedMotion = useReducedMotion();

  if (!visible) return null;

  switch (config.tier) {
    case 'micro':
      // micro is handled inline via useMicroCelebration — no overlay
      return null;

    case 'medium':
      return <MediumOverlay config={config} onComplete={onComplete} reducedMotion={reducedMotion} />;

    case 'major':
      return <MajorOverlay config={config} onComplete={onComplete} reducedMotion={reducedMotion} />;

    case 'legendary':
      return <LegendaryOverlay config={config} onComplete={onComplete} reducedMotion={reducedMotion} />;

    default:
      return null;
  }
}

const styles = StyleSheet.create({
  // Medium
  mediumContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediumTitleWrap: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  mediumTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  // Major
  majorOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  majorCard: {
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    gap: 12,
    minWidth: Math.min(SCREEN_WIDTH * 0.75, 300),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  majorTitle: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  majorSubtitle: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  // Legendary
  legendaryContent: {
    alignItems: 'center',
    gap: 16,
  },
  legendaryTitle: {
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  legendarySubtitle: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
});
