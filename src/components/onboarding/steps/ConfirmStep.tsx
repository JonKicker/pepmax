/**
 * Screen 15 — Confirm / Recap + "Build My Plan" CTA
 */
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/theme';
import { useTheme } from '../../../hooks/useTheme';
import StepContainer from '../StepContainer';
import type { Goal } from '../../../types/profile';

type QuizSummary = {
  goals: Goal[];
  goalType: 'lose' | 'maintain' | 'gain' | null;
  trainingDaysPerWeek: number | null;
  activityCategory: 'sedentary' | 'light' | 'moderate' | 'active' | null;
  twelveWeekVision: string | null;
};

type Props = {
  summary: QuizSummary;
  reduceMotion?: boolean;
};

const GOAL_LABELS: Record<Goal, string> = {
  training: 'Gym Training',
  nutrition: 'Nutrition',
  cardio: 'Cardio',
  peptides: 'Peptides',
};

const GOAL_TYPE_LABELS: Record<string, string> = {
  lose: 'Fat loss',
  maintain: 'Maintenance',
  gain: 'Muscle gain',
};

const VISION_LABELS: Record<string, string> = {
  stronger: 'Noticeably Stronger',
  leaner: 'Visibly Leaner',
  optimized: 'Fully Optimised',
  back_on_track: 'Back on Track',
};

type RowProps = { icon: keyof typeof Ionicons.glyphMap; label: string; value: string };

function SummaryRow({ icon, label, value }: RowProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={18} color={Colors.accent} />
      <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: colors.textPrimary }]}>{value}</Text>
    </View>
  );
}

export default function ConfirmStep({ summary, reduceMotion }: Props) {
  const { colors } = useTheme();

  const goalString = summary.goals.map((g) => GOAL_LABELS[g]).join(', ') || '—';
  const goalTypeString = summary.goalType ? GOAL_TYPE_LABELS[summary.goalType] : '—';
  const trainingString = summary.trainingDaysPerWeek ? `${summary.trainingDaysPerWeek} days / week` : '—';
  const visionString = summary.twelveWeekVision ? VISION_LABELS[summary.twelveWeekVision] ?? '—' : '—';

  return (
    <StepContainer
      title="You're all set!"
      subtitle="Here's a quick recap before we build your personalised plan."
      icon={<Ionicons name="checkmark-circle-outline" size={28} color={Colors.nutrition} />}
      reduceMotion={reduceMotion}
    >
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <SummaryRow icon="flag-outline" label="Focus" value={goalString} />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SummaryRow icon="navigate-outline" label="Goal" value={goalTypeString} />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SummaryRow icon="calendar-outline" label="Training" value={trainingString} />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SummaryRow icon="telescope-outline" label="Vision" value={visionString} />
      </View>

      <Text style={[styles.cta, { color: colors.textSecondary }]}>
        Tap "Build My Plan" and we'll calculate your calories, macros and schedule.
      </Text>
    </StepContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 10,
  },
  rowLabel: {
    fontSize: 14,
    flex: 1,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
    flexShrink: 1,
    maxWidth: '55%',
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
  },
  cta: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
  },
});
