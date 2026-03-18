/**
 * Dashboard — daily summary.
 *
 * Live sections: Today's Peptides (getTodaysDoses), Today's Nutrition (getDailyTotals).
 * Static empty sections: Today's Training, Body Weight — no services exist yet.
 *
 * Fetch guard: useFocusEffect cleanup sets `cancelled = true` so stale results
 * from rapid tab switches are discarded before calling setState.
 */
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors, Theme } from '../../../src/constants/theme';
import { useAuth } from '../../../src/contexts/AuthContext';
import { getTodaysDoses } from '../../../src/services/peptideService';
import { getDailyTotals } from '../../../src/services/nutritionService';
import { getRecentSessions } from '../../../src/services/workoutSessionService';
import { toLocalDateKey } from '../../../src/utils/nutrition';
import { formatVolume, formatWorkoutDuration, getRelativeTimeLabel, suggestNextTemplate } from '../../../src/utils/training';
import type { Dose } from '../../../src/types/peptide';
import { getTodaysWeight } from '../../../src/services/bodyWeightService';
import { kgToLbs } from '../../../src/utils/tdee';
import type { DailyTotals } from '../../../src/types/nutrition';
import type { WorkoutSession } from '../../../src/types/workout';
import type { BodyWeightEntry } from '../../../src/types/bodyTracking';

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// ─── Section Card ──────────────────────────────────────────────────────────────

function SectionCard({
  title,
  icon,
  iconColor,
  children,
  colors,
}: {
  title: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  children: React.ReactNode;
  colors: Theme['colors'];
}) {
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <Ionicons name={icon} size={18} color={iconColor} />
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

// ─── Empty / Error State ───────────────────────────────────────────────────────

function EmptyState({ message, colors }: { message: string; colors: Theme['colors'] }) {
  return <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{message}</Text>;
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const { colors } = useTheme();
  const { userProfile } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [doses, setDoses] = useState<Dose[]>([]);
  const [dosesError, setDosesError] = useState(false);
  const [totals, setTotals] = useState<DailyTotals | null>(null);
  const [nutritionError, setNutritionError] = useState(false);
  const [recentSessions, setRecentSessions] = useState<WorkoutSession[]>([]);
  const [trainingError, setTrainingError] = useState(false);
  const [bodyWeight, setBodyWeight] = useState<BodyWeightEntry | null>(null);
  const [bodyWeightError, setBodyWeightError] = useState(false);

  const name = userProfile?.firstName ?? '';
  const greeting = name ? `${getGreeting()}, ${name}` : getGreeting();

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function load() {
        setLoading(true);
        setDosesError(false);
        setNutritionError(false);
        setTrainingError(false);
        setBodyWeightError(false);

        const [dosesResult, nutritionResult, sessionsResult, weightResult] = await Promise.all([
          getTodaysDoses(),
          getDailyTotals(toLocalDateKey()),
          getRecentSessions(20),
          getTodaysWeight(todayKey()),
        ]);

        if (cancelled) return;

        if (dosesResult.error) {
          console.error('[Dashboard] doses fetch error:', dosesResult.error);
          setDosesError(true);
        } else {
          setDoses(dosesResult.data ?? []);
        }

        if (nutritionResult.error) {
          console.error('[Dashboard] nutrition fetch error:', nutritionResult.error);
          setNutritionError(true);
        } else {
          setTotals(nutritionResult.data);
        }

        if (sessionsResult.error) {
          console.error('[Dashboard] training fetch error:', sessionsResult.error);
          setTrainingError(true);
        } else {
          setRecentSessions(sessionsResult.data ?? []);
        }

        if (weightResult.error) {
          console.error('[Dashboard] body weight fetch error:', weightResult.error);
          setBodyWeightError(true);
        } else {
          setBodyWeight(weightResult.data ?? null);
        }

        setLoading(false);
      }

      load();

      return () => { cancelled = true; };
    }, []),
  );

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.scroll}
    >
      {/* Greeting */}
      <Text style={[styles.greeting, { color: colors.textPrimary }]}>{greeting}</Text>
      <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>
        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
      </Text>

      {/* Today's Peptides */}
      <SectionCard title="Today's Peptides" icon="eyedrop-outline" iconColor={Colors.accent} colors={colors}>
        {loading ? (
          <ActivityIndicator size="small" color={Colors.accent} style={styles.loader} />
        ) : dosesError ? (
          <EmptyState message="Could not load today's doses." colors={colors} />
        ) : doses.length === 0 ? (
          <EmptyState message="No doses logged today." colors={colors} />
        ) : (
          doses.map((dose, i) => (
            <View
              key={dose.id ?? i}
              style={[styles.doseRow, { borderTopColor: colors.border }]}
            >
              <Text style={[styles.doseName, { color: colors.textPrimary }]}>
                {dose.peptideName}
              </Text>
              <Text style={[styles.doseAmount, { color: colors.textSecondary }]}>
                {dose.amount} {dose.unit}
              </Text>
            </View>
          ))
        )}
      </SectionCard>

      {/* Today's Nutrition */}
      <SectionCard title="Today's Nutrition" icon="nutrition-outline" iconColor={Colors.nutrition} colors={colors}>
        {loading ? (
          <ActivityIndicator size="small" color={Colors.nutrition} style={styles.loader} />
        ) : nutritionError ? (
          <EmptyState message="Could not load nutrition data." colors={colors} />
        ) : !totals || totals.calories === 0 ? (
          <EmptyState message="Log your first meal to see daily totals." colors={colors} />
        ) : (
          <View style={styles.nutritionGrid}>
            <View style={styles.nutritionMain}>
              <Text style={[styles.calorieNum, { color: colors.textPrimary }]}>
                {Math.round(totals.calories).toLocaleString()}
              </Text>
              <Text style={[styles.calorieLabel, { color: colors.textSecondary }]}>kcal</Text>
            </View>
            <View style={styles.macroRow}>
              <Text style={[styles.macroItem, { color: colors.textSecondary }]}>
                P: {Math.round(totals.protein)}g
              </Text>
              <Text style={[styles.macroItem, { color: colors.textSecondary }]}>
                C: {Math.round(totals.carbs)}g
              </Text>
              <Text style={[styles.macroItem, { color: colors.textSecondary }]}>
                F: {Math.round(totals.fat)}g
              </Text>
            </View>
          </View>
        )}
      </SectionCard>

      {/* Training Summary */}
      <SectionCard title="Training" icon="barbell-outline" iconColor={Colors.gym} colors={colors}>
        {loading ? (
          <ActivityIndicator size="small" color={Colors.gym} style={styles.loader} />
        ) : trainingError ? (
          <EmptyState message="Could not load training data." colors={colors} />
        ) : recentSessions.length === 0 ? (
          <EmptyState message="No workouts completed yet." colors={colors} />
        ) : (
          <View>
            {/* Most recent workout */}
            {(() => {
              const last = recentSessions[0];
              const lastDate = last.startedAt?.toDate ? last.startedAt.toDate() : new Date();
              return (
                <View style={styles.trainingRecent}>
                  <Text style={[styles.trainingLabel, { color: colors.textSecondary }]}>Last Workout</Text>
                  <Text style={[styles.trainingTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                    {last.templateName || 'Quick Workout'}
                  </Text>
                  <Text style={[styles.trainingMeta, { color: colors.textSecondary }]}>
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

              const weekSessions = recentSessions.filter((s) => {
                const d = s.startedAt?.toDate ? s.startedAt.toDate() : new Date();
                return d >= weekStart;
              });
              const weekVolume = weekSessions.reduce((sum, s) => sum + s.totalVolume, 0);
              const weekPRs = weekSessions.reduce((sum, s) =>
                sum + s.exercises.flatMap((e) => e.sets).filter((set) => set.isPersonalRecord).length, 0);

              // Day dots (Mon-Sun)
              const dayFlags = Array(7).fill(false);
              for (const s of weekSessions) {
                const d = s.startedAt?.toDate ? s.startedAt.toDate() : new Date();
                const dayIdx = (d.getDay() + 6) % 7; // Mon=0
                dayFlags[dayIdx] = true;
              }

              return (
                <View style={[styles.weekSummary, { borderTopColor: colors.border }]}>
                  <View style={styles.weekStats}>
                    <Text style={[styles.weekStatNum, { color: colors.textPrimary }]}>{weekSessions.length}</Text>
                    <Text style={[styles.weekStatLabel, { color: colors.textSecondary }]}>workouts</Text>
                  </View>
                  <View style={styles.weekStats}>
                    <Text style={[styles.weekStatNum, { color: colors.textPrimary }]}>{formatVolume(weekVolume)}</Text>
                    <Text style={[styles.weekStatLabel, { color: colors.textSecondary }]}>volume</Text>
                  </View>
                  {weekPRs > 0 && (
                    <View style={styles.weekStats}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="trophy" size={14} color={Colors.gold} />
                        <Text style={[styles.weekStatNum, { color: Colors.gold }]}>{weekPRs}</Text>
                      </View>
                      <Text style={[styles.weekStatLabel, { color: colors.textSecondary }]}>PRs</Text>
                    </View>
                  )}
                </View>
              );
            })()}

            {/* Week day dots */}
            {(() => {
              const now = new Date();
              const weekStart = new Date(now);
              const day = weekStart.getDay();
              weekStart.setDate(weekStart.getDate() - (day === 0 ? 6 : day - 1));
              weekStart.setHours(0, 0, 0, 0);

              const dayFlags = Array(7).fill(false);
              for (const s of recentSessions) {
                const d = s.startedAt?.toDate ? s.startedAt.toDate() : new Date();
                if (d >= weekStart) {
                  const dayIdx = (d.getDay() + 6) % 7;
                  dayFlags[dayIdx] = true;
                }
              }
              const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

              return (
                <View style={styles.dayDotsRow}>
                  {dayLabels.map((label, i) => (
                    <View key={i} style={styles.dayDotCol}>
                      <View style={[styles.dayDot, { backgroundColor: dayFlags[i] ? Colors.gym : colors.border }]} />
                      <Text style={[styles.dayDotLabel, { color: colors.textSecondary }]}>{label}</Text>
                    </View>
                  ))}
                </View>
              );
            })()}

            {/* Suggested next workout */}
            {(() => {
              const suggestion = suggestNextTemplate(recentSessions);
              if (!suggestion) return null;
              return (
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    router.push({
                      pathname: '/(tabs)/training/active-session',
                      params: { templateId: suggestion.templateId },
                    });
                  }}
                  style={[styles.suggestBtn, { backgroundColor: Colors.gym + '15', borderColor: Colors.gym + '30' }]}
                  activeOpacity={0.8}
                >
                  <Ionicons name="flash" size={16} color={Colors.gym} />
                  <Text style={[styles.suggestText, { color: Colors.gym }]}>
                    Next: {suggestion.templateName}
                  </Text>
                </TouchableOpacity>
              );
            })()}
          </View>
        )}
      </SectionCard>

      {/* Body Weight */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push('/(tabs)/dashboard/body-tracking');
        }}
      >
        <SectionCard title="Body Weight" icon="scale-outline" iconColor={Colors.body} colors={colors}>
          {loading ? (
            <ActivityIndicator size="small" color={Colors.body} style={styles.loader} />
          ) : bodyWeightError ? (
            <EmptyState message="Could not load weight data." colors={colors} />
          ) : !bodyWeight ? (
            <EmptyState message="No weight entry today. Tap to log." colors={colors} />
          ) : (
            <View style={styles.bodyWeightRow}>
              <Text style={[styles.bodyWeightValue, { color: colors.textPrimary }]}>
                {userProfile?.units === 'imperial'
                  ? (Math.round(kgToLbs(bodyWeight.weight) * 10) / 10).toFixed(1)
                  : (Math.round(bodyWeight.weight * 10) / 10).toFixed(1)}
              </Text>
              <Text style={[styles.bodyWeightUnit, { color: colors.textSecondary }]}>
                {userProfile?.units === 'imperial' ? 'lbs' : 'kg'}
              </Text>
            </View>
          )}
        </SectionCard>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 },

  greeting: { fontSize: 28, fontWeight: '700', marginTop: 8, marginBottom: 2 },
  dateLabel: { fontSize: 13, marginBottom: 20 },

  card: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: '700' },

  loader: { marginVertical: 4 },
  emptyText: { fontSize: 14, fontStyle: 'italic' },

  doseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  doseName: { fontSize: 14, fontWeight: '600' },
  doseAmount: { fontSize: 13 },

  nutritionGrid: { gap: 6 },
  nutritionMain: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  calorieNum: { fontSize: 32, fontWeight: '800' },
  calorieLabel: { fontSize: 13 },
  macroRow: { flexDirection: 'row', gap: 16 },
  macroItem: { fontSize: 13 },

  trainingRecent: { marginBottom: 8 },
  trainingLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  trainingTitle: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  trainingMeta: { fontSize: 13 },

  weekSummary: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingTop: 10, marginTop: 8, borderTopWidth: StyleSheet.hairlineWidth,
  },
  weekStats: { alignItems: 'center' },
  weekStatNum: { fontSize: 16, fontWeight: '700' },
  weekStatLabel: { fontSize: 11, marginTop: 2 },

  dayDotsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 10 },
  dayDotCol: { alignItems: 'center' },
  dayDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 3 },
  dayDotLabel: { fontSize: 10 },

  suggestBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1, marginTop: 10,
  },
  suggestText: { fontSize: 14, fontWeight: '700' },

  bodyWeightRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  bodyWeightValue: { fontSize: 32, fontWeight: '800' },
  bodyWeightUnit: { fontSize: 14 },
});
