/**
 * Screen 9 — Challenges (multi-select chips)
 * "What gets in the way of your goals?"
 */
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/theme';
import { useTheme } from '../../../hooks/useTheme';
import StepContainer from '../StepContainer';

type Props = {
  selected: string[];
  onChange: (v: string[]) => void;
  reduceMotion?: boolean;
};

const CHALLENGES = [
  'Inconsistent eating',
  'Busy schedule',
  'Low energy',
  'Stress / sleep',
  'No gym access',
  'Motivation dips',
  'Plateau / stalled progress',
  'Tracking is tedious',
  'Injury',
  'Social eating',
];

export default function ChallengesStep({ selected, onChange, reduceMotion }: Props) {
  const { colors } = useTheme();

  function toggle(c: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (selected.includes(c)) {
      onChange(selected.filter((x) => x !== c));
    } else {
      onChange([...selected, c]);
    }
  }

  return (
    <StepContainer
      title="What gets in your way?"
      subtitle="Select any that apply — we'll tailor coaching around these."
      icon={<Ionicons name="warning-outline" size={28} color={Colors.accent} />}
      reduceMotion={reduceMotion}
    >
      <View style={styles.chipWrap}>
        {CHALLENGES.map((c) => {
          const isSelected = selected.includes(c);
          return (
            <TouchableOpacity
              key={c}
              onPress={() => toggle(c)}
              activeOpacity={0.75}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={c}
              style={[
                styles.chip,
                {
                  borderColor: isSelected ? Colors.accent : colors.border,
                  backgroundColor: isSelected ? Colors.accent + '18' : colors.surface,
                },
              ]}
            >
              <Text style={[styles.chipText, { color: isSelected ? Colors.accent : colors.textPrimary }]}>
                {c}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={[styles.hint, { color: colors.textSecondary }]}>
        {selected.length === 0 ? 'Optional — tap any that apply' : `${selected.length} selected`}
      </Text>
    </StepContainer>
  );
}

const styles = StyleSheet.create({
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  chip: {
    borderRadius: 20,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  hint: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
});
