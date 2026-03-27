/**
 * ParticleSystem — Reanimated 4 radial particle burst.
 * Deterministic angles: i * (360 / count).
 * Max 40 particles enforced via clamp.
 * Returns null when reduceMotion is enabled.
 */
import React, { useMemo, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const MAX_PARTICLES = 40;

type ParticleSystemProps = {
  particleCount: number;
  colors: string[];
  accentColor?: string;
  /** Max travel distance from center in px */
  spread?: number;
  onComplete?: () => void;
};

type ParticleDef = {
  index: number;
  angle: number;
  dx: number;
  dy: number;
  color: string;
  size: number;
  delay: number;
};

function SingleParticle({ def, spread, onComplete }: { def: ParticleDef; spread: number; onComplete?: () => void }) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    const tx = def.dx * spread;
    const ty = def.dy * spread;

    opacity.value = withDelay(
      def.delay,
      withSequence(
        withTiming(1, { duration: 80 }),
        withTiming(0, { duration: 420, easing: Easing.out(Easing.ease) }),
      ),
    );
    translateX.value = withDelay(
      def.delay,
      withTiming(tx, { duration: 500, easing: Easing.out(Easing.cubic) }),
    );
    translateY.value = withDelay(
      def.delay,
      withTiming(ty, { duration: 500, easing: Easing.out(Easing.cubic) }),
    );
    scale.value = withDelay(
      def.delay,
      withTiming(0.3, { duration: 500, easing: Easing.out(Easing.ease) }, () => {
        if (onComplete) {
          runOnJS(onComplete)();
        }
      }),
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: def.size,
          height: def.size,
          borderRadius: def.size / 2,
          backgroundColor: def.color,
        },
        animStyle,
      ]}
    />
  );
}

export function ParticleSystem({ particleCount, colors, accentColor, spread = 80, onComplete }: ParticleSystemProps) {
  const reducedMotion = useReducedMotion();

  const clampedCount = Math.min(particleCount, MAX_PARTICLES);

  const particles = useMemo<ParticleDef[]>(() => {
    if (clampedCount === 0) return [];
    const palette = accentColor ? [accentColor, ...colors] : colors;
    return Array.from({ length: clampedCount }, (_, i) => {
      const angleDeg = i * (360 / clampedCount);
      const rad = (angleDeg * Math.PI) / 180;
      return {
        index: i,
        angle: angleDeg,
        dx: Math.cos(rad),
        dy: Math.sin(rad),
        color: palette[i % palette.length],
        size: 6 + (i % 3) * 2,   // 6, 8, or 10px — deterministic
        delay: (i % 4) * 30,      // 0, 30, 60, 90ms stagger
      };
    });
  }, [clampedCount, colors, accentColor]);

  // Reduced motion: skip entirely
  if (reducedMotion) return null;
  if (clampedCount === 0) return null;

  // Only call onComplete once — from last particle
  const lastIdx = particles.length - 1;

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.map((p, i) => (
        <SingleParticle
          key={p.index}
          def={p}
          spread={spread}
          onComplete={i === lastIdx ? onComplete : undefined}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  particle: {
    position: 'absolute',
  },
});
