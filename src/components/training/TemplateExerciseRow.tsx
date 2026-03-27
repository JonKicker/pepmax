/**
 * TemplateExerciseRow.tsx
 *
 * Renders a single exercise card within the template builder.
 * Includes set type chip selector and circuit rounds stepper.
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import type { TemplateExercise } from '../../types/template';

const REST_OPTIONS = [30, 45, 60, 90, 120, 150, 180, 240];

const SET_TYPE_OPTIONS: Array<{ key: TemplateExercise['setType']; label: string }> = [
  { key: 'normal', label: 'Normal' },
  { key: 'warmup', label: 'Warmup' },
  { key: 'dropset', label: 'Drop' },
  { key: 'failure', label: 'Failure' },
];

export function TemplateExerciseRow({
  exercise,
  index,
  totalCount,
  supersetColor,
  isFirstInSupersetGroup,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  onToggleSuperset,
  colors,
}: {
  exercise: TemplateExercise;
  index: number;
  totalCount: number;
  supersetColor: string | null;
  isFirstInSupersetGroup: boolean;
  onUpdate: (index: number, update: Partial<TemplateExercise>) => void;
  onRemove: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onToggleSuperset: (index: number) => void;
  colors: any;
}) {
  const activeSetType = exercise.setType ?? 'normal';
  const isInSuperset = exercise.supersetGroup != null;

  return (
    <View
      style={[
        rowStyles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        supersetColor ? { borderLeftWidth: 4, borderLeftColor: supersetColor } : null,
      ]}
    >
      {/* Header */}
      <View style={rowStyles.header}>
        <Text style={[rowStyles.name, { color: colors.textPrimary }]} numberOfLines={1}>
          {exercise.exerciseName}
        </Text>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onRemove(index)}
          accessibilityLabel="Remove exercise"
          accessibilityRole="button"
        >
          <Ionicons name="close-circle" size={22} color={Colors.error} />
        </TouchableOpacity>
      </View>

      {/* Config row: sets / reps / weight */}
      <View style={rowStyles.configRow}>
        <View style={rowStyles.configItem}>
          <Text style={[rowStyles.configLabel, { color: colors.textSecondary }]}>Sets</Text>
          <TextInput
            style={[rowStyles.configInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
            value={String(exercise.targetSets)}
            onChangeText={(v) => {
              const n = parseInt(v, 10);
              if (!isNaN(n) && n > 0) onUpdate(index, { targetSets: n });
              else if (v === '') onUpdate(index, { targetSets: 0 });
            }}
            keyboardType="number-pad"
          />
        </View>
        <View style={rowStyles.configItem}>
          <Text style={[rowStyles.configLabel, { color: colors.textSecondary }]}>Reps</Text>
          <TextInput
            style={[rowStyles.configInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
            value={exercise.targetReps}
            onChangeText={(v) => onUpdate(index, { targetReps: v })}
          />
        </View>
        <View style={rowStyles.configItem}>
          <Text style={[rowStyles.configLabel, { color: colors.textSecondary }]}>Weight (kg)</Text>
          <TextInput
            style={[rowStyles.configInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
            value={exercise.targetWeight != null ? String(exercise.targetWeight) : ''}
            onChangeText={(v) => {
              const n = parseFloat(v);
              onUpdate(index, { targetWeight: isNaN(n) ? undefined : n });
            }}
            keyboardType="number-pad"
            placeholder="-"
            placeholderTextColor={colors.textSecondary}
          />
        </View>
      </View>

      {/* Set type selector */}
      <View style={rowStyles.setTypeRow}>
        <Text style={[rowStyles.configLabel, { color: colors.textSecondary, marginBottom: 4 }]}>Set Type</Text>
        <View style={rowStyles.setTypeChips}>
          {SET_TYPE_OPTIONS.map(({ key, label }) => {
            const active = activeSetType === key;
            return (
              <TouchableOpacity
                key={key}
                activeOpacity={0.7}
                accessibilityRole="button"
                onPress={() => onUpdate(index, { setType: key })}
                style={[
                  rowStyles.setTypeChip,
                  { borderColor: active ? Colors.gym : colors.border },
                  active && { backgroundColor: Colors.gym + '20' },
                ]}
              >
                <Text style={[rowStyles.setTypeText, { color: active ? Colors.gym : colors.textSecondary }]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Circuit rounds stepper — only shown for the first exercise in a superset group */}
      {isInSuperset && isFirstInSupersetGroup && (
        <View style={rowStyles.circuitRow}>
          <Text style={[rowStyles.configLabel, { color: colors.textSecondary }]}>Circuit Rounds</Text>
          <View style={rowStyles.stepper}>
            <TouchableOpacity
              activeOpacity={0.7}
              accessibilityLabel="Decrease sets"
              accessibilityRole="button"
              onPress={() => {
                const current = exercise.circuitRounds ?? 0;
                if (current > 0) onUpdate(index, { circuitRounds: current - 1 || undefined });
              }}
              style={[rowStyles.stepperBtn, { borderColor: colors.border }]}
            >
              <Ionicons name="remove" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
            <Text style={[rowStyles.stepperValue, { color: colors.textPrimary }]}>
              {exercise.circuitRounds ?? '—'}
            </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              accessibilityLabel="Increase sets"
              accessibilityRole="button"
              onPress={() => onUpdate(index, { circuitRounds: (exercise.circuitRounds ?? 0) + 1 })}
              style={[rowStyles.stepperBtn, { borderColor: colors.border }]}
            >
              <Ionicons name="add" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Rest picker */}
      <View style={rowStyles.restRow}>
        <Text style={[rowStyles.configLabel, { color: colors.textSecondary }]}>Rest</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={rowStyles.restChips}>
          {REST_OPTIONS.map((s) => {
            const active = exercise.restSeconds === s;
            return (
              <TouchableOpacity
                key={s}
                activeOpacity={0.7}
                accessibilityRole="button"
                onPress={() => onUpdate(index, { restSeconds: s })}
                style={[
                  rowStyles.restChip,
                  { borderColor: active ? Colors.gym : colors.border },
                  active && { backgroundColor: Colors.gym + '20' },
                ]}
              >
                <Text style={[rowStyles.restChipText, { color: active ? Colors.gym : colors.textSecondary }]}>
                  {s >= 60 ? `${s / 60}m` : `${s}s`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Notes */}
      <TextInput
        style={[rowStyles.notesInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
        placeholder="Notes (optional)"
        placeholderTextColor={colors.textSecondary}
        value={exercise.notes ?? ''}
        onChangeText={(v) => onUpdate(index, { notes: v || undefined })}
      />

      {/* Action buttons */}
      <View style={rowStyles.actionRow}>
        <TouchableOpacity
          activeOpacity={0.7}
          accessibilityLabel="Move exercise up"
          accessibilityRole="button"
          onPress={() => onMoveUp(index)}
          disabled={index === 0}
          style={[rowStyles.actionBtn, index === 0 && { opacity: 0.3 }]}
        >
          <Ionicons name="arrow-up" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.7}
          accessibilityLabel="Move exercise down"
          accessibilityRole="button"
          onPress={() => onMoveDown(index)}
          disabled={index === totalCount - 1}
          style={[rowStyles.actionBtn, index === totalCount - 1 && { opacity: 0.3 }]}
        >
          <Ionicons name="arrow-down" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
        {index > 0 && (
          <TouchableOpacity
            activeOpacity={0.7}
            accessibilityRole="button"
            onPress={() => onToggleSuperset(index)}
            style={[
              rowStyles.supersetBtn,
              { borderColor: isInSuperset ? Colors.gym : colors.border },
              isInSuperset && { backgroundColor: Colors.gym + '20' },
            ]}
          >
            <Ionicons
              name="link"
              size={14}
              color={isInSuperset ? Colors.gym : colors.textSecondary}
            />
            <Text
              style={[
                rowStyles.supersetText,
                { color: isInSuperset ? Colors.gym : colors.textSecondary },
              ]}
            >
              Superset
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  name: { fontSize: 15, fontWeight: '700', flex: 1, marginRight: 8 },
  configRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  configItem: { flex: 1 },
  configLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  configInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    textAlign: 'center',
  },
  setTypeRow: { marginBottom: 8 },
  setTypeChips: { flexDirection: 'row', gap: 6 },
  setTypeChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
  },
  setTypeText: { fontSize: 12, fontWeight: '600' },
  circuitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepperBtn: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: { fontSize: 16, fontWeight: '700', minWidth: 28, textAlign: 'center' },
  restRow: { marginBottom: 8 },
  restChips: { gap: 6, paddingTop: 4 },
  restChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
  },
  restChipText: { fontSize: 12, fontWeight: '600' },
  notesInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    marginBottom: 8,
  },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionBtn: { padding: 6, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  supersetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    marginLeft: 'auto',
  },
  supersetText: { fontSize: 12, fontWeight: '600' },
});
