import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import { getSessionById, updateSession } from '../../../src/services/workoutSessionService';
import type { WorkoutSession } from '../../../src/types/workout';
import { Timestamp } from 'firebase/firestore';
import { writeStrengthWorkout } from '../../../src/services/healthKitService';

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatVolume(volume: number): string {
  if (volume >= 1000) return `${(volume / 1000).toFixed(1)}k`;
  return String(Math.round(volume));
}

function StarRating({
  value,
  onChange,
  colors,
}: {
  value: number | null;
  onChange: (v: number) => void;
  colors: any;
}) {
  return (
    <View style={starStyles.container}>
      {[1, 2, 3, 4, 5].map((n) => (
        <TouchableOpacity key={n} onPress={() => onChange(n)}>
          <Ionicons
            name={value != null && n <= value ? 'star' : 'star-outline'}
            size={32}
            color={value != null && n <= value ? '#FFD700' : colors.textSecondary}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const starStyles = StyleSheet.create({
  container: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginVertical: 12 },
});

export default function SessionSummaryScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ sessionId: string; elapsed?: string }>();

  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const result = await getSessionById(params.sessionId);
      if (result.error || !result.data) {
        setFetchError('Failed to load workout session.');
        setLoading(false);
        return;
      }
      setSession(result.data);
      setNotes(result.data.notes ?? '');
      setRating(result.data.rating ?? null);
      setLoading(false);
    })();
  }, [params.sessionId]);

  // Derive weight unit from the first completed set (fallback to "lbs")
  const volumeUnit: string = (() => {
    if (!session) return 'lbs';
    for (const ex of session.exercises) {
      const completed = ex.sets.find((s) => s.completed);
      if (completed) return completed.weightUnit;
    }
    return 'lbs';
  })();

  const computeStats = () => {
    if (!session) return { duration: 0, volume: 0, exercises: 0, sets: 0, prs: 0 };

    const elapsed = params.elapsed ? parseInt(params.elapsed, 10) : session.duration;
    const completedSets = session.exercises.flatMap((e) => e.sets.filter((s) => s.completed));
    const volume = completedSets.reduce((sum, s) => sum + s.weight * s.reps, 0);
    const prs = completedSets.filter((s) => s.isPersonalRecord).length;
    const exercisesWithSets = session.exercises.filter((e) =>
      e.sets.some((s) => s.completed),
    ).length;

    return { duration: elapsed, volume, exercises: exercisesWithSets, sets: completedSets.length, prs };
  };

  const handleSave = async () => {
    if (!session) return;
    setSaving(true);

    const stats = computeStats();
    const endedAt = Timestamp.now();
    await updateSession(session.id, {
      status: 'completed',
      endedAt,
      duration: stats.duration,
      totalVolume: stats.volume,
      totalSets: stats.sets,
      notes,
      rating,
    });

    // Fire-and-forget HealthKit write
    writeStrengthWorkout({
      startDate: session.startedAt.toDate(),
      endDate: endedAt.toDate(),
      durationSeconds: stats.duration,
    }).catch(() => {});

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaving(false);

    // Navigate back to training index, clearing the active session from the stack
    router.replace('/(tabs)/training');
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={Colors.gym} size="large" />
      </View>
    );
  }

  if (fetchError || !session) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.textSecondary} />
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          {fetchError ?? 'Session not found.'}
        </Text>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: Colors.gym }]}
          onPress={() => router.replace('/(tabs)/training')}
        >
          <Text style={styles.backBtnText}>Back to Training</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const stats = computeStats();

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.titleSection}>
        <View style={[styles.iconCircle, { backgroundColor: (session.isBareMinimum ? Colors.warning : Colors.gym) + '1A' }]}>
          <Ionicons name="trophy-outline" size={36} color={session.isBareMinimum ? Colors.warning : Colors.gym} />
        </View>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {session.isBareMinimum ? 'Solid Effort!' : 'Workout Complete!'}
        </Text>
        <View style={styles.templateNameRow}>
          <Text style={[styles.templateName, { color: colors.textSecondary }]}>
            {session.templateName}
          </Text>
          {session.isBareMinimum && (
            <View style={styles.adaptedBadge}>
              <Text style={styles.adaptedBadgeText}>Adapted</Text>
            </View>
          )}
        </View>
      </View>

      {/* Stats grid */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="time-outline" size={22} color={Colors.gym} />
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {formatDuration(stats.duration)}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Duration</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="barbell-outline" size={22} color={Colors.gym} />
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {formatVolume(stats.volume)} {volumeUnit}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Volume</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="fitness-outline" size={22} color={Colors.gym} />
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {stats.exercises}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Exercises</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="layers-outline" size={22} color={Colors.gym} />
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {stats.sets}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Sets</Text>
        </View>
      </View>

      {/* Bare minimum encouraging banner */}
      {session.isBareMinimum && session.originalTotalSets && session.originalTotalSets > 0 && (
        <View style={[styles.adaptedBanner, { backgroundColor: Colors.warning + '15', borderColor: Colors.warning + '40' }]}>
          <Ionicons name="flash-outline" size={18} color={Colors.warning} />
          <Text style={[styles.adaptedBannerText, { color: colors.textPrimary }]}>
            You completed {Math.round((stats.sets / session.originalTotalSets) * 100)}% of planned volume — solid effort on a tough day
          </Text>
        </View>
      )}

      {/* PR callout */}
      {stats.prs > 0 && (
        <View style={[styles.prBanner, { backgroundColor: '#FFD700' + '20', borderColor: '#FFD700' + '40' }]}>
          <Ionicons name="trophy" size={20} color="#FFD700" />
          <Text style={[styles.prBannerText, { color: colors.textPrimary }]}>
            {stats.prs} new personal record{stats.prs > 1 ? 's' : ''}!
          </Text>
        </View>
      )}

      {/* Exercise breakdown */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Exercises</Text>
        {session.exercises.map((ex, i) => {
          const completed = ex.sets.filter((s) => s.completed);
          if (completed.length === 0) return null;
          const maxWeight = Math.max(...completed.map((s) => s.weight));
          return (
            <View key={i} style={[styles.exerciseRow, { borderColor: colors.border }]}>
              <View style={styles.exerciseInfo}>
                <Text style={[styles.exerciseName, { color: colors.textPrimary }]}>
                  {ex.exerciseName}
                </Text>
                <Text style={[styles.exerciseDetail, { color: colors.textSecondary }]}>
                  {completed.length} sets · best: {maxWeight} {volumeUnit} x{' '}
                  {completed.find((s) => s.weight === maxWeight)?.reps ?? 0}
                </Text>
              </View>
              {completed.some((s) => s.isPersonalRecord) && (
                <View style={styles.prBadge}>
                  <Text style={styles.prBadgeText}>PR</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Rating */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>How was this workout?</Text>
        <StarRating value={rating} onChange={setRating} colors={colors} />
      </View>

      {/* Notes */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Notes</Text>
        <TextInput
          style={[styles.notesInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface }]}
          value={notes}
          onChangeText={setNotes}
          placeholder="How did it feel? Any notes..."
          placeholderTextColor={colors.textSecondary + '80'}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      {/* Save button */}
      <TouchableOpacity
        onPress={handleSave}
        style={[styles.saveBtn, { backgroundColor: Colors.gym }]}
        disabled={saving}
        activeOpacity={0.85}
      >
        {saving ? (
          <ActivityIndicator color="white" size="small" />
        ) : (
          <Text style={styles.saveBtnText}>Save & Finish</Text>
        )}
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  errorText: { fontSize: 15, textAlign: 'center', marginTop: 16, marginBottom: 24, lineHeight: 22 },
  backBtn: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10 },
  backBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },

  titleSection: { alignItems: 'center', paddingTop: 24, paddingBottom: 20 },
  iconCircle: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  templateNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  templateName: { fontSize: 15 },
  adaptedBadge: {
    backgroundColor: Colors.warning, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  adaptedBadgeText: { fontSize: 11, fontWeight: '800', color: 'white' },
  adaptedBanner: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 16,
    padding: 12, borderRadius: 12, borderWidth: 1, gap: 8,
  },
  adaptedBannerText: { fontSize: 14, flex: 1, lineHeight: 20 },

  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 16, gap: 10,
    marginBottom: 16,
  },
  statCard: {
    width: '47%', flexGrow: 1,
    alignItems: 'center', padding: 14,
    borderRadius: 12, borderWidth: 1,
  },
  statValue: { fontSize: 20, fontWeight: '700', marginTop: 6 },
  statLabel: { fontSize: 12, marginTop: 2 },

  prBanner: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 16,
    padding: 12, borderRadius: 12, borderWidth: 1, gap: 8,
  },
  prBannerText: { fontSize: 15, fontWeight: '700' },

  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 10 },

  exerciseRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1,
  },
  exerciseInfo: { flex: 1 },
  exerciseName: { fontSize: 15, fontWeight: '600' },
  exerciseDetail: { fontSize: 13, marginTop: 2 },
  prBadge: {
    backgroundColor: '#FFD700', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  prBadgeText: { fontSize: 11, fontWeight: '800', color: '#333' },

  notesInput: {
    borderWidth: 1, borderRadius: 10,
    padding: 12, fontSize: 15, minHeight: 80,
  },

  saveBtn: {
    marginHorizontal: 16, paddingVertical: 16,
    borderRadius: 12, alignItems: 'center',
  },
  saveBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
});
