import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../src/hooks/useTheme';
import { analytics, AnalyticsEvent } from '../../../src/services/analytics';
import { Colors } from '../../../src/constants/theme';
import { useExercisePicker } from '../../../src/contexts/ExercisePickerContext';
import { useExerciseLibrary } from '../../../src/hooks/useExerciseLibrary';
import {
  getTemplateById,
  saveTemplate,
  updateTemplate,
  computeEstimatedDuration,
  computeMuscleGroups,
} from '../../../src/services/templateService';
import { TEMPLATE_COLORS, type TemplateExercise, type WorkoutTemplateInput } from '../../../src/types/template';
import type { Exercise } from '../../../src/types/exercise';
import { TemplateExerciseRow } from '../../../src/components/training/TemplateExerciseRow';

export default function TemplateBuilderScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { templateId } = useLocalSearchParams<{ templateId?: string }>();
  const isEdit = !!templateId;
  const picker = useExercisePicker();
  const { allExercises } = useExerciseLibrary();

  const [name, setName] = useState('');
  const [color, setColor] = useState(TEMPLATE_COLORS[0]);
  const [exercises, setExercises] = useState<TemplateExercise[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  // Load existing template for edit mode
  useEffect(() => {
    if (!templateId) return;
    (async () => {
      const result = await getTemplateById(templateId);
      if (!result.error && result.data) {
        setName(result.data.name);
        setColor(result.data.color || TEMPLATE_COLORS[0]);
        setExercises(result.data.exercises || []);
      }
      setLoading(false);
    })();
  }, [templateId]);

  // Picker callback: add exercise from library
  const handlePickExercise = useCallback(
    (exercise: Exercise) => {
      setExercises((prev) => [
        ...prev,
        {
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          order: prev.length,
          targetSets: 3,
          targetReps: '8-12',
          restSeconds: 90,
        },
      ]);
    },
    [],
  );

  const openPicker = () => {
    const pickedIds = new Set(exercises.map((e) => e.exerciseId));
    picker.setPickerCallback(handlePickExercise, pickedIds);
    router.push({ pathname: '/(tabs)/training/exercises', params: { mode: 'picker' } });
  };

  // Exercise manipulation
  const updateExercise = (index: number, update: Partial<TemplateExercise>) => {
    setExercises((prev) =>
      prev.map((e, i) => (i === index ? { ...e, ...update } : e)),
    );
  };

  const removeExercise = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExercises((prev) =>
      prev.filter((_, i) => i !== index).map((e, i) => ({ ...e, order: i })),
    );
  };

  const moveExercise = (index: number, direction: 'up' | 'down') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExercises((prev) => {
      const arr = [...prev];
      const targetIdx = direction === 'up' ? index - 1 : index + 1;
      if (targetIdx < 0 || targetIdx >= arr.length) return prev;
      [arr[index], arr[targetIdx]] = [arr[targetIdx], arr[index]];
      return arr.map((e, i) => ({ ...e, order: i }));
    });
  };

  const toggleSuperset = (index: number) => {
    if (index === 0) return;
    setExercises((prev) => {
      const arr = [...prev];
      const above = arr[index - 1];
      const current = arr[index];
      if (current.supersetGroup != null) {
        // Unlink
        arr[index] = { ...current, supersetGroup: undefined };
      } else {
        // Link with the exercise above
        const group = above.supersetGroup ?? index;
        arr[index - 1] = { ...above, supersetGroup: group };
        arr[index] = { ...current, supersetGroup: group };
      }
      return arr;
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  // Save
  const isValid = name.trim().length > 0 && exercises.length > 0;

  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true);
    const muscleGroups = computeMuscleGroups(exercises, allExercises);
    const estimatedDuration = computeEstimatedDuration(exercises);

    const input: WorkoutTemplateInput = {
      name: name.trim(),
      color,
      exercises,
      muscleGroups,
      estimatedDuration,
    };

    const result = isEdit
      ? await updateTemplate(templateId!, input)
      : await saveTemplate(input);

    setSaving(false);
    if (result.error) {
      Alert.alert('Error', 'Failed to save template. Please try again.');
    } else {
      if (!isEdit) {
        analytics.track(AnalyticsEvent.TEMPLATE_CREATED, {
          exercise_count: exercises.length,
          estimated_duration: input.estimatedDuration,
        });
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.back();
    }
  };

  // Superset grouping visual
  const supersetColors = useMemo(() => {
    const groupColors: Record<number, string> = {};
    const palette = ['#E74C3C', '#3498DB', '#2ECC71', '#F39C12', '#9B59B6'];
    let ci = 0;
    for (const ex of exercises) {
      if (ex.supersetGroup != null && !(ex.supersetGroup in groupColors)) {
        groupColors[ex.supersetGroup] = palette[ci % palette.length];
        ci++;
      }
    }
    return groupColors;
  }, [exercises]);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={Colors.gym} size="large" />
      </View>
    );
  }

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
        {/* Template Name */}
        <Text style={[styles.label, { color: colors.textPrimary }]}>Template Name</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
          placeholder="e.g. Push Day"
          placeholderTextColor={colors.textSecondary}
          value={name}
          onChangeText={setName}
        />

        {/* Color Picker */}
        <Text style={[styles.label, { color: colors.textPrimary }]}>Color</Text>
        <View style={styles.colorRow}>
          {TEMPLATE_COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => setColor(c)}
              style={[
                styles.colorCircle,
                { backgroundColor: c },
                color === c && styles.colorCircleActive,
              ]}
            >
              {color === c && <Ionicons name="checkmark" size={16} color="white" />}
            </TouchableOpacity>
          ))}
        </View>

        {/* Exercises */}
        <Text style={[styles.label, { color: colors.textPrimary }]}>
          Exercises ({exercises.length})
        </Text>

        {exercises.map((ex, index) => {
          const ssColor = ex.supersetGroup != null ? supersetColors[ex.supersetGroup] : null;
          // Determine whether this exercise is the first in its superset group
          const isFirstInSupersetGroup = ex.supersetGroup != null &&
            (index === 0 || exercises[index - 1].supersetGroup !== ex.supersetGroup);
          return (
            <TemplateExerciseRow
              key={`${ex.exerciseId}-${index}`}
              exercise={ex}
              index={index}
              totalCount={exercises.length}
              supersetColor={ssColor}
              isFirstInSupersetGroup={isFirstInSupersetGroup}
              onUpdate={updateExercise}
              onRemove={removeExercise}
              onMoveUp={(i) => moveExercise(i, 'up')}
              onMoveDown={(i) => moveExercise(i, 'down')}
              onToggleSuperset={toggleSuperset}
              colors={colors}
            />
          );
        })}

        {/* Add Exercise */}
        <TouchableOpacity
          style={[styles.addBtn, { borderColor: Colors.gym }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            openPicker();
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="add-circle-outline" size={20} color={Colors.gym} />
          <Text style={[styles.addBtnText, { color: Colors.gym }]}>Add Exercise</Text>
        </TouchableOpacity>

        {/* Save */}
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: isValid ? Colors.gym : colors.border }]}
          onPress={handleSave}
          disabled={!isValid || saving}
          activeOpacity={0.7}
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.saveBtnText}>
              {isEdit ? 'Update Template' : 'Save Template'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 15, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  colorRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorCircleActive: {
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    marginTop: 4,
  },
  addBtnText: { fontSize: 15, fontWeight: '700' },
  saveBtn: {
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
});
