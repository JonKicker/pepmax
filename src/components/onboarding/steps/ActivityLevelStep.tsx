/**
 * Screen 8 — Activity Level (single-select cards)
 * Saves activityCategory; the numeric multiplier is derived at save time.
 */
import { View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/theme';
import { useTheme } from '../../../hooks/useTheme';
import StepContainer from '../StepContainer';
import OptionTile from '../OptionTile';
// ActivityCategory defined in quizUtils (pure, testable without React Native)
import type { ActivityCategory } from '../../../utils/quizUtils';
export type { ActivityCategory };

type Props = {
  value: ActivityCategory | null;
  onChange: (v: ActivityCategory) => void;
  reduceMotion?: boolean;
};

const OPTIONS: {
  value: ActivityCategory;
  label: string;
  desc: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    value: 'sedentary',
    label: 'Mostly Desk-Bound',
    desc: 'Office job, very little intentional movement',
    icon: 'desktop-outline',
  },
  {
    value: 'light',
    label: 'Lightly Active',
    desc: 'Walks, light exercise 1–3 days / week',
    icon: 'walk-outline',
  },
  {
    value: 'moderate',
    label: 'Moderately Active',
    desc: 'Consistent exercise 3–5 days / week',
    icon: 'bicycle-outline',
  },
  {
    value: 'active',
    label: 'Very Active',
    desc: 'Hard training 6–7 days / week or physical job',
    icon: 'flash-outline',
  },
];

export default function ActivityLevelStep({ value, onChange, reduceMotion }: Props) {
  const { colors } = useTheme();

  function select(v: ActivityCategory) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(v);
  }

  return (
    <StepContainer
      title="How active are you day-to-day?"
      subtitle="Outside of your planned workouts — think commute, job, lifestyle."
      icon={<Ionicons name="pulse-outline" size={28} color={Colors.accent} />}
      reduceMotion={reduceMotion}
    >
      <View style={{ gap: 10 }}>
        {OPTIONS.map((opt) => (
          <OptionTile
            key={opt.value}
            label={opt.label}
            description={opt.desc}
            icon={<Ionicons name={opt.icon} size={22} color={value === opt.value ? Colors.accent : colors.textSecondary} />}
            selected={value === opt.value}
            onPress={() => select(opt.value)}
            mode="radio"
          />
        ))}
      </View>
    </StepContainer>
  );
}
