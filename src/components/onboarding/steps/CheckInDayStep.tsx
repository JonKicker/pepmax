/**
 * Screen 13 — Check-in Day (day-of-week pill selector)
 * value is stored as 0 = Sunday … 6 = Saturday.
 * Validated with Math.max(0, Math.min(6, Math.floor(value))).
 */
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/theme';
import { useTheme } from '../../../hooks/useTheme';
import StepContainer from '../StepContainer';
// sanitiseCheckInDay lives in quizUtils (pure, testable); imported and
// re-exported here so the orchestrator can import from a single location.
import { sanitiseCheckInDay } from '../../../utils/quizUtils';
export { sanitiseCheckInDay };

type Props = {
  value: number | null;
  onChange: (v: number) => void;
  reduceMotion?: boolean;
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CheckInDayStep({ value, onChange, reduceMotion }: Props) {
  const { colors } = useTheme();

  function select(dayIndex: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(sanitiseCheckInDay(dayIndex));
  }

  return (
    <StepContainer
      title="Pick your weekly check-in day"
      subtitle="We'll prompt you to review your week and set intentions."
      icon={<Ionicons name="calendar-number-outline" size={28} color={Colors.accent} />}
      reduceMotion={reduceMotion}
    >
      <View style={styles.row}>
        {DAYS.map((day, index) => {
          const selected = value === index;
          return (
            <TouchableOpacity
              key={day}
              onPress={() => select(index)}
              activeOpacity={0.75}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={day}
              style={[
                styles.pill,
                {
                  borderColor: selected ? Colors.accent : colors.border,
                  backgroundColor: selected ? Colors.accent : colors.surface,
                },
              ]}
            >
              <Text style={[styles.pillText, { color: selected ? '#fff' : colors.textPrimary }]}>
                {day}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {value !== null && (
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          Weekly check-in on {DAYS[value]}s
        </Text>
      )}
    </StepContainer>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 4,
    justifyContent: 'center',
  },
  pill: {
    minWidth: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  hint: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
});
