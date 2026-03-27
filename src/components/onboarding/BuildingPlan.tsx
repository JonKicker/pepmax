/**
 * BuildingPlan — animated loading screen shown while saving the profile.
 *
 * Implementation details:
 * - Minimum 4-second display: await Promise.all([saveProfile(), delay(4000)])
 * - Staggered checklist items appear one by one via Reanimated
 * - Progress ring grows from 0 to 100%
 * - Maps activityCategory → numeric multiplier for TDEE calculation
 */
import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  FadeInUp,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
// Import the pure utils we need locally AND re-export for callers
import {
  ACTIVITY_MULTIPLIER,
  getActivityMultiplier,
  delay,
} from '../../utils/quizUtils';
export { ACTIVITY_MULTIPLIER, getActivityMultiplier, delay };

// ── Component ─────────────────────────────────────────────────────────────────
const STEPS = [
  { icon: 'calculator-outline', label: 'Calculating your TDEE' },
  { icon: 'nutrition-outline', label: 'Setting macro targets' },
  { icon: 'calendar-outline', label: 'Building training schedule' },
  { icon: 'heart-outline', label: 'Configuring recovery score' },
  { icon: 'checkmark-circle-outline', label: 'Personalising your dashboard' },
];

type Props = {
  /** Called when save is done. Must resolve when Firestore write completes. */
  onComplete: () => Promise<void>;
};

export default function BuildingPlan({ onComplete }: Props) {
  const { colors } = useTheme();
  const [visibleCount, setVisibleCount] = useState(0);
  const progress = useSharedValue(0);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    // Animate the progress ring from 0 to 1 over 4 s
    progress.value = withTiming(1, { duration: 4000, easing: Easing.out(Easing.cubic) });

    // Stagger checklist items
    const timers: ReturnType<typeof setTimeout>[] = [];
    STEPS.forEach((_, i) => {
      timers.push(
        setTimeout(() => setVisibleCount((c) => Math.max(c, i + 1)), 700 + i * 620),
      );
    });

    // Minimum 4-second display requirement
    // .catch() prevents unhandled rejection — error handling is inside onComplete itself
    Promise.all([onComplete(), delay(4000)])
      .then(() => { /* onComplete navigates away */ })
      .catch((err) => { if (__DEV__) console.error('[BuildingPlan] save failed:', err); });

    return () => timers.forEach(clearTimeout);
  }, []);

  const ringStyle = useAnimatedStyle(() => ({
    // We fake the ring by shrinking a white overlay from full width to 0
    transform: [{ scaleX: 1 - progress.value }],
    opacity: 1 - progress.value * 0.8,
  }));

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.center}>
        {/* Progress ring (simple animated circle) */}
        <View style={styles.ringOuter}>
          <View style={[styles.ringTrack, { borderColor: colors.border }]} />
          <View style={[styles.ringFill, { borderColor: Colors.accent }]} />
          <Animated.View style={[styles.ringMask, { backgroundColor: colors.background }, ringStyle]} />
          <View style={styles.ringCenter}>
            <Ionicons name="flash-outline" size={32} color={Colors.accent} />
          </View>
        </View>

        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Building your plan…
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          This only takes a moment
        </Text>

        {/* Staggered checklist */}
        <View style={styles.list}>
          {STEPS.map((step, i) => {
            if (i >= visibleCount) return null;
            return (
              <Animated.View
                key={step.label}
                entering={FadeInUp.delay(0).duration(350)}
                style={styles.listRow}
              >
                <Ionicons
                  name={i < visibleCount - 1 ? 'checkmark-circle' : (step.icon as keyof typeof Ionicons.glyphMap)}
                  size={20}
                  color={i < visibleCount - 1 ? Colors.nutrition : Colors.accent}
                />
                <Text style={[styles.listText, { color: colors.textPrimary }]}>
                  {step.label}
                </Text>
              </Animated.View>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

const RING_SIZE = 120;

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  ringOuter: {
    width: RING_SIZE,
    height: RING_SIZE,
    marginBottom: 12,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringTrack: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 6,
  },
  ringFill: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 6,
  },
  ringMask: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
  },
  ringCenter: {
    width: RING_SIZE - 20,
    height: RING_SIZE - 20,
    borderRadius: (RING_SIZE - 20) / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    marginTop: -8,
  },
  list: {
    width: '100%',
    gap: 14,
    marginTop: 16,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  listText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
