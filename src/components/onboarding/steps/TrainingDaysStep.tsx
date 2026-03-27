/**
 * Screen 6 — Training Days Per Week (day-count selector 2–6)
 */
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/theme';
import { useTheme } from '../../../hooks/useTheme';
import StepContainer from '../StepContainer';

type Props = {
  value: number | null;
  onChange: (v: number) => void;
  reduceMotion?: boolean;
};

const DAYS = [2, 3, 4, 5, 6];

const LABELS: Record<number, string> = {
  2: 'Light schedule',
  3: 'Balanced',
  4: 'Committed',
  5: 'High volume',
  6: 'Elite mode',
};

export default function TrainingDaysStep({ value, onChange, reduceMotion }: Props) {
  const { colors } = useTheme();

  function select(d: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(d);
  }

  return (
    <StepContainer
      title="How many days a week do you train?"
      subtitle="This is used to build your weekly schedule and calorie cycling."
      icon={<Ionicons name="calendar-outline" size={28} color={Colors.accent} />}
      reduceMotion={reduceMotion}
    >
      <View style={styles.row}>
        {DAYS.map((d) => {
          const selected = value === d;
          return (
            <TouchableOpacity
              key={d}
              onPress={() => select(d)}
              activeOpacity={0.75}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={`${d} days per week`}
              style={[
                styles.pill,
                {
                  borderColor: selected ? Colors.accent : colors.border,
                  backgroundColor: selected ? Colors.accent : colors.surface,
                },
              ]}
            >
              <Text style={[styles.pillNum, { color: selected ? '#fff' : colors.textPrimary }]}>
                {d}
              </Text>
              <Text style={[styles.pillSub, { color: selected ? '#ffffffCC' : colors.textSecondary }]}>
                days
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {value !== null && (
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {LABELS[value]} — {value} training {value === 1 ? 'day' : 'days'} / week
        </Text>
      )}
    </StepContainer>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  pill: {
    flex: 1,
    minWidth: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 16,
    gap: 2,
  },
  pillNum: {
    fontSize: 22,
    fontWeight: '800',
  },
  pillSub: {
    fontSize: 11,
    fontWeight: '500',
  },
  label: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
});
