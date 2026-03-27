/**
 * Screen 2 — Experience Level (single-select aspirational cards)
 */
import { View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/theme';
import { useTheme } from '../../../hooks/useTheme';
import StepContainer from '../StepContainer';
import OptionTile from '../OptionTile';
import type { ExperienceLevel } from '../../../types/profile';

type Props = {
  value: ExperienceLevel | null;
  onChange: (v: ExperienceLevel) => void;
  reduceMotion?: boolean;
};

const OPTIONS: {
  value: ExperienceLevel;
  label: string;
  desc: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { value: 'beginner', label: 'Just Getting Started', desc: 'New to structured training & tracking', icon: 'leaf-outline' },
  { value: 'intermediate', label: 'Building Momentum', desc: 'Consistent for 1–3 years', icon: 'trending-up-outline' },
  { value: 'advanced', label: 'Serious Athlete', desc: 'Experienced and optimising every variable', icon: 'trophy-outline' },
];

export default function ExperienceStep({ value, onChange, reduceMotion }: Props) {
  const { colors } = useTheme();

  function select(v: ExperienceLevel) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(v);
  }

  return (
    <StepContainer
      title="Where are you right now?"
      subtitle="Pick the option that best describes your current level."
      icon={<Ionicons name="person-outline" size={28} color={Colors.accent} />}
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
