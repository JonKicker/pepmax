import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import { logWorkout } from '../../../src/services/trainingService';
import { toLocalDateKey } from '../../../src/utils/nutrition';
import type { ExerciseSet } from '../../../src/types/training';

export default function LogWorkoutScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [exerciseName, setExerciseName] = useState('');
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [durationMin, setDurationMin] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const canSave = exerciseName.trim().length > 0 && sets.trim().length > 0 && !saving;

  const handleSave = async () => {
    if (!canSave) return;

    const parsedSets = parseInt(sets, 10);
    if (isNaN(parsedSets) || parsedSets <= 0) {
      Alert.alert('Invalid sets', 'Please enter a valid number of sets.');
      return;
    }

    const exercise: ExerciseSet = {
      name: exerciseName.trim(),
      sets: parsedSets,
      ...(reps.trim() && !isNaN(parseInt(reps, 10)) ? { reps: parseInt(reps, 10) } : {}),
      ...(weightKg.trim() ? { weightKg: parseFloat(weightKg) } : {}),
      ...(durationMin.trim() ? { durationMin: parseFloat(durationMin) } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };

    setSaving(true);
    const result = await logWorkout({
      date: toLocalDateKey(),
      exercises: [exercise],
    });

    if (result.error) {
      Alert.alert('Save failed', 'Could not save workout. Please try again.');
      setSaving(false);
      return;
    }

    router.back();
  };

  const inputStyle = [styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }];
  const labelStyle = [styles.label, { color: colors.textSecondary }];

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Exercise name */}
        <Text style={labelStyle}>Exercise *</Text>
        <TextInput
          style={inputStyle}
          value={exerciseName}
          onChangeText={setExerciseName}
          placeholder="e.g. Bench Press"
          placeholderTextColor={colors.textSecondary}
          autoFocus
          returnKeyType="next"
        />

        {/* Sets + Reps row */}
        <View style={styles.row}>
          <View style={styles.rowItem}>
            <Text style={labelStyle}>Sets *</Text>
            <TextInput
              style={inputStyle}
              value={sets}
              onChangeText={setSets}
              placeholder="3"
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
              returnKeyType="next"
            />
          </View>
          <View style={styles.rowItem}>
            <Text style={labelStyle}>Reps</Text>
            <TextInput
              style={inputStyle}
              value={reps}
              onChangeText={setReps}
              placeholder="10"
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
              returnKeyType="next"
            />
          </View>
        </View>

        {/* Weight + Duration row */}
        <View style={styles.row}>
          <View style={styles.rowItem}>
            <Text style={labelStyle}>Weight (kg)</Text>
            <TextInput
              style={inputStyle}
              value={weightKg}
              onChangeText={setWeightKg}
              placeholder="80"
              placeholderTextColor={colors.textSecondary}
              keyboardType="decimal-pad"
              returnKeyType="next"
            />
          </View>
          <View style={styles.rowItem}>
            <Text style={labelStyle}>Duration (min)</Text>
            <TextInput
              style={inputStyle}
              value={durationMin}
              onChangeText={setDurationMin}
              placeholder="30"
              placeholderTextColor={colors.textSecondary}
              keyboardType="decimal-pad"
              returnKeyType="next"
            />
          </View>
        </View>

        {/* Notes */}
        <Text style={labelStyle}>Notes</Text>
        <TextInput
          style={[inputStyle, styles.notesInput]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Optional notes…"
          placeholderTextColor={colors.textSecondary}
          multiline
          numberOfLines={3}
          returnKeyType="done"
        />

        {/* Save button */}
        <TouchableOpacity
          style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!canSave}
          activeOpacity={0.7}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>Save Workout</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 48 },

  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 16 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
  },
  notesInput: { height: 88, textAlignVertical: 'top', paddingTop: 11 },

  row: { flexDirection: 'row', gap: 12 },
  rowItem: { flex: 1 },

  saveBtn: {
    marginTop: 28,
    backgroundColor: Colors.gym,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
