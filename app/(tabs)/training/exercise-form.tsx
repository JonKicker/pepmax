import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import { addCustomExercise } from '../../../src/services/exerciseService';
import type { MuscleGroup, ExerciseCategory, Equipment } from '../../../src/types/exercise';

const MUSCLE_GROUPS: MuscleGroup[] = [
  'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Forearms',
  'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Core', 'Full Body',
];

const CATEGORIES: ExerciseCategory[] = [
  'Compound', 'Isolation', 'Bodyweight', 'Machine', 'Cable', 'Cardio',
];

const EQUIPMENT_OPTIONS: Equipment[] = [
  'Barbell', 'Dumbbell', 'Cable Machine', 'Smith Machine', 'Machine',
  'Bodyweight', 'Kettlebell', 'Resistance Band', 'EZ Bar', 'Pull-up Bar', 'Bench', 'None',
];

export default function ExerciseFormScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [name, setName] = useState('');
  const [category, setCategory] = useState<ExerciseCategory>('Compound');
  const [primaryMuscles, setPrimaryMuscles] = useState<MuscleGroup[]>([]);
  const [secondaryMuscles, setSecondaryMuscles] = useState<MuscleGroup[]>([]);
  const [equipment, setEquipment] = useState<Equipment>('Barbell');
  const [instructions, setInstructions] = useState('');
  const [tips, setTips] = useState<string[]>([]);
  const [newTip, setNewTip] = useState('');
  const [saving, setSaving] = useState(false);

  const toggleMuscle = (muscle: MuscleGroup, type: 'primary' | 'secondary') => {
    const setter = type === 'primary' ? setPrimaryMuscles : setSecondaryMuscles;
    setter((prev) =>
      prev.includes(muscle) ? prev.filter((m) => m !== muscle) : [...prev, muscle],
    );
  };

  const addTip = () => {
    const trimmed = newTip.trim();
    if (trimmed) {
      setTips((prev) => [...prev, trimmed]);
      setNewTip('');
    }
  };

  const removeTip = (index: number) => {
    setTips((prev) => prev.filter((_, i) => i !== index));
  };

  const isValid = name.trim().length > 0 && primaryMuscles.length > 0;

  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true);
    const result = await addCustomExercise({
      name: name.trim(),
      category,
      primaryMuscles,
      secondaryMuscles,
      equipment,
      instructions: instructions.trim(),
      tips,
    });
    setSaving(false);
    if (result.error) {
      Alert.alert('Error', 'Failed to save exercise. Please try again.');
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.back();
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Name */}
        <Text style={[styles.label, { color: colors.textPrimary }]}>Exercise Name *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
          placeholder="e.g. Landmine Press"
          placeholderTextColor={colors.textSecondary}
          value={name}
          onChangeText={setName}
          autoFocus
        />

        {/* Category */}
        <Text style={[styles.label, { color: colors.textPrimary }]}>Category</Text>
        <View style={styles.chipRow}>
          {CATEGORIES.map((c) => {
            const active = category === c;
            return (
              <TouchableOpacity
                key={c}
                onPress={() => setCategory(c)}
                style={[
                  styles.chip,
                  { borderColor: active ? Colors.gym : colors.border },
                  active && { backgroundColor: Colors.gym + '20' },
                ]}
              >
                <Text style={[styles.chipText, { color: active ? Colors.gym : colors.textSecondary }]}>
                  {c}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Primary Muscles */}
        <Text style={[styles.label, { color: colors.textPrimary }]}>Primary Muscles * (at least one)</Text>
        <View style={styles.chipRow}>
          {MUSCLE_GROUPS.map((m) => {
            const active = primaryMuscles.includes(m);
            return (
              <TouchableOpacity
                key={m}
                onPress={() => toggleMuscle(m, 'primary')}
                style={[
                  styles.chip,
                  { borderColor: active ? Colors.gym : colors.border },
                  active && { backgroundColor: Colors.gym + '20' },
                ]}
              >
                <Text style={[styles.chipText, { color: active ? Colors.gym : colors.textSecondary }]}>
                  {m}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Secondary Muscles */}
        <Text style={[styles.label, { color: colors.textPrimary }]}>Secondary Muscles</Text>
        <View style={styles.chipRow}>
          {MUSCLE_GROUPS.map((m) => {
            const active = secondaryMuscles.includes(m);
            return (
              <TouchableOpacity
                key={m}
                onPress={() => toggleMuscle(m, 'secondary')}
                style={[
                  styles.chip,
                  { borderColor: active ? colors.textSecondary : colors.border },
                  active && { backgroundColor: colors.textSecondary + '20' },
                ]}
              >
                <Text style={[styles.chipText, { color: active ? colors.textPrimary : colors.textSecondary }]}>
                  {m}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Equipment */}
        <Text style={[styles.label, { color: colors.textPrimary }]}>Equipment</Text>
        <View style={styles.chipRow}>
          {EQUIPMENT_OPTIONS.map((e) => {
            const active = equipment === e;
            return (
              <TouchableOpacity
                key={e}
                onPress={() => setEquipment(e)}
                style={[
                  styles.chip,
                  { borderColor: active ? Colors.gym : colors.border },
                  active && { backgroundColor: Colors.gym + '20' },
                ]}
              >
                <Text style={[styles.chipText, { color: active ? Colors.gym : colors.textSecondary }]}>
                  {e}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Instructions */}
        <Text style={[styles.label, { color: colors.textPrimary }]}>Instructions</Text>
        <TextInput
          style={[styles.input, styles.multilineInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
          placeholder="How to perform this exercise..."
          placeholderTextColor={colors.textSecondary}
          value={instructions}
          onChangeText={setInstructions}
          multiline
          textAlignVertical="top"
        />

        {/* Tips */}
        <Text style={[styles.label, { color: colors.textPrimary }]}>Tips</Text>
        {tips.map((tip, i) => (
          <View key={i} style={[styles.tipRow, { backgroundColor: colors.surface }]}>
            <Text style={[styles.tipText, { color: colors.textPrimary }]}>• {tip}</Text>
            <TouchableOpacity onPress={() => removeTip(i)}>
              <Ionicons name="close-circle" size={18} color={Colors.error} />
            </TouchableOpacity>
          </View>
        ))}
        <View style={styles.tipInputRow}>
          <TextInput
            style={[styles.input, styles.tipInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
            placeholder="Add a tip..."
            placeholderTextColor={colors.textSecondary}
            value={newTip}
            onChangeText={setNewTip}
            onSubmitEditing={addTip}
          />
          <TouchableOpacity
            onPress={addTip}
            style={[styles.addTipBtn, { backgroundColor: Colors.gym }]}
          >
            <Ionicons name="add" size={20} color="white" />
          </TouchableOpacity>
        </View>

        {/* Save */}
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: isValid ? Colors.gym : colors.border }]}
          onPress={handleSave}
          disabled={!isValid || saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.saveBtnText}>Save Exercise</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  label: { fontSize: 15, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  multilineInput: { minHeight: 80 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontWeight: '600' },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
  },
  tipText: { flex: 1, fontSize: 14, marginRight: 8 },
  tipInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tipInput: { flex: 1 },
  addTipBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
});
