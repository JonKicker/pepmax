/**
 * ExerciseSection.tsx
 *
 * Renders a single exercise card with its set rows inside an active workout session.
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/theme';
import { SetRow } from './SetRow';
import type { SessionExercise } from '../../types/workout';

export function ExerciseSection({
  exercise,
  exerciseIndex,
  templateTarget,
  previousBest,
  onCompleteSet,
  onAddSet,
  onRemoveSet,
  onSwapPress,
  needsSwap,
  colors,
  weightUnit,
}: {
  exercise: SessionExercise;
  exerciseIndex: number;
  templateTarget?: string;
  previousBest?: string;
  onCompleteSet: (ei: number, si: number, data: any) => void;
  onAddSet: (ei: number) => void;
  onRemoveSet: (ei: number, si: number) => void;
  onSwapPress?: (exerciseIndex: number) => void;
  needsSwap?: boolean;
  colors: any;
  weightUnit: 'lbs' | 'kg';
}) {
  return (
    <View style={sectionStyles.container}>
      <View style={sectionStyles.header}>
        <Text style={[sectionStyles.name, { color: colors.textPrimary }]}>
          {exercise.exerciseName}
        </Text>
        <View style={[sectionStyles.muscleBadge, { backgroundColor: Colors.gym + '1A' }]}>
          <Text style={[sectionStyles.muscleText, { color: Colors.gym }]}>
            {exercise.primaryMuscle}
          </Text>
        </View>
        {needsSwap && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onSwapPress?.(exerciseIndex); }}
            style={[sectionStyles.swapBtn, { backgroundColor: Colors.warning + '20', borderColor: Colors.warning + '40' }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="swap-horizontal" size={14} color={Colors.warning} />
            <Text style={[sectionStyles.swapTxt, { color: Colors.warning }]}>Swap</Text>
          </TouchableOpacity>
        )}
      </View>

      {templateTarget && (
        <Text style={[sectionStyles.target, { color: colors.textSecondary }]}>
          Target: {templateTarget}
        </Text>
      )}

      {previousBest && (
        <Text style={[sectionStyles.prevBest, { color: colors.textSecondary }]}>
          Last time: {previousBest}
        </Text>
      )}

      {/* Set header */}
      <View style={sectionStyles.setHeader}>
        <Text style={[sectionStyles.setHeaderText, { color: colors.textSecondary, width: 28 }]}>Set</Text>
        <Text style={[sectionStyles.setHeaderText, { color: colors.textSecondary, flex: 1, textAlign: 'center' }]}>Weight</Text>
        <Text style={[sectionStyles.setHeaderText, { color: colors.textSecondary, width: 14 }]} />
        <Text style={[sectionStyles.setHeaderText, { color: colors.textSecondary, flex: 1, textAlign: 'center' }]}>Reps</Text>
        <Text style={[sectionStyles.setHeaderText, { color: colors.textSecondary, width: 34 }]} />
      </View>

      {exercise.sets.map((set, si) => (
        <SetRow
          key={si}
          set={set}
          exerciseIndex={exerciseIndex}
          setIndex={si}
          onComplete={onCompleteSet}
          onDelete={onRemoveSet}
          colors={colors}
          weightUnit={weightUnit}
        />
      ))}

      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onAddSet(exerciseIndex)}
        style={[sectionStyles.addSetBtn, { borderColor: colors.border }]}
      >
        <Ionicons name="add" size={16} color={Colors.gym} />
        <Text style={[sectionStyles.addSetText, { color: Colors.gym }]}>Add Set</Text>
      </TouchableOpacity>
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  container: { marginBottom: 20, paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 8 },
  name: { fontSize: 17, fontWeight: '700', flex: 1 },
  muscleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  muscleText: { fontSize: 11, fontWeight: '700' },
  target: { fontSize: 13, marginBottom: 2, fontStyle: 'italic' },
  prevBest: { fontSize: 13, marginBottom: 8 },
  swapBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  swapTxt: { fontSize: 12, fontWeight: '700' },
  setHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginBottom: 4, gap: 8 },
  setHeaderText: { fontSize: 11, fontWeight: '600' },
  addSetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 4,
    gap: 4,
    minHeight: 44,
  },
  addSetText: { fontSize: 13, fontWeight: '600' },
});
