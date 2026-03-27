/**
 * Screen 12 — Personal Goal Note (free text, optional, max 100 chars)
 */
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/theme';
import { useTheme } from '../../../hooks/useTheme';
import { sanitisePersonalNote } from '../../../utils/quizUtils';
import StepContainer from '../StepContainer';

const MAX_CHARS = 100;

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSkip: () => void;
  reduceMotion?: boolean;
};

export default function PersonalNoteStep({ value, onChange, onSkip, reduceMotion }: Props) {
  const { colors } = useTheme();
  const remaining = MAX_CHARS - value.length;

  function handleChange(text: string) {
    // Sanitise on every keystroke so the user sees exactly what will be saved
    // (strips control chars, trims, caps at 100 chars)
    const clean = sanitisePersonalNote(text);
    onChange(clean);
  }

  function handleSkip() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSkip();
  }

  return (
    <StepContainer
      title="In your own words…"
      subtitle="What does success look like for you? (Optional)"
      icon={<Ionicons name="create-outline" size={28} color={Colors.accent} />}
      reduceMotion={reduceMotion}
    >
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.surface,
            borderColor: value.length > 0 ? Colors.accent + '80' : colors.border,
            color: colors.textPrimary,
          },
        ]}
        placeholder="e.g. I want to feel confident in a t-shirt by summer…"
        placeholderTextColor={colors.textSecondary}
        value={value}
        onChangeText={handleChange}
        multiline={false}
        numberOfLines={2}
        textAlignVertical="top"
        accessibilityLabel="Personal goal note"
        accessibilityHint="Optional, maximum 100 characters"
      />

      <View style={styles.row}>
        <Text style={[styles.counter, { color: remaining < 10 ? Colors.error : colors.textSecondary }]}>
          {remaining} chars left
        </Text>
        <TouchableOpacity onPress={handleSkip} accessibilityRole="button" accessibilityLabel="Skip this step">
          <Text style={[styles.skip, { color: colors.textSecondary }]}>Skip →</Text>
        </TouchableOpacity>
      </View>
    </StepContainer>
  );
}

const styles = StyleSheet.create({
  input: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 16,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 120,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  counter: {
    fontSize: 12,
  },
  skip: {
    fontSize: 13,
    fontWeight: '600',
  },
});
