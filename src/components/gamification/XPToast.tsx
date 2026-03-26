/**
 * XPToast — floating "+25 XP" notification that slides in from the top,
 * holds for 1.5 seconds, then slides back out.
 *
 * Rendered by GamificationContext.tsx at the root of the app so it can
 * appear over any screen. Processes a queue sequentially with a 200ms gap.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { Colors } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';

const SOURCE_LABELS: Record<string, string> = {
  log_dose: 'Injection logged',
  complete_workout: 'Workout complete',
  complete_workout_bare: 'Bare minimum workout',
  log_all_meals: 'All meals logged',
  macro_targets_hit: 'Macro targets hit',
  complete_cardio: 'Cardio complete',
  personal_record: 'Personal record!',
  streak_milestone: '7-day streak!',
  recovery_checkin: 'Morning check-in',
  achievement_bonus: 'Achievement unlocked!',
  quest_complete: 'Quest complete!',
  quest_bonus: 'All quests done!',
};

export type ToastItem = {
  id: string;
  amount: number;
  source: string;
};

type Props = {
  item: ToastItem | null;
  onDismissed: () => void;
};

export function XPToast({ item, onDismissed }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const translateY = useSharedValue(-80);
  const opacity = useSharedValue(0);
  const dismissedRef = useRef(false);

  useEffect(() => {
    if (!item) return;
    dismissedRef.current = false;

    const dismiss = () => {
      if (!dismissedRef.current) {
        dismissedRef.current = true;
        onDismissed();
      }
    };

    // Slide in (200ms) → hold (1500ms) → slide out (200ms) → notify parent
    translateY.value = withSequence(
      withTiming(-80, { duration: 0 }),
      withTiming(0, { duration: 200, easing: Easing.out(Easing.back(1.2)) }),
      withDelay(1500, withTiming(-80, { duration: 200, easing: Easing.in(Easing.quad) })),
    );
    opacity.value = withSequence(
      withTiming(0, { duration: 0 }),
      withTiming(1, { duration: 150 }),
      withDelay(1550, withTiming(0, { duration: 200, easing: Easing.in(Easing.quad) }, () => {
        runOnJS(dismiss)();
      })),
    );
  }, [item?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!item) return null;

  const label = SOURCE_LABELS[item.source] ?? item.source;

  return (
    <Animated.View
      style={[
        styles.toast,
        animStyle,
        {
          top: insets.top + 8,
          backgroundColor: colors.surface,
          shadowColor: '#000',
        },
      ]}
      pointerEvents="none"
    >
      <Text style={styles.amount}>+{item.amount} XP</Text>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 9999,
  },
  amount: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.gold,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
});
