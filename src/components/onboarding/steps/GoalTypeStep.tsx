/**
 * Screen 5 — Goal Type: lose / maintain / gain (single-select cards)
 */
import { View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/theme';
import { useTheme } from '../../../hooks/useTheme';
import StepContainer from '../StepContainer';
import OptionTile from '../OptionTile';

type GoalType = 'lose' | 'maintain' | 'gain';

type Props = {
  value: GoalType | null;
  onChange: (v: GoalType) => void;
  reduceMotion?: boolean;
};

const OPTIONS: {
  value: GoalType;
  label: string;
  desc: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}[] = [
  { value: 'lose', label: 'Lose Fat', desc: 'Calorie deficit to shed body fat', icon: 'trending-down-outline', color: Colors.cardio },
  { value: 'maintain', label: 'Maintain', desc: 'Eat at maintenance — body recomp focus', icon: 'remove-circle-outline', color: Colors.accent },
  { value: 'gain', label: 'Build Muscle', desc: 'Calorie surplus to fuel muscle growth', icon: 'trending-up-outline', color: Colors.nutrition },
];

export default function GoalTypeStep({ value, onChange, reduceMotion }: Props) {
  const { colors } = useTheme();

  function select(v: GoalType) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(v);
  }

  return (
    <StepContainer
      title="What's your primary goal?"
      subtitle="This sets your calorie target. You can fine-tune it later."
      icon={<Ionicons name="navigate-outline" size={28} color={Colors.accent} />}
      reduceMotion={reduceMotion}
    >
      <View style={{ gap: 10 }}>
        {OPTIONS.map((opt) => (
          <OptionTile
            key={opt.value}
            label={opt.label}
            description={opt.desc}
            icon={<Ionicons name={opt.icon} size={22} color={value === opt.value ? opt.color : colors.textSecondary} />}
            selected={value === opt.value}
            onPress={() => select(opt.value)}
            mode="radio"
            accentColor={opt.color}
          />
        ))}
      </View>
    </StepContainer>
  );
}
