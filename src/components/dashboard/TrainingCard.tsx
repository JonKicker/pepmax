/**
 * TrainingCard — recent workouts, weekly summary, and "Start Workout" CTA.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { DashboardCard } from './DashboardCard';
import { Colors } from '../../constants/theme';
import type { Theme } from '../../constants/theme';
import type { WorkoutSession } from '../../types/workout';
import { formatVolume, formatWorkoutDuration, getRelativeTimeLabel, suggestNextTemplate } from '../../utils/training';

type Props = {
  sessions: WorkoutSession[];
  colors: Theme['colors'];
  error: boolean;
  onPress: () => void;
  onStartWorkout: (templateId?: string) => void;
};

export function TrainingCard({ sessions, colors, error, onPress, onStartWorkout }: Props) {
  return (
    <DashboardCard
      title="Training"
      icon="barbell-outline"
      iconColor={Colors.gym}
      onPress={onPress}
      colors={colors}
    >
      {error ? (
        <Text style={[styles.empty, { color: colors.textSecondary }]}>Could not load training data.</Text>
      ) : sessions.length === 0 ? (
        <View>
          <Text style={[styles.empty, { color: colors.textSecondary }]}>No workouts completed yet.</Text>
          <TouchableOpacity
            style={[styles.ctaBtn, { backgroundColor: Colors.gym + '15', borderColor: Colors.gym + '30' }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onStartWorkout();
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="flash" size={16} color={Colors.gym} />
            <Text style={[styles.ctaText, { color: Colors.gym }]}>Start Workout</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          {/* Most recent workout */}
          {(() => {
            const last = sessions[0];
            const lastDate = last.startedAt?.toDate ? last.startedAt.toDate() : new Date();
            return (
              <View style={styles.recentBlock}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Last Workout</Text>
                <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
                  {last.templateName || 'Quick Workout'}
                </Text>
                <Text style={[styles.meta, { color: colors.textSecondary }]}>
                  {getRelativeTimeLabel(lastDate)} · {formatWorkoutDuration(last.duration)} · {formatVolume(last.totalVolume)}
                </Text>
              </View>
            );
          })()}

          {/* Weekly summary */}
          {(() => {
            const now = new Date();
            const weekStart = new Date(now);
            const day = weekStart.getDay();
            weekStart.setDate(weekStart.getDate() - (day === 0 ? 6 : day - 1));
            weekStart.setHours(0, 0, 0, 0);

            const weekSessions = sessions.filter((s) => {
              const d = s.startedAt?.toDate ? s.startedAt.toDate() : new Date();
              return d >= weekStart;
            });
            const weekVolume = weekSessions.reduce((sum, s) => sum + s.totalVolume, 0);
            const weekPRs = weekSessions.reduce(
              (sum, s) => sum + s.exercises.flatMap((e) => e.sets).filter((set) => set.isPersonalRecord).length,
              0,
            );

            const dayFlags = Array(7).fill(false);
            for (const s of weekSessions) {
              const d = s.startedAt?.toDate ? s.startedAt.toDate() : new Date();
              dayFlags[(d.getDay() + 6) % 7] = true;
            }
            const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

            return (
              <>
                <View style={[styles.weekSummary, { borderTopColor: colors.border }]}>
                  <View style={styles.weekStat}>
                    <Text style={[styles.weekNum, { color: colors.textPrimary }]}>{weekSessions.length}</Text>
                    <Text style={[styles.weekLabel, { color: colors.textSecondary }]}>workouts</Text>
                  </View>
                  <View style={styles.weekStat}>
                    <Text style={[styles.weekNum, { color: colors.textPrimary }]}>{formatVolume(weekVolume)}</Text>
                    <Text style={[styles.weekLabel, { color: colors.textSecondary }]}>volume</Text>
                  </View>
                  {weekPRs > 0 && (
                    <View style={styles.weekStat}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="trophy" size={14} color={Colors.gold} />
                        <Text style={[styles.weekNum, { color: Colors.gold }]}>{weekPRs}</Text>
                      </View>
                      <Text style={[styles.weekLabel, { color: colors.textSecondary }]}>PRs</Text>
                    </View>
                  )}
                </View>

                <View style={styles.dayDotsRow}>
                  {dayLabels.map((label, i) => (
                    <View key={i} style={styles.dayDotCol}>
                      <View style={[styles.dayDot, { backgroundColor: dayFlags[i] ? Colors.gym : colors.border }]} />
                      <Text style={[styles.dayDotLabel, { color: colors.textSecondary }]}>{label}</Text>
                    </View>
                  ))}
                </View>
              </>
            );
          })()}

          {/* Suggested next workout */}
          {(() => {
            const suggestion = suggestNextTemplate(sessions);
            if (!suggestion) return null;
            return (
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  onStartWorkout(suggestion.templateId);
                }}
                style={[styles.ctaBtn, { backgroundColor: Colors.gym + '15', borderColor: Colors.gym + '30' }]}
                activeOpacity={0.8}
              >
                <Ionicons name="flash" size={16} color={Colors.gym} />
                <Text style={[styles.ctaText, { color: Colors.gym }]}>Next: {suggestion.templateName}</Text>
              </TouchableOpacity>
            );
          })()}
        </View>
      )}
    </DashboardCard>
  );
}

const styles = StyleSheet.create({
  empty: { fontSize: 14, fontStyle: 'italic' },
  recentBlock: { marginBottom: 8 },
  label: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  meta: { fontSize: 13 },
  weekSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 10,
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  weekStat: { alignItems: 'center' },
  weekNum: { fontSize: 16, fontWeight: '700' },
  weekLabel: { fontSize: 11, marginTop: 2 },
  dayDotsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 10 },
  dayDotCol: { alignItems: 'center' },
  dayDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 3 },
  dayDotLabel: { fontSize: 10 },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
  },
  ctaText: { fontSize: 14, fontWeight: '700' },
});
