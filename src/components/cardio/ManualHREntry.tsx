import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Colors } from '../../constants/theme';

type Props = {
  onSave: (avgBpm: number, maxBpm: number) => void;
  onSkip: () => void;
};

const MIN_BPM = 40;
const MAX_BPM = 220;

function isValidBpm(val: string): boolean {
  const n = Number(val);
  return Number.isInteger(n) && n >= MIN_BPM && n <= MAX_BPM;
}

export default function ManualHREntry({ onSave, onSkip }: Props) {
  const { colors } = useTheme();
  const [avgStr, setAvgStr] = useState('');
  const [maxStr, setMaxStr] = useState('');
  const [avgError, setAvgError] = useState('');
  const [maxError, setMaxError] = useState('');

  const handleSave = () => {
    let valid = true;
    if (!isValidBpm(avgStr)) {
      setAvgError(`Must be between ${MIN_BPM} and ${MAX_BPM} bpm`);
      valid = false;
    } else {
      setAvgError('');
    }
    if (!isValidBpm(maxStr)) {
      setMaxError(`Must be between ${MIN_BPM} and ${MAX_BPM} bpm`);
      valid = false;
    } else {
      setMaxError('');
    }
    if (!valid) return;
    onSave(Number(avgStr), Number(maxStr));
  };

  const canSave = isValidBpm(avgStr) && isValidBpm(maxStr);

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Add Heart Rate Data</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        No HR monitor was connected. Enter your average and max heart rate, or skip.
      </Text>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Average Heart Rate (bpm)</Text>
        <TextInput
          style={[
            styles.input,
            {
              color: colors.textPrimary,
              borderColor: avgError ? Colors.error : colors.border,
              backgroundColor: colors.background,
            },
          ]}
          value={avgStr}
          onChangeText={(t) => { setAvgStr(t); setAvgError(''); }}
          keyboardType="number-pad"
          placeholder="e.g. 145"
          placeholderTextColor={colors.textSecondary}
          maxLength={3}
          returnKeyType="next"
        />
        {avgError ? (
          <Text style={[styles.errorText, { color: Colors.error }]}>{avgError}</Text>
        ) : null}
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Max Heart Rate (bpm)</Text>
        <TextInput
          style={[
            styles.input,
            {
              color: colors.textPrimary,
              borderColor: maxError ? Colors.error : colors.border,
              backgroundColor: colors.background,
            },
          ]}
          value={maxStr}
          onChangeText={(t) => { setMaxStr(t); setMaxError(''); }}
          keyboardType="number-pad"
          placeholder="e.g. 175"
          placeholderTextColor={colors.textSecondary}
          maxLength={3}
          returnKeyType="done"
        />
        {maxError ? (
          <Text style={[styles.errorText, { color: Colors.error }]}>{maxError}</Text>
        ) : null}
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.skipBtn, { borderColor: colors.border }]}
          onPress={onSkip}
        >
          <Text style={[styles.skipBtnText, { color: colors.textSecondary }]}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: canSave ? Colors.cardio : colors.border }]}
          onPress={handleSave}
          disabled={!canSave}
          activeOpacity={canSave ? 0.8 : 1}
        >
          <Text style={styles.saveBtnText}>Save</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  title: { fontSize: 16, fontWeight: '700' },
  subtitle: { fontSize: 13, lineHeight: 18 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
  },
  errorText: { fontSize: 12 },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  skipBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  skipBtnText: { fontWeight: '600', fontSize: 14 },
  saveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveBtnText: { color: 'white', fontWeight: '700', fontSize: 14 },
});
