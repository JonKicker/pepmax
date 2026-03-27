/**
 * Screen 7 — Preferred training time (single-select cards)
 */
import { View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/theme';
import { useTheme } from '../../../hooks/useTheme';
import StepContainer from '../StepContainer';
import OptionTile from '../OptionTile';

type TrainTime = 'morning' | 'midday' | 'afternoon' | 'evening' | 'varies';

type Props = {
  value: TrainTime | null;
  onChange: (v: TrainTime) => void;
  reduceMotion?: boolean;
};

const OPTIONS: {
  value: TrainTime;
  label: string;
  desc: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { value: 'morning', label: 'Morning', desc: 'Before 10 am — fasted or light breakfast', icon: 'sunny-outline' },
  { value: 'midday', label: 'Midday', desc: '10 am–2 pm — lunch-break lifter', icon: 'partly-sunny-outline' },
  { value: 'afternoon', label: 'Afternoon', desc: '2–6 pm — post-work warmup', icon: 'cloudy-outline' },
  { value: 'evening', label: 'Evening', desc: 'After 6 pm — night owl', icon: 'moon-outline' },
  { value: 'varies', label: 'It varies', desc: 'My schedule changes week to week', icon: 'shuffle-outline' },
];

export default function TrainTimeStep({ value, onChange, reduceMotion }: Props) {
  const { colors } = useTheme();

  function select(v: TrainTime) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(v);
  }

  return (
    <StepContainer
      title="When do you usually train?"
      subtitle="Helps us schedule notifications at the right time."
      icon={<Ionicons name="time-outline" size={28} color={Colors.accent} />}
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
