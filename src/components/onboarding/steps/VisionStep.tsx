/**
 * Screen 10 — 12-Week Vision (aspirational identity cards)
 */
import { View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/theme';
import { useTheme } from '../../../hooks/useTheme';
import StepContainer from '../StepContainer';
import OptionTile from '../OptionTile';

type Vision = 'stronger' | 'leaner' | 'optimized' | 'back_on_track';

type Props = {
  value: Vision | null;
  onChange: (v: Vision) => void;
  reduceMotion?: boolean;
};

const OPTIONS: {
  value: Vision;
  label: string;
  desc: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}[] = [
  {
    value: 'stronger',
    label: 'Noticeably Stronger',
    desc: 'Hit new PRs and add real muscle',
    icon: 'barbell-outline',
    color: Colors.gym,
  },
  {
    value: 'leaner',
    label: 'Visibly Leaner',
    desc: 'Drop body fat and see more definition',
    icon: 'flame-outline',
    color: Colors.cardio,
  },
  {
    value: 'optimized',
    label: 'Fully Optimised',
    desc: 'Peak performance — sleep, recovery, nutrition, training dialled in',
    icon: 'analytics-outline',
    color: Colors.accent,
  },
  {
    value: 'back_on_track',
    label: 'Back on Track',
    desc: 'Re-build consistency after a break',
    icon: 'refresh-outline',
    color: Colors.nutrition,
  },
];

export default function VisionStep({ value, onChange, reduceMotion }: Props) {
  const { colors } = useTheme();

  function select(v: Vision) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onChange(v);
  }

  return (
    <StepContainer
      title="12 weeks from now…"
      subtitle="Picture your best-case result. Which one resonates most?"
      icon={<Ionicons name="telescope-outline" size={28} color={Colors.accent} />}
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
