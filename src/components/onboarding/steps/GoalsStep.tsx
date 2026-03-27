/**
 * Screen 1 — Goals (multi-select)
 * "What are you using PepMax for?"
 */
import { View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/theme';
import { useTheme } from '../../../hooks/useTheme';
import StepContainer from '../StepContainer';
import OptionTile from '../OptionTile';
import type { Goal } from '../../../types/profile';

type Props = {
  goals: Goal[];
  onChange: (goals: Goal[]) => void;
  reduceMotion?: boolean;
};

const OPTIONS: {
  value: Goal;
  label: string;
  desc: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}[] = [
  { value: 'training', label: 'Gym Training', desc: 'Log workouts, PRs & strength progress', icon: 'barbell-outline', color: Colors.gym },
  { value: 'nutrition', label: 'Nutrition', desc: 'Track calories, macros & meals', icon: 'nutrition-outline', color: Colors.nutrition },
  { value: 'cardio', label: 'Cardio / Running', desc: 'GPS runs, zones & pace tracking', icon: 'bicycle-outline', color: Colors.cardio },
  { value: 'peptides', label: 'Peptide Tracking', desc: 'Dose logs, cycles & half-life timeline', icon: 'flask-outline', color: Colors.peptide },
];

export default function GoalsStep({ goals, onChange, reduceMotion }: Props) {
  const { colors } = useTheme();

  function toggle(goal: Goal) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (goals.includes(goal)) {
      onChange(goals.filter((g) => g !== goal));
    } else {
      onChange([...goals, goal]);
    }
  }

  return (
    <StepContainer
      title="What are you here for?"
      subtitle="Select everything that applies — you can change this later."
      icon={<Ionicons name="rocket-outline" size={28} color={Colors.accent} />}
      reduceMotion={reduceMotion}
    >
      <View style={{ gap: 10 }}>
        {OPTIONS.map((opt) => (
          <OptionTile
            key={opt.value}
            label={opt.label}
            description={opt.desc}
            icon={<Ionicons name={opt.icon} size={22} color={goals.includes(opt.value) ? opt.color : colors.textSecondary} />}
            selected={goals.includes(opt.value)}
            onPress={() => toggle(opt.value)}
            mode="checkbox"
            accentColor={opt.color}
          />
        ))}
      </View>
    </StepContainer>
  );
}
