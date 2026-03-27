/**
 * Screen 4 — Body Stats (height / weight / age / sex)
 * Unit toggle for input (imperial/metric).
 */
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/theme';
import { useTheme } from '../../../hooks/useTheme';
import StepContainer from '../StepContainer';
import type { Sex, Units } from '../../../types/profile';

export type BodyStats = {
  heightFt: string;
  heightIn: string;
  heightCm: string;
  weightLbs: string;
  weightKg: string;
  age: string;
  sex: Sex | null;
  inputUnits: Units;
};

type Props = {
  stats: BodyStats;
  onChange: <K extends keyof BodyStats>(key: K, value: BodyStats[K]) => void;
  reduceMotion?: boolean;
};

export default function BodyStatsStep({ stats, onChange, reduceMotion }: Props) {
  const { colors } = useTheme();
  const imp = stats.inputUnits === 'imperial';

  function switchUnits(u: Units) {
    Haptics.selectionAsync();
    onChange('inputUnits', u);
  }

  function selectSex(s: Sex) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange('sex', s);
  }

  return (
    <StepContainer
      title="Tell us about yourself"
      subtitle="Used to calculate your personalised calorie target. Stored securely."
      icon={<Ionicons name="body-outline" size={28} color={Colors.accent} />}
      reduceMotion={reduceMotion}
    >
      {/* Unit toggle */}
      <View style={[styles.segRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {(['imperial', 'metric'] as Units[]).map((u) => (
          <TouchableOpacity
            key={u}
            onPress={() => switchUnits(u)}
            accessibilityRole="radio"
            accessibilityState={{ checked: stats.inputUnits === u }}
            style={[
              styles.seg,
              { backgroundColor: stats.inputUnits === u ? Colors.accent : 'transparent' },
            ]}
          >
            <Text style={[styles.segText, { color: stats.inputUnits === u ? '#fff' : colors.textSecondary }]}>
              {u === 'imperial' ? 'Imperial' : 'Metric'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Height */}
      <Text style={[styles.label, { color: colors.textSecondary }]}>Height</Text>
      {imp ? (
        <View style={styles.inlineRow}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary, flex: 1 }]}
            placeholder="ft"
            placeholderTextColor={colors.textSecondary}
            value={stats.heightFt}
            onChangeText={(v) => onChange('heightFt', v)}
            keyboardType="number-pad"
            accessibilityLabel="Height in feet"
          />
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary, flex: 1 }]}
            placeholder="in"
            placeholderTextColor={colors.textSecondary}
            value={stats.heightIn}
            onChangeText={(v) => onChange('heightIn', v)}
            keyboardType="number-pad"
            accessibilityLabel="Height in inches"
          />
        </View>
      ) : (
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
          placeholder="cm"
          placeholderTextColor={colors.textSecondary}
          value={stats.heightCm}
          onChangeText={(v) => onChange('heightCm', v)}
          keyboardType="decimal-pad"
          accessibilityLabel="Height in centimetres"
        />
      )}

      {/* Weight */}
      <Text style={[styles.label, { color: colors.textSecondary }]}>Weight</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
        placeholder={imp ? 'lbs' : 'kg'}
        placeholderTextColor={colors.textSecondary}
        value={imp ? stats.weightLbs : stats.weightKg}
        onChangeText={(v) => onChange(imp ? 'weightLbs' : 'weightKg', v)}
        keyboardType="decimal-pad"
        accessibilityLabel={imp ? 'Weight in pounds' : 'Weight in kilograms'}
      />

      {/* Age */}
      <Text style={[styles.label, { color: colors.textSecondary }]}>Age</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
        placeholder="Years"
        placeholderTextColor={colors.textSecondary}
        value={stats.age}
        onChangeText={(v) => onChange('age', v)}
        keyboardType="number-pad"
        accessibilityLabel="Age in years"
      />

      {/* Biological sex */}
      <Text style={[styles.label, { color: colors.textSecondary }]}>Biological sex</Text>
      <View style={styles.inlineRow}>
        {(['male', 'female'] as Sex[]).map((s) => {
          const selected = stats.sex === s;
          return (
            <TouchableOpacity
              key={s}
              onPress={() => selectSex(s)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              style={[
                styles.sexTile,
                {
                  flex: 1,
                  borderColor: selected ? Colors.accent : colors.border,
                  backgroundColor: selected ? Colors.accent + '18' : colors.surface,
                },
              ]}
            >
              <Text style={[styles.sexLabel, { color: colors.textPrimary }]}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </StepContainer>
  );
}

const styles = StyleSheet.create({
  segRow: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 4,
  },
  seg: {
    flex: 1,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segText: { fontSize: 13, fontWeight: '600' },
  label: { fontSize: 13, fontWeight: '600', marginTop: 6 },
  input: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  inlineRow: { flexDirection: 'row', gap: 10 },
  sexTile: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sexLabel: { fontSize: 15, fontWeight: '600' },
});
