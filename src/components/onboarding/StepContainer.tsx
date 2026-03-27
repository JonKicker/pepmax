/**
 * StepContainer — shared wrapper for every quiz step.
 *
 * Provides:
 * - Animated enter/exit via Reanimated (FadeInRight / FadeOutLeft or instant
 *   when reduceMotion is true)
 * - Consistent padding, title/subtitle/icon layout
 * - accessibilityLiveRegion so screen readers announce step changes
 */
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  FadeInRight,
  FadeOutLeft,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { useTheme } from '../../hooks/useTheme';

type Props = {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  /** If true, skip animations (AccessibilityInfo.isReduceMotionEnabled) */
  reduceMotion?: boolean;
};

export default function StepContainer({
  title,
  subtitle,
  icon,
  children,
  reduceMotion = false,
}: Props) {
  const { colors } = useTheme();

  const entering = reduceMotion ? FadeIn.duration(50) : FadeInRight.duration(280).springify();
  const exiting = reduceMotion ? FadeOut.duration(50) : FadeOutLeft.duration(220);

  return (
    <Animated.View
      entering={entering}
      exiting={exiting}
      // accessibilityLiveRegion="polite" announces the title when step changes
      accessibilityLiveRegion="polite"
      style={styles.container}
    >
      {icon && <View style={styles.iconRow}>{icon}</View>}

      <Text
        style={[styles.title, { color: colors.textPrimary }]}
        accessibilityRole="header"
      >
        {title}
      </Text>

      {subtitle ? (
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {subtitle}
        </Text>
      ) : null}

      <View style={styles.content}>{children}</View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  iconRow: {
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  content: {
    gap: 10,
    marginTop: 8,
  },
});
