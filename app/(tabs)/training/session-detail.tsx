import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Timestamp } from 'firebase/firestore';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import { getSessionById } from '../../../src/services/workoutSessionService';
import { formatVolume, formatWorkoutDuration } from '../../../src/utils/training';
import type { WorkoutSession } from '../../../src/types/workout';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(ts: Timestamp | any): string {
  const date = ts?.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(ts: Timestamp | any): string {
  const date = ts?.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

// ─── Star display ─────────────────────────────────────────────────────────────

function StarDisplay({ value, colors }: { value: number | null; colors: any }) {
  if (value == null) return null;
  return (
    <View style={starStyles.row}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Ionicons
          key={n}
          name={n <= value ? 'star' : 'star-outline'}
          size={16}
          color={n <= value ? Colors.gold : colors.textSecondary}
        />
      ))}
    </View>
  );
}

const starStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 2 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SessionDetailScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();

  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!sessionId) return;
      const result = await getSessionById(sessionId);
      if (result.data) setSession(result.data);
      setLoading(false);
    })();
  }, [sessionId]);

  const handleRepeat = () => {
    if (!session) return;
    Alert.alert(
      'Repeat Workout',
      `Start a new session with the same exercises as "${session.templateName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push(
              session.templateId
                ? { pathname: '/(tabs)/training/session-preview', params: { templateId: session.templateId } }
                : { pathname: '/(tabs)/training/active-session', params: { mode: 'quick' } },
            );
          },
        },
      ],
    );
  };

  if (loading || !session) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={Colors.gym} size="large" />
      </View>
    );
  }

  const completedSets = session.exercises.flatMap((e) =>
    e.sets.filter((s) => s.completed),
  );
  const prCount = completedSets.filter((s) => s.isPersonalRecord).length;
  const exerciseCount = session.exercises.filter((e) =>
    e.sets.some((s) => s.completed),
  ).length;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <Text style={[styles.templateName, { color: colors.textPrimary }]}>
        {session.templateName || 'Quick Workout'}
      </Text>
      <Text style={[styles.date, { color: colors.textSecondary }]}>
        {formatDate(session.startedAt)} · {formatTime(session.startedAt)}
      </Text>

      {session.rating != null && (
        <View style={styles.ratingRow}>
          <StarDisplay value={session.rating} colors={colors} />
        </View>
      )}

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="time-outline" size={18} color={Colors.gym} />
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {formatWorkoutDuration(session.duration)}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Duration</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="barbell-outline" size={18} color={Colors.gym} />
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {formatVolume(session.totalVolume)}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Volume</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="fitness-outline" size={18} color={Colors.gym} />
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {exerciseCount}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Exercises</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="layers-outline" size={18} color={Colors.gym} />
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {completedSets.length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Sets</Text>
        </View>
      </View>

      {/* PR banner */}
      {prCount > 0 && (
        <View style={[styles.prBanner, { backgroundColor: Colors.gold + '20', borderColor: Colors.gold + '40' }]}>
          <Ionicons name="trophy" size={18} color={Colors.gold} />
          <Text style={[styles.prBannerText, { color: colors.textPrimary }]}>
            {prCount} personal record{prCount > 1 ? 's' : ''} set!
          </Text>
        </View>
      )}

      {/* Exercise breakdown */}
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Exercises</Text>

      {session.exercises.map((exercise, ei) => {
        const completed = exercise.sets.filter((s) => s.completed);
        if (completed.length === 0) return null;

        return (
          <View key={ei} style={[styles.exerciseCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.exerciseHeader}>
              <Text style={[styles.exerciseName, { color: colors.textPrimary }]}>
                {exercise.exerciseName}
              </Text>
              <View style={[styles.muscleBadge, { backgroundColor: Colors.gym + '1A' }]}>
                <Text style={[styles.muscleText, { color: Colors.gym }]}>
                  {exercise.primaryMuscle}
                </Text>
              </View>
            </View>

            {/* Set rows */}
            {completed.map((set, si) => (
              <View
                key={si}
                style={[
                  styles.setRow,
                  {
                    borderTopColor: colors.border,
                    backgroundColor: set.isPersonalRecord ? Colors.gold + '15' : 'transparent',
                    borderLeftColor: set.isPersonalRecord ? Colors.gold : 'transparent',
                    borderLeftWidth: set.isPersonalRecord ? 3 : 0,
                  },
                ]}
              >
                <Text style={[styles.setNum, { color: colors.textSecondary }]}>
                  #{set.setNumber}
                </Text>
                <Text style={[styles.setData, { color: colors.textPrimary }]}>
                  {set.weight} {set.weightUnit} x {set.reps}
                </Text>
                {set.rpe != null && (
                  <Text style={[styles.setRpe, { color: colors.textSecondary }]}>
                    RPE {set.rpe}
                  </Text>
                )}
                {set.isPersonalRecord && (
                  <View style={styles.setPrBadge}>
                    <Ionicons name="trophy" size={10} color="#333" />
                    <Text style={styles.setPrText}>PR</Text>
                  </View>
                )}
              </View>
            ))}

            {exercise.notes ? (
              <Text style={[styles.exerciseNotes, { color: colors.textSecondary }]}>
                {exercise.notes}
              </Text>
            ) : null}
          </View>
        );
      })}

      {/* Session notes */}
      {session.notes ? (
        <>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Notes</Text>
          <Text style={[styles.sessionNotes, { color: colors.textPrimary }]}>
            {session.notes}
          </Text>
        </>
      ) : null}

      {/* Repeat Workout button */}
      <TouchableOpacity
        onPress={handleRepeat}
        style={[styles.repeatBtn, { backgroundColor: Colors.gym }]}
        activeOpacity={0.85}
      >
        <Ionicons name="repeat" size={20} color="white" />
        <Text style={styles.repeatBtnText}>Repeat Workout</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  templateName: { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  date: { fontSize: 14, marginBottom: 8 },
  ratingRow: { marginBottom: 16 },

  statsRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16,
  },
  statCard: {
    width: '47%', flexGrow: 1,
    alignItems: 'center', padding: 12,
    borderRadius: 12, borderWidth: 1,
  },
  statValue: { fontSize: 18, fontWeight: '700', marginTop: 4 },
  statLabel: { fontSize: 11, marginTop: 2 },

  prBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 16,
  },
  prBannerText: { fontSize: 15, fontWeight: '700' },

  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 10, marginTop: 8 },

  exerciseCard: {
    borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 10, overflow: 'hidden',
  },
  exerciseHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8,
  },
  exerciseName: { fontSize: 16, fontWeight: '700', flex: 1 },
  muscleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  muscleText: { fontSize: 11, fontWeight: '700' },

  setRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
    paddingHorizontal: 8, borderTopWidth: StyleSheet.hairlineWidth, gap: 12,
  },
  setNum: { fontSize: 13, fontWeight: '600', width: 24 },
  setData: { fontSize: 14, fontWeight: '600', flex: 1 },
  setRpe: { fontSize: 12 },
  setPrBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: Colors.gold, borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  setPrText: { fontSize: 9, fontWeight: '800', color: '#333' },

  exerciseNotes: { fontSize: 13, fontStyle: 'italic', marginTop: 8 },

  sessionNotes: { fontSize: 15, lineHeight: 22, marginBottom: 16 },

  repeatBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, borderRadius: 12, gap: 8, marginTop: 16,
  },
  repeatBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
});
