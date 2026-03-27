/**
 * SetRow.tsx
 *
 * Swipeable set row with inline weight/reps inputs and RPE selector.
 * Swipe left past DELETE_THRESHOLD to delete a set.
 */
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Animated,
  PanResponder,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import type { SessionSet } from '../../types/workout';

// ─── Constants ────────────────────────────────────────────────────────────────

export const DELETE_THRESHOLD = 60;

// ─── RPESelector ─────────────────────────────────────────────────────────────

export function RPESelector({
  value,
  onChange,
  colors,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  colors: any;
}) {
  return (
    <View style={rpeStyles.container}>
      {[6, 7, 8, 9, 10].map((n) => (
        <TouchableOpacity
          key={n}
          activeOpacity={0.7}
          onPress={() => onChange(value === n ? null : n)}
          style={[
            rpeStyles.chip,
            { borderColor: value === n ? Colors.gym : colors.border },
            value === n && { backgroundColor: Colors.gym + '20' },
          ]}
        >
          <Text style={[rpeStyles.chipText, { color: value === n ? Colors.gym : colors.textSecondary }]}>
            {n}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const rpeStyles = StyleSheet.create({
  container: { flexDirection: 'row', gap: 4, marginTop: 4 },
  chip: { width: 44, height: 44, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontSize: 12, fontWeight: '600' },
});

// ─── SetRow ───────────────────────────────────────────────────────────────────

const SET_TYPE_BADGE: Record<string, string> = {
  warmup: 'W',
  dropset: 'D',
  failure: 'F',
};

export function SetRow({
  set,
  exerciseIndex,
  setIndex,
  onComplete,
  onDelete,
  colors,
  weightUnit,
}: {
  set: SessionSet;
  exerciseIndex: number;
  setIndex: number;
  onComplete: (ei: number, si: number, data: { weight: number; weightUnit: 'lbs' | 'kg'; reps: number; rpe: number | null }) => void;
  onDelete: (ei: number, si: number) => void;
  colors: any;
  weightUnit: 'lbs' | 'kg';
}) {
  const [weight, setWeight] = useState(set.weight > 0 ? String(set.weight) : '');
  const [reps, setReps] = useState(set.reps > 0 ? String(set.reps) : '');
  const [rpe, setRpe] = useState<number | null>(set.rpe);

  const translateX = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.5,
      onPanResponderMove: (_, { dx }) => {
        if (dx < 0) translateX.setValue(Math.max(dx, -DELETE_THRESHOLD - 20));
      },
      onPanResponderRelease: (_, { dx, vx }) => {
        if (dx < -DELETE_THRESHOLD / 2 || vx < -0.5) {
          onDelete(exerciseIndex, setIndex);
        }
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;

  const handleComplete = () => {
    const w = parseFloat(weight) || 0;
    const r = parseInt(reps, 10) || 0;
    if (r === 0) {
      Alert.alert('Enter reps', 'Please enter the number of reps before completing the set.');
      return;
    }
    onComplete(exerciseIndex, setIndex, { weight: w, weightUnit, reps: r, rpe });
  };

  const typeBadge = set.setType && set.setType !== 'normal' ? SET_TYPE_BADGE[set.setType] : null;

  return (
    <View style={setRowStyles.wrapper}>
      <View style={[setRowStyles.deleteHint, { backgroundColor: Colors.error }]}>
        <Ionicons name="trash-outline" size={16} color={colors.textPrimary} />
      </View>
      <Animated.View
        style={[{ transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <View
          style={[
            setRowStyles.row,
            {
              backgroundColor: set.isPersonalRecord
                ? Colors.gold + '15'
                : set.completed
                  ? Colors.gym + '10'
                  : colors.surface,
              borderColor: set.isPersonalRecord ? Colors.gold : colors.border,
            },
          ]}
        >
          <View style={setRowStyles.setNumContainer}>
            <Text style={[setRowStyles.setNum, { color: colors.textSecondary }]}>
              {set.setNumber}
            </Text>
            {typeBadge && (
              <View style={[setRowStyles.typeBadge, { backgroundColor: Colors.gym + '30' }]}>
                <Text style={[setRowStyles.typeBadgeText, { color: Colors.gym }]}>{typeBadge}</Text>
              </View>
            )}
          </View>

          <TextInput
            style={[setRowStyles.input, { color: colors.textPrimary, borderColor: colors.border }]}
            value={weight}
            onChangeText={setWeight}
            keyboardType="numeric"
            placeholder={weightUnit}
            placeholderTextColor={colors.textSecondary + '80'}
            editable={!set.completed}
          />

          <Text style={[setRowStyles.times, { color: colors.textSecondary }]}>x</Text>

          <TextInput
            style={[setRowStyles.input, { color: colors.textPrimary, borderColor: colors.border }]}
            value={reps}
            onChangeText={setReps}
            keyboardType="numeric"
            placeholder="reps"
            placeholderTextColor={colors.textSecondary + '80'}
            editable={!set.completed}
          />

          {!set.completed ? (
            <TouchableOpacity activeOpacity={0.7} onPress={handleComplete} style={[setRowStyles.checkBtn, { backgroundColor: Colors.gym }]}>
              <Ionicons name="checkmark" size={18} color={colors.textPrimary} />
            </TouchableOpacity>
          ) : (
            <View style={[setRowStyles.checkBtn, { backgroundColor: Colors.gym + '40' }]}>
              <Ionicons name="checkmark" size={18} color={Colors.gym} />
            </View>
          )}

          {set.isPersonalRecord && (
            <View style={setRowStyles.prBadge}>
              <Ionicons name="trophy" size={10} color={colors.background} />
              <Text style={setRowStyles.prText}>PR</Text>
            </View>
          )}
        </View>

        {!set.completed && (
          <RPESelector value={rpe} onChange={setRpe} colors={colors} />
        )}
      </Animated.View>
    </View>
  );
}

const setRowStyles = StyleSheet.create({
  wrapper: { marginBottom: 6, overflow: 'hidden' },
  deleteHint: {
    position: 'absolute', right: 0, top: 0, bottom: 0, width: 60,
    alignItems: 'center', justifyContent: 'center', borderRadius: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  setNumContainer: { width: 28, alignItems: 'center' },
  setNum: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  typeBadge: {
    borderRadius: 4,
    paddingHorizontal: 3,
    paddingVertical: 1,
    marginTop: 1,
  },
  typeBadgeText: { fontSize: 9, fontWeight: '800' },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  times: { fontSize: 14, fontWeight: '600' },
  checkBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.gold,
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  prText: { fontSize: 9, fontWeight: '800' },
});
