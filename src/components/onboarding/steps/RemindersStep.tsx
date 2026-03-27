/**
 * Screen 14 — Reminders opt-in (two large cards)
 */
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/theme';
import { useTheme } from '../../../hooks/useTheme';
import StepContainer from '../StepContainer';

type Props = {
  value: boolean | null;
  onChange: (v: boolean) => void;
  reduceMotion?: boolean;
};

export default function RemindersStep({ value, onChange, reduceMotion }: Props) {
  const { colors } = useTheme();

  function select(v: boolean) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(v);
  }

  const OPTIONS = [
    {
      val: true,
      label: "Yes, remind me",
      desc: 'Daily check-in, workout nudges & dose reminders',
      icon: 'notifications-outline' as keyof typeof Ionicons.glyphMap,
      color: Colors.accent,
    },
    {
      val: false,
      label: "No thanks",
      desc: "I'll manage my own schedule",
      icon: 'notifications-off-outline' as keyof typeof Ionicons.glyphMap,
      color: colors.textSecondary,
    },
  ];

  return (
    <StepContainer
      title="Stay on track with reminders?"
      subtitle="You can customise or disable these any time in Settings."
      icon={<Ionicons name="notifications-outline" size={28} color={Colors.accent} />}
      reduceMotion={reduceMotion}
    >
      <View style={{ gap: 12 }}>
        {OPTIONS.map((opt) => {
          const selected = value === opt.val;
          return (
            <TouchableOpacity
              key={String(opt.val)}
              onPress={() => select(opt.val)}
              activeOpacity={0.75}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={opt.label}
              style={[
                styles.card,
                {
                  borderColor: selected ? opt.color : colors.border,
                  backgroundColor: selected ? opt.color + '18' : colors.surface,
                },
              ]}
            >
              <Ionicons
                name={opt.icon}
                size={28}
                color={selected ? opt.color : colors.textSecondary}
              />
              <View style={styles.textCol}>
                <Text style={[styles.cardLabel, { color: colors.textPrimary }]}>
                  {opt.label}
                </Text>
                <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
                  {opt.desc}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </StepContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 20,
    gap: 16,
    minHeight: 80,
  },
  textCol: { flex: 1, gap: 4 },
  cardLabel: { fontSize: 16, fontWeight: '700' },
  cardDesc: { fontSize: 13, lineHeight: 18 },
});
