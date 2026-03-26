/**
 * GoalWeightCard — editable goal weight with progress bar.
 */
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { Colors } from '../../constants/theme';
import type { Units } from '../../types/profile';
import { kgToLbs, lbsToKg } from '../../utils/tdee';

type Props = {
  goalWeightKg?: number;
  currentWeightKg?: number;
  startWeightKg?: number;
  units: Units;
  onSaveGoal: (kg: number) => void;
};

function fmt(kg: number, units: Units): string {
  const val = units === 'imperial' ? kgToLbs(kg) : kg;
  return (Math.round(val * 10) / 10).toFixed(1);
}

export default function GoalWeightCard({ goalWeightKg, currentWeightKg, startWeightKg, units, onSaveGoal }: Props) {
  const { colors } = useTheme();
  const isImperial = units === 'imperial';
  const unitLabel = isImperial ? 'lbs' : 'kg';
  const [editing, setEditing] = useState(false);
  const [goalText, setGoalText] = useState('');

  const handleEdit = () => {
    if (goalWeightKg) {
      const display = isImperial ? kgToLbs(goalWeightKg) : goalWeightKg;
      setGoalText(String(Math.round(display * 10) / 10));
    } else {
      setGoalText('');
    }
    setEditing(true);
  };

  const handleSave = () => {
    const parsed = parseFloat(goalText);
    if (isNaN(parsed) || parsed <= 0) {
      Alert.alert('Invalid weight', 'Please enter a valid weight.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const kg = isImperial ? lbsToKg(parsed) : parsed;
    onSaveGoal(kg);
    setEditing(false);
  };

  // Progress calculation
  const progress = (() => {
    if (!goalWeightKg || !currentWeightKg || !startWeightKg) return null;
    const totalDistance = Math.abs(startWeightKg - goalWeightKg);
    if (totalDistance === 0) return 1;
    const covered = Math.abs(startWeightKg - currentWeightKg);
    // Clamp between 0 and 1
    return Math.min(1, Math.max(0, covered / totalDistance));
  })();

  const remaining = (() => {
    if (!goalWeightKg || !currentWeightKg) return null;
    const diff = Math.abs(currentWeightKg - goalWeightKg);
    if (diff < 0.1) return null; // Goal reached
    return fmt(diff, units);
  })();

  const goalReached = remaining === null && goalWeightKg != null;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Goal Weight</Text>
        <TouchableOpacity onPress={handleEdit} hitSlop={8}>
          <Ionicons name="pencil-outline" size={18} color={Colors.body} />
        </TouchableOpacity>
      </View>

      {editing ? (
        <View style={styles.editRow}>
          <TextInput
            style={[styles.editInput, { color: colors.textPrimary, borderColor: Colors.body }]}
            value={goalText}
            onChangeText={setGoalText}
            keyboardType="decimal-pad"
            autoFocus
            placeholder="Goal weight"
            placeholderTextColor={colors.textSecondary}
          />
          <Text style={[styles.editUnit, { color: colors.textSecondary }]}>{unitLabel}</Text>
          <TouchableOpacity
            style={[styles.editSave, { backgroundColor: Colors.body }]}
            onPress={handleSave}
          >
            <Text style={styles.editSaveText}>Set</Text>
          </TouchableOpacity>
        </View>
      ) : goalWeightKg ? (
        <>
          <Text style={[styles.goalValue, { color: colors.textPrimary }]}>
            {fmt(goalWeightKg, units)} {unitLabel}
          </Text>

          {goalReached ? (
            <Text style={[styles.goalStatus, { color: Colors.light.success }]}>
              Goal reached!
            </Text>
          ) : remaining ? (
            <Text style={[styles.goalStatus, { color: colors.textSecondary }]}>
              {remaining} {unitLabel} to go
            </Text>
          ) : null}

          {progress != null && (
            <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.round(progress * 100)}%`, backgroundColor: Colors.body },
                ]}
              />
            </View>
          )}
        </>
      ) : (
        <Text style={[styles.goalStatus, { color: colors.textSecondary }]}>
          Tap the pencil to set a goal weight
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  goalValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  goalStatus: {
    fontSize: 14,
    marginBottom: 8,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    borderBottomWidth: 2,
    paddingVertical: 4,
  },
  editUnit: {
    fontSize: 14,
    fontWeight: '600',
  },
  editSave: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editSaveText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
