/**
 * RankBadge — SVG-based rank emblem for the V2 RP tier system.
 *
 * Renders a shield shape per tier with optional animated glow.
 * Respects useReducedMotion for accessibility.
 */
import React, { useEffect } from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import Svg, { Path, Circle, G } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { getTierForRP, RANK_TIERS_V2 } from '../../utils/rankTierV2';
import type { RankTierV2 } from '../../types/rankV2';

// ─── Size map ────────────────────────────────────────────────────────────────

const SIZE_MAP = {
  sm: 24,
  md: 40,
  lg: 80,
} as const;

type SizeKey = keyof typeof SIZE_MAP;

// ─── Props ───────────────────────────────────────────────────────────────────

type Props = {
  tier: RankTierV2;
  size?: SizeKey;
  glow?: boolean;
  style?: ViewStyle;
};

// ─── Shield path (normalised to 100×100 viewBox) ─────────────────────────────

const SHIELD_PATH =
  'M50 5 L90 20 L90 55 Q90 80 50 95 Q10 80 10 55 L10 20 Z';

// ─── Icon size mapping ────────────────────────────────────────────────────────

function getIconSize(px: number): number {
  if (px <= 24) return 10;
  if (px <= 40) return 16;
  return 32;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function RankBadge({ tier, size = 'md', glow = false, style }: Props) {
  const reducedMotion = useReducedMotion();
  const px = SIZE_MAP[size];

  const tierInfo = RANK_TIERS_V2.find((t) => t.tier === tier) ?? RANK_TIERS_V2[0];
  const glowOpacity = useSharedValue(0.6);

  useEffect(() => {
    if (glow && !reducedMotion) {
      glowOpacity.value = withRepeat(
        withTiming(0.8, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    } else {
      glowOpacity.value = 0.6;
    }
  }, [glow, reducedMotion]); // eslint-disable-line react-hooks/exhaustive-deps

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const iconSize = getIconSize(px);

  return (
    <View style={[styles.container, { width: px, height: px }, style]}>
      {/* Glow halo behind badge */}
      {glow && (
        <Animated.View
          style={[
            styles.glowRing,
            {
              width: px * 1.4,
              height: px * 1.4,
              borderRadius: (px * 1.4) / 2,
              backgroundColor: tierInfo.glowColor,
              top: -(px * 0.2),
              left: -(px * 0.2),
            },
            glowStyle,
          ]}
        />
      )}

      {/* Shield SVG */}
      <Svg width={px} height={px} viewBox="0 0 100 100">
        <Path
          d={SHIELD_PATH}
          fill={tierInfo.color}
          opacity={0.9}
        />
        {/* Inner highlight */}
        <Path
          d={SHIELD_PATH}
          fill="none"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth={3}
        />
      </Svg>

      {/* Tier icon overlay */}
      <View style={[styles.iconOverlay, { width: px, height: px }]}>
        <Ionicons
          name={tierInfo.icon as any}
          size={iconSize}
          color="rgba(255,255,255,0.9)"
        />
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRing: {
    position: 'absolute',
  },
  iconOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
