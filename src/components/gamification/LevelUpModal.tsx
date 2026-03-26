/**
 * LevelUpModal — celebratory overlay shown when the user levels up.
 *
 * Features:
 * - Confetti burst using react-native-reanimated animated particles
 * - Haptic feedback (notificationAsync Success) on mount
 * - Auto-dismisses after 3 seconds, or tap to dismiss early
 */
import React, { useEffect, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { ShareButton } from '../sharing/ShareButton';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { getTierForXP } from '../../utils/rankTier';
import type { LevelUpCardData } from '../../types/shareCard';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Deterministic confetti particle config (no random — consistent renders)
const PARTICLES = [
  { x: 0.15, delay: 0,   color: Colors.gold,      size: 10, angle: -30 },
  { x: 0.35, delay: 50,  color: Colors.peptide,   size: 8,  angle: 10  },
  { x: 0.55, delay: 0,   color: Colors.nutrition, size: 12, angle: -15 },
  { x: 0.70, delay: 80,  color: Colors.cardio,    size: 9,  angle: 25  },
  { x: 0.85, delay: 20,  color: Colors.gold,      size: 7,  angle: -40 },
  { x: 0.25, delay: 120, color: Colors.gym,        size: 11, angle: 5   },
  { x: 0.60, delay: 60,  color: '#E74C3C',         size: 8,  angle: -20 },
  { x: 0.80, delay: 100, color: Colors.gold,       size: 10, angle: 35  },
];

function ConfettiParticle({
  x, delay, color, size, angle,
}: { x: number; delay: number; color: string; size: number; angle: number }) {
  const translateY = useSharedValue(-size * 2);
  const opacity = useSharedValue(0);
  const rotate = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withSequence(
        withTiming(-size * 2, { duration: 0 }),
        withTiming(SCREEN_HEIGHT * 0.45, { duration: 900, easing: Easing.out(Easing.quad) }),
      ),
    );
    opacity.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: 100 }),
        withDelay(600, withTiming(0, { duration: 300 })),
      ),
    );
    rotate.value = withDelay(
      delay,
      withTiming(angle * 6, { duration: 900 }),
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
    position: 'absolute',
    left: x * SCREEN_WIDTH - size / 2,
    top: 0,
    width: size,
    height: size,
    borderRadius: size / 4,
    backgroundColor: color,
  }));

  return <Animated.View style={style} />;
}

type Props = {
  level: number | null;
  totalXP: number;
  onDismiss: () => void;
};

export function LevelUpModal({ level, totalXP, onDismiss }: Props) {
  const { colors } = useTheme();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks whether the share sheet is active — pauses auto-dismiss.
  const isSharingRef = useRef(false);

  const badgeScale = useSharedValue(0);
  const badgeOpacity = useSharedValue(0);

  const startDismissTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (!isSharingRef.current) {
        onDismiss();
      }
    }, 3000);
  }, [onDismiss]);

  useEffect(() => {
    if (level == null) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    badgeScale.value = withDelay(300, withSpring(1, { damping: 12, stiffness: 120 }));
    badgeOpacity.value = withDelay(200, withTiming(1, { duration: 300 }));

    startDismissTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [level]); // eslint-disable-line react-hooks/exhaustive-deps

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
    opacity: badgeOpacity.value,
  }));

  if (level == null) return null;

  const tierInfo = getTierForXP(totalXP);
  const shareCardData: LevelUpCardData = {
    type: 'levelUp',
    newLevel: level,
    totalXP,
    rankTier: tierInfo.label,
    rankColor: tierInfo.color,
    rankIcon: tierInfo.icon,
  };

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onDismiss}
      >
        {/* Confetti particles */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {PARTICLES.map((p, i) => (
            <ConfettiParticle key={i} {...p} />
          ))}
        </View>

        {/* Main badge card */}
        <TouchableOpacity activeOpacity={1} onPress={onDismiss}>
          <Animated.View
            style={[
              styles.card,
              badgeStyle,
              { backgroundColor: colors.surface },
            ]}
          >
            <View style={[styles.badgeCircle, { borderColor: Colors.gold }]}>
              <Ionicons name="trophy" size={40} color={Colors.gold} />
            </View>
            <Text style={[styles.levelUpText, { color: colors.textPrimary }]}>
              Level Up!
            </Text>
            <Text style={[styles.levelNumber, { color: Colors.gold }]}>
              {level}
            </Text>
            <View style={styles.shareRow}>
              <ShareButton
                data={shareCardData}
                color={Colors.gold}
                size={20}
                onShareStart={() => { isSharingRef.current = true; }}
                onShareEnd={() => { isSharingRef.current = false; startDismissTimer(); }}
              />
            </View>
            <Text style={[styles.subText, { color: colors.textSecondary }]}>
              Tap to dismiss
            </Text>
          </Animated.View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    gap: 12,
    minWidth: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  badgeCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gold + '18',
  },
  levelUpText: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  levelNumber: {
    fontSize: 56,
    fontWeight: '900',
    lineHeight: 60,
  },
  subText: {
    fontSize: 13,
    marginTop: 4,
  },
  shareRow: {
    marginTop: 4,
  },
});
