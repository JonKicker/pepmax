/**
 * PersonalizedSummary — shown after BuildingPlan completes.
 * Displays glass cards: calories, macros, training schedule, vision.
 * "Let's Go" CTA finalises onboarding (onboardingComplete: true).
 */
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import type { MacroTargets } from '../../types/profile';

type Props = {
  calories: number;
  macros: MacroTargets;
  trainingDaysPerWeek: number | null;
  twelveWeekVision: string | null;
  onLetsGo: () => void;
};

const VISION_LABELS: Record<string, string> = {
  stronger: 'Noticeably Stronger',
  leaner: 'Visibly Leaner',
  optimized: 'Fully Optimised',
  back_on_track: 'Back on Track',
};

type GlassCardProps = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  children: React.ReactNode;
};

function GlassCard({ title, icon, iconColor, children }: GlassCardProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <Ionicons name={icon} size={20} color={iconColor} />
        <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

export default function PersonalizedSummary({
  calories,
  macros,
  trainingDaysPerWeek,
  twelveWeekVision,
  onLetsGo,
}: Props) {
  const { colors } = useTheme();

  const visionLabel = twelveWeekVision ? VISION_LABELS[twelveWeekVision] ?? twelveWeekVision : 'Your best self';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.hero}>
          <Ionicons name="checkmark-circle" size={48} color={Colors.nutrition} />
          <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
            Your plan is ready! 🎯
          </Text>
          <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
            Here's what we've set up for you
          </Text>
        </View>

        {/* Calories card */}
        <GlassCard title="Daily Calories" icon="flame-outline" iconColor={Colors.cardio}>
          <Text style={[styles.bigNumber, { color: colors.textPrimary }]}>
            {calories.toLocaleString()}
          </Text>
          <Text style={[styles.bigUnit, { color: colors.textSecondary }]}>kcal / day</Text>
        </GlassCard>

        {/* Macros card */}
        <GlassCard title="Macro Targets" icon="nutrition-outline" iconColor={Colors.nutrition}>
          <View style={styles.macroRow}>
            <MacroChip label="Protein" grams={macros.proteinG} color={Colors.cardio} />
            <MacroChip label="Carbs" grams={macros.carbsG} color={Colors.accent} />
            <MacroChip label="Fat" grams={macros.fatG} color={Colors.gold} />
          </View>
        </GlassCard>

        {/* Training schedule card */}
        <GlassCard title="Training Schedule" icon="calendar-outline" iconColor={Colors.gym}>
          <Text style={[styles.scheduleText, { color: colors.textPrimary }]}>
            {trainingDaysPerWeek ? `${trainingDaysPerWeek} days per week` : 'Flexible schedule'}
          </Text>
          <Text style={[styles.scheduleHint, { color: colors.textSecondary }]}>
            Rest days are automatically set as active recovery
          </Text>
        </GlassCard>

        {/* Vision card */}
        <GlassCard title="12-Week Vision" icon="telescope-outline" iconColor={Colors.accent}>
          <Text style={[styles.visionText, { color: colors.textPrimary }]}>
            {visionLabel}
          </Text>
          <Text style={[styles.visionHint, { color: colors.textSecondary }]}>
            We'll check in on your progress every week
          </Text>
        </GlassCard>

        {/* CTA */}
        <TouchableOpacity
          onPress={onLetsGo}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Let's Go"
          style={[styles.cta, { backgroundColor: Colors.accent }]}
        >
          <Text style={styles.ctaText}>Let's Go</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>

        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          Everything can be adjusted in Settings at any time.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function MacroChip({ label, grams, color }: { label: string; grams: number; color: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.macroChip, { backgroundColor: color + '18', borderColor: color + '40' }]}>
      <Text style={[styles.macroG, { color }]}>{grams}g</Text>
      <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {
    padding: 24,
    gap: 16,
    paddingBottom: 40,
  },
  hero: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
  },
  heroSub: {
    fontSize: 14,
    textAlign: 'center',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bigNumber: {
    fontSize: 42,
    fontWeight: '800',
    lineHeight: 50,
  },
  bigUnit: {
    fontSize: 14,
  },
  macroRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  macroChip: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  macroG: {
    fontSize: 20,
    fontWeight: '800',
  },
  macroLabel: {
    fontSize: 12,
  },
  scheduleText: {
    fontSize: 22,
    fontWeight: '700',
  },
  scheduleHint: {
    fontSize: 13,
  },
  visionText: {
    fontSize: 20,
    fontWeight: '700',
  },
  visionHint: {
    fontSize: 13,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 16,
    gap: 8,
    marginTop: 8,
  },
  ctaText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  hint: {
    fontSize: 12,
    textAlign: 'center',
  },
});
