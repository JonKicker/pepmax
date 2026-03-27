/**
 * SuccessBurst — animated checkmark + confetti particle burst.
 *
 * RAY MANDATORY #1: default color uses colors.gold from useTheme(), not static import.
 * RAY ADVISORY A: particles are a module-level constant array (deterministic).
 */
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { Colors } from '../../constants/theme';

// ─── RAY ADVISORY A: module-level constant particle array ─────────────────────
type ParticleDef = {
  id: number;
  color: string;
  angle: number;   // degrees
  distance: number;
  delay: number;
  size: number;
};

// Decorative particle palette — intentionally not theme-responsive (module-level constant).
// All colors use theme token constants where available.
export const PARTICLES: ParticleDef[] = [
  { id: 0, color: Colors.gold,      angle: 0,   distance: 60, delay: 0,   size: 8 },
  { id: 1, color: Colors.cardio,    angle: 45,  distance: 70, delay: 40,  size: 6 },
  { id: 2, color: Colors.accent,    angle: 90,  distance: 65, delay: 80,  size: 7 },
  { id: 3, color: Colors.nutrition, angle: 135, distance: 72, delay: 20,  size: 5 },
  { id: 4, color: Colors.gym,       angle: 180, distance: 68, delay: 60,  size: 8 },
  { id: 5, color: Colors.warning,   angle: 225, distance: 62, delay: 100, size: 6 },
  { id: 6, color: Colors.teal,      angle: 270, distance: 74, delay: 30,  size: 7 },
  { id: 7, color: Colors.gold,      angle: 315, distance: 58, delay: 70,  size: 5 },
];

// ─── Single Particle ──────────────────────────────────────────────────────────
type ParticleProps = {
  def: ParticleDef;
  visible: boolean;
};

function Particle({ def, visible, reducedMotion }: ParticleProps & { reducedMotion: boolean }) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (!visible) {
      translateX.value = 0;
      translateY.value = 0;
      opacity.value = 0;
      rotation.value = 0;
      return;
    }

    // RAY MANDATORY: skip particle animations when reduce motion is on
    if (reducedMotion) {
      opacity.value = 0;
      return;
    }

    const rad = (def.angle * Math.PI) / 180;
    const dx = Math.cos(rad) * def.distance;
    const dy = Math.sin(rad) * def.distance;

    opacity.value = withDelay(
      def.delay,
      withSequence(
        withTiming(1, { duration: 100 }),
        withTiming(0, { duration: 400, easing: Easing.out(Easing.ease) }),
      ),
    );
    translateX.value = withDelay(
      def.delay,
      withTiming(dx, { duration: 500, easing: Easing.out(Easing.cubic) }),
    );
    translateY.value = withDelay(
      def.delay,
      withTiming(dy, { duration: 500, easing: Easing.out(Easing.cubic) }),
    );
    rotation.value = withDelay(
      def.delay,
      withTiming(360, { duration: 500, easing: Easing.out(Easing.ease) }),
    );
  }, [visible, reducedMotion]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotation.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        { width: def.size, height: def.size, backgroundColor: def.color, borderRadius: def.size / 2 },
        animStyle,
      ]}
    />
  );
}

// ─── SuccessBurst ─────────────────────────────────────────────────────────────
type SuccessBurstProps = {
  visible: boolean;
  /** Override icon color — defaults to colors.gold from theme */
  color?: string;
  size?: number;
};

export function SuccessBurst({ visible, color, size = 56 }: SuccessBurstProps) {
  // RAY MANDATORY #1: default color from useTheme().colors.gold
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const resolvedColor = color ?? colors.gold;

  const badgeScale = useSharedValue(reducedMotion ? 1 : 0);
  const badgeOpacity = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) {
      // Skip animations — show result immediately
      badgeScale.value = visible ? 1 : 0;
      badgeOpacity.value = visible ? 1 : 0;
      return;
    }
    if (visible) {
      badgeOpacity.value = withTiming(1, { duration: 100 });
      // LevelUpModal pattern: withSpring(1, {damping:12, stiffness:120})
      badgeScale.value = withSpring(1, { damping: 12, stiffness: 120 });
    } else {
      badgeScale.value = withTiming(0, { duration: 200 });
      badgeOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible, reducedMotion]);

  const badgeAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
    opacity: badgeOpacity.value,
  }));

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Particles */}
      {PARTICLES.map((p) => (
        <Particle key={p.id} def={p} visible={visible} reducedMotion={reducedMotion} />
      ))}

      {/* Checkmark badge */}
      <Animated.View style={[styles.badge, { width: size, height: size, borderRadius: size / 2, backgroundColor: resolvedColor }, badgeAnimStyle]}>
        <Ionicons name="checkmark" size={size * 0.55} color="white" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  particle: {
    position: 'absolute',
  },
});
