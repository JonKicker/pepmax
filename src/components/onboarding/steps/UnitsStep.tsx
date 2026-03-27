/**
 * Screen 3 — Unit preference (two large toggle buttons)
 * Auto-defaults to 'imperial' (locale detection can be added later).
 */
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/theme';
import { useTheme } from '../../../hooks/useTheme';
import StepContainer from '../StepContainer';
import type { Units } from '../../../types/profile';

type Props = {
  value: Units | null;
  onChange: (v: Units) => void;
  reduceMotion?: boolean;
};

const OPTIONS: { value: Units; label: string; detail: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'imperial', label: 'Imperial', detail: 'lbs · ft · miles · °F', icon: 'flag-outline' },
  { value: 'metric', label: 'Metric', detail: 'kg · cm · km · °C', icon: 'earth-outline' },
];

export default function UnitsStep({ value, onChange, reduceMotion }: Props) {
  const { colors } = useTheme();

  function select(v: Units) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(v);
  }

  return (
    <StepContainer
      title="Which units do you prefer?"
      subtitle="You can switch anytime in Settings."
      icon={<Ionicons name="swap-horizontal-outline" size={28} color={Colors.accent} />}
      reduceMotion={reduceMotion}
    >
      <View style={styles.row}>
        {OPTIONS.map((opt) => {
          const selected = value === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              onPress={() => select(opt.value)}
              activeOpacity={0.75}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={opt.label}
              style={[
                styles.bigTile,
                {
                  borderColor: selected ? Colors.accent : colors.border,
                  backgroundColor: selected ? Colors.accent + '18' : colors.surface,
                },
              ]}
            >
              <Ionicons
                name={opt.icon}
                size={32}
                color={selected ? Colors.accent : colors.textSecondary}
              />
              <Text style={[styles.tileLabel, { color: colors.textPrimary }]}>
                {opt.label}
              </Text>
              <Text style={[styles.tileDetail, { color: colors.textSecondary }]}>
                {opt.detail}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </StepContainer>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  bigTile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: 28,
    paddingHorizontal: 12,
    gap: 8,
    minHeight: 130,
  },
  tileLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  tileDetail: {
    fontSize: 12,
    textAlign: 'center',
  },
});
