import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import { useExerciseLibrary } from '../../../src/hooks/useExerciseLibrary';
import { findExerciseById } from '../../../src/services/exerciseService';

const CATEGORY_COLORS: Record<string, string> = {
  Compound: '#8E44AD',
  Isolation: '#2E86C1',
  Bodyweight: '#27AE60',
  Machine: '#E67E22',
  Cable: '#1ABC9C',
  Cardio: '#E74C3C',
};

export default function ExerciseDetailScreen() {
  const { colors } = useTheme();
  const { exerciseId } = useLocalSearchParams<{ exerciseId: string }>();
  const { allExercises } = useExerciseLibrary();

  const exercise = useMemo(
    () => findExerciseById(allExercises, exerciseId ?? ''),
    [allExercises, exerciseId],
  );

  if (!exercise) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.textSecondary} />
        <Text style={[styles.notFound, { color: colors.textSecondary }]}>Exercise not found</Text>
      </View>
    );
  }

  const catColor = CATEGORY_COLORS[exercise.category] ?? Colors.gym;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* Name */}
      <Text style={[styles.name, { color: colors.textPrimary }]}>{exercise.name}</Text>

      {/* Category badge */}
      <View style={[styles.badge, { backgroundColor: catColor + '20' }]}>
        <Text style={[styles.badgeText, { color: catColor }]}>{exercise.category}</Text>
      </View>

      {/* Primary muscles */}
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Primary Muscles</Text>
      <View style={styles.chipRow}>
        {exercise.primaryMuscles.map((m) => (
          <View key={m} style={[styles.chip, { backgroundColor: Colors.gym + '20' }]}>
            <Text style={[styles.chipText, { color: Colors.gym }]}>{m}</Text>
          </View>
        ))}
      </View>

      {/* Secondary muscles */}
      {exercise.secondaryMuscles.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Secondary Muscles</Text>
          <View style={styles.chipRow}>
            {exercise.secondaryMuscles.map((m) => (
              <View key={m} style={[styles.chip, { backgroundColor: colors.surface }]}>
                <Text style={[styles.chipText, { color: colors.textSecondary }]}>{m}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Equipment */}
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Equipment</Text>
      <View style={styles.infoRow}>
        <Ionicons name="fitness-outline" size={18} color={Colors.gym} />
        <Text style={[styles.infoText, { color: colors.textPrimary }]}>{exercise.equipment}</Text>
      </View>

      {/* Instructions */}
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Instructions</Text>
      <Text style={[styles.instructions, { color: colors.textPrimary }]}>{exercise.instructions}</Text>

      {/* Tips */}
      {exercise.tips.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Tips</Text>
          {exercise.tips.map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <Text style={[styles.bullet, { color: Colors.gym }]}>•</Text>
              <Text style={[styles.tipText, { color: colors.textPrimary }]}>{tip}</Text>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound: { fontSize: 16, marginTop: 12 },
  name: { fontSize: 26, fontWeight: '800', marginBottom: 10 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 14, marginBottom: 20 },
  badgeText: { fontSize: 13, fontWeight: '700' },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginTop: 20, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  chipText: { fontSize: 13, fontWeight: '600' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontSize: 15 },
  instructions: { fontSize: 15, lineHeight: 24 },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6, paddingRight: 8 },
  bullet: { fontSize: 18, marginRight: 8, lineHeight: 22 },
  tipText: { flex: 1, fontSize: 15, lineHeight: 22 },
});
