import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import { useExerciseLibrary } from '../../../src/hooks/useExerciseLibrary';
import { findExerciseById } from '../../../src/services/exerciseService';
import { getPersonalRecords } from '../../../src/services/personalRecordService';
import type { PersonalRecord } from '../../../src/types/personalRecord';

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
  const router = useRouter();
  const { exerciseId } = useLocalSearchParams<{ exerciseId: string }>();
  const { allExercises } = useExerciseLibrary();
  const [prData, setPrData] = useState<PersonalRecord | null>(null);
  const [prLoading, setPrLoading] = useState(true);

  const exercise = useMemo(
    () => findExerciseById(allExercises, exerciseId ?? ''),
    [allExercises, exerciseId],
  );

  useFocusEffect(
    useCallback(() => {
      if (!exerciseId) return;
      setPrLoading(true);
      getPersonalRecords(exerciseId).then((result) => {
        setPrData(result.data ?? null);
        setPrLoading(false);
      });
    }, [exerciseId]),
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

      {/* Personal Records */}
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Personal Records</Text>
      {prLoading ? (
        <ActivityIndicator size="small" color={Colors.gym} style={{ marginVertical: 8 }} />
      ) : !prData ? (
        <Text style={[styles.prEmpty, { color: colors.textSecondary }]}>
          No personal records yet — start training to set your first!
        </Text>
      ) : (
        <View style={styles.prGrid}>
          {prData.weightPR && (
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/(tabs)/training/session-detail', params: { sessionId: prData.weightPR!.sessionId } })}
              style={[styles.prCard, { backgroundColor: Colors.gold + '15', borderColor: Colors.gold + '30' }]}
            >
              <View style={styles.prCardHeader}>
                <Ionicons name="trophy" size={16} color={Colors.gold} />
                <Text style={[styles.prCardLabel, { color: colors.textSecondary }]}>Weight PR</Text>
              </View>
              <Text style={[styles.prCardValue, { color: colors.textPrimary }]}>
                {prData.weightPR.value} {prData.weightPR.unit}
              </Text>
              <Text style={[styles.prCardDate, { color: colors.textSecondary }]}>
                {prData.weightPR.date}
              </Text>
            </TouchableOpacity>
          )}

          {prData.volumePR && (
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/(tabs)/training/session-detail', params: { sessionId: prData.volumePR!.sessionId } })}
              style={[styles.prCard, { backgroundColor: Colors.gold + '15', borderColor: Colors.gold + '30' }]}
            >
              <View style={styles.prCardHeader}>
                <Ionicons name="trophy" size={16} color={Colors.gold} />
                <Text style={[styles.prCardLabel, { color: colors.textSecondary }]}>Volume PR</Text>
              </View>
              <Text style={[styles.prCardValue, { color: colors.textPrimary }]}>
                {prData.volumePR.value.toLocaleString()} {prData.volumePR.unit}
              </Text>
              <Text style={[styles.prCardDate, { color: colors.textSecondary }]}>
                {prData.volumePR.date}
              </Text>
            </TouchableOpacity>
          )}

          {prData.estimated1RM && (
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/(tabs)/training/session-detail', params: { sessionId: prData.estimated1RM!.sessionId } })}
              style={[styles.prCard, { backgroundColor: Colors.gold + '15', borderColor: Colors.gold + '30' }]}
            >
              <View style={styles.prCardHeader}>
                <Ionicons name="trophy" size={16} color={Colors.gold} />
                <Text style={[styles.prCardLabel, { color: colors.textSecondary }]}>Est. 1RM</Text>
              </View>
              <Text style={[styles.prCardValue, { color: colors.textPrimary }]}>
                {prData.estimated1RM.value} {prData.estimated1RM.unit}
              </Text>
              <Text style={[styles.prCardDate, { color: colors.textSecondary }]}>
                {prData.estimated1RM.date}
              </Text>
            </TouchableOpacity>
          )}

          {/* Rep PRs */}
          {Object.keys(prData.repPRs).length > 0 && (
            <View style={[styles.prCard, { backgroundColor: Colors.gold + '15', borderColor: Colors.gold + '30', width: '100%' }]}>
              <View style={styles.prCardHeader}>
                <Ionicons name="trophy" size={16} color={Colors.gold} />
                <Text style={[styles.prCardLabel, { color: colors.textSecondary }]}>Rep Records</Text>
              </View>
              {Object.entries(prData.repPRs)
                .sort(([a], [b]) => Number(b) - Number(a))
                .slice(0, 5)
                .map(([weight, entry]) => (
                  <Text key={weight} style={[styles.repPrLine, { color: colors.textPrimary }]}>
                    {entry.reps} reps @ {weight} {entry.unit ?? 'lbs'}
                  </Text>
                ))}
            </View>
          )}
        </View>
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

  prEmpty: { fontSize: 14, fontStyle: 'italic' },
  prGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  prCard: {
    width: '47%', flexGrow: 1,
    borderRadius: 12, borderWidth: 1, padding: 12,
  },
  prCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  prCardLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  prCardValue: { fontSize: 18, fontWeight: '700' },
  prCardDate: { fontSize: 11, marginTop: 4 },
  repPrLine: { fontSize: 14, marginTop: 4 },
});
