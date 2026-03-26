/**
 * ProtocolView — renders the full protocol based on category.
 * Pure display component — no Firestore or service calls.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import type { ProtocolData, PeptideCycleProtocol, WorkoutProtocol, NutritionProtocol } from '../../types/communityTemplate';

// ─── Peptide cycle view ───────────────────────────────────────────────────────

function PeptideCycleView({ data, colors }: { data: PeptideCycleProtocol; colors: any }) {
  return (
    <View>
      <Row label="Compound" value={data.compoundName} colors={colors} />
      <Row label="Starting dose" value={`${data.startingDose} ${data.unit}`} colors={colors} />
      {data.incrementFrequency !== 'manual' && (
        <>
          <Row label="Increment" value={`${data.incrementAmount} ${data.unit}`} colors={colors} />
          <Row label="Max dose" value={`${data.maxDose} ${data.unit}`} colors={colors} />
          <Row label="Increase every" value={data.incrementFrequency} colors={colors} />
        </>
      )}
      <Row label="Frequency" value={data.injectionFrequency} colors={colors} />
      {data.preferredDays.length > 0 && (
        <Row label="Days" value={data.preferredDays.join(', ')} colors={colors} />
      )}
      <Row
        label="Duration"
        value={data.durationWeeks ? `${data.durationWeeks} weeks` : 'Open-ended'}
        colors={colors}
      />
      {data.taperEnabled && data.taperConfig && (
        <>
          <Row label="Taper weeks" value={String(data.taperConfig.taperWeeks)} colors={colors} />
          <Row label="Taper step" value={`${data.taperConfig.taperStepAmount} ${data.unit}`} colors={colors} />
        </>
      )}
    </View>
  );
}

// ─── Workout view ─────────────────────────────────────────────────────────────

function WorkoutView({ data, colors }: { data: WorkoutProtocol; colors: any }) {
  return (
    <View>
      <Row label="Program name" value={data.name} colors={colors} />
      <Row label="Est. duration" value={`~${data.estimatedDuration} min`} colors={colors} />
      {data.muscleGroups.length > 0 && (
        <Row label="Muscles" value={data.muscleGroups.join(', ')} colors={colors} />
      )}

      <Text style={[styles.subHeading, { color: colors.textSecondary }]}>EXERCISES</Text>
      {data.exercises.map((ex, i) => (
        <View key={i} style={[styles.exerciseRow, { borderColor: colors.border }]}>
          <View style={[styles.exerciseNum, { backgroundColor: Colors.gym + '18' }]}>
            <Text style={[styles.exerciseNumText, { color: Colors.gym }]}>{i + 1}</Text>
          </View>
          <View style={styles.exerciseBody}>
            <Text style={[styles.exerciseName, { color: colors.textPrimary }]}>{ex.exerciseName}</Text>
            <Text style={[styles.exerciseMeta, { color: colors.textSecondary }]}>
              {ex.targetSets} sets × {ex.targetReps} reps · rest {ex.restSeconds}s
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── Nutrition view ───────────────────────────────────────────────────────────

function NutritionView({ data, colors }: { data: NutritionProtocol; colors: any }) {
  return (
    <View>
      <Text style={[styles.subHeading, { color: colors.textSecondary }]}>DAILY TARGETS</Text>
      <View style={[styles.macroGrid, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <MacroCell label="Calories" value={String(data.dailyCalories)} unit="kcal" color={Colors.nutrition} />
        <MacroCell label="Protein" value={String(data.proteinG)} unit="g" color={Colors.peptide} />
        <MacroCell label="Carbs" value={String(data.carbsG)} unit="g" color="#F39C12" />
        <MacroCell label="Fat" value={String(data.fatG)} unit="g" color={Colors.cardio} />
      </View>

      {data.sampleMeals.length > 0 && (
        <>
          <Text style={[styles.subHeading, { color: colors.textSecondary }]}>SAMPLE MEALS</Text>
          {data.sampleMeals.map((meal, i) => (
            <View key={i} style={[styles.mealRow, { borderColor: colors.border }]}>
              <Text style={[styles.mealName, { color: colors.textPrimary }]}>{meal.name}</Text>
              <Text style={[styles.mealMacros, { color: colors.textSecondary }]}>
                {meal.calories} kcal · {meal.protein}g P · {meal.carbs}g C · {meal.fat}g F
              </Text>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

function MacroCell({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <View style={styles.macroCell}>
      <Text style={[styles.macroCellValue, { color }]}>{value}</Text>
      <Text style={[styles.macroCellUnit, { color }]}>{unit}</Text>
      <Text style={styles.macroCellLabel}>{label}</Text>
    </View>
  );
}

// ─── Shared row component ─────────────────────────────────────────────────────

function Row({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: colors.textPrimary }]}>{value}</Text>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type Props = {
  protocolData: ProtocolData;
  colors: any;
};

export default function ProtocolView({ protocolData, colors }: Props) {
  return (
    <View>
      {protocolData.category === 'peptide_cycle' && (
        <PeptideCycleView data={protocolData.data as PeptideCycleProtocol} colors={colors} />
      )}
      {protocolData.category === 'workout' && (
        <WorkoutView data={protocolData.data as WorkoutProtocol} colors={colors} />
      )}
      {protocolData.category === 'nutrition_plan' && (
        <NutritionView data={protocolData.data as NutritionProtocol} colors={colors} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: { fontSize: 13 },
  rowValue: { fontSize: 13, fontWeight: '600', flex: 1, textAlign: 'right' },

  subHeading: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 8,
  },

  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  exerciseNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseNumText: { fontSize: 12, fontWeight: '700' },
  exerciseBody: { flex: 1 },
  exerciseName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  exerciseMeta: { fontSize: 12 },

  macroGrid: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  macroCell: { flex: 1, alignItems: 'center' },
  macroCellValue: { fontSize: 18, fontWeight: '700' },
  macroCellUnit: { fontSize: 10, fontWeight: '600', marginBottom: 2 },
  macroCellLabel: { fontSize: 11, color: '#999' },

  mealRow: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  mealName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  mealMacros: { fontSize: 12 },
});
