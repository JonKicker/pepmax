/**
 * Screen 11 — Recovery Priority (single-select)
 * CONDITIONAL: skipped when user selected neither 'training' nor 'cardio' in goals.
 */
import { View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/theme';
import { useTheme } from '../../../hooks/useTheme';
import StepContainer from '../StepContainer';
import OptionTile from '../OptionTile';

type RecoveryPriority = 'high' | 'medium' | 'low';

type Props = {
  value: RecoveryPriority | null;
  onChange: (v: RecoveryPriority) => void;
  reduceMotion?: boolean;
};

const OPTIONS: {
  value: RecoveryPriority;
  label: string;
  desc: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}[] = [
  {
    value: 'high',
    label: 'Top Priority',
    desc: 'I push hard — recovery is the limiting factor',
    icon: 'bed-outline',
    color: Colors.recovery,
  },
  {
    value: 'medium',
    label: 'Important but balanced',
    desc: 'I manage it well but could improve',
    icon: 'heart-outline',
    color: Colors.accent,
  },
  {
    value: 'low',
    label: 'Not my main focus',
    desc: 'Just want basic guidance for now',
    icon: 'remove-circle-outline',
    color: Colors.nutrition,
  },
];

export default function RecoveryStep({ value, onChange, reduceMotion }: Props) {
  const { colors } = useTheme();

  function select(v: RecoveryPriority) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(v);
  }

  return (
    <StepContainer
      title="How important is recovery to you?"
      subtitle="We use this to tune your Recovery Readiness score and daily check-ins."
      icon={<Ionicons name="bed-outline" size={28} color={Colors.recovery} />}
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
