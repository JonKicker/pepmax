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
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors, Theme } from '../../../src/constants/theme';
import { useAuth } from '../../../src/contexts/AuthContext';
import { getTodaysDoses } from '../../../src/services/peptideService';
import { getDailyTotals } from '../../../src/services/nutritionService';
import { getTodaysWorkouts } from '../../../src/services/trainingService';
import { toLocalDateKey } from '../../../src/utils/nutrition';
import type { Dose } from '../../../src/types/peptide';
import type { DailyTotals } from '../../../src/types/nutrition';
import type { WorkoutLog } from '../../../src/types/training';

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

  const [loading, setLoading] = useState(true);
  const [doses, setDoses] = useState<Dose[]>([]);
  const [dosesError, setDosesError] = useState(false);
  const [totals, setTotals] = useState<DailyTotals | null>(null);
  const [nutritionError, setNutritionError] = useState(false);
  const [workouts, setWorkouts] = useState<WorkoutLog[]>([]);
  const [workoutsError, setWorkoutsError] = useState(false);

  const name = userProfile?.firstName ?? '';
  const greeting = name ? `${getGreeting()}, ${name}` : getGreeting();

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function load() {
        setLoading(true);
        setDosesError(false);
        setNutritionError(false);
        setWorkoutsError(false);

        const [dosesResult, nutritionResult, workoutsResult] = await Promise.all([
          getTodaysDoses(),
          getDailyTotals(toLocalDateKey()),
          getTodaysWorkouts(),
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

        if (workoutsResult.error) {
          console.error('[Dashboard] workouts fetch error:', workoutsResult.error);
          setWorkoutsError(true);
        } else {
          setWorkouts(workoutsResult.data ?? []);
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

      {/* Today's Training */}
      <SectionCard title="Today's Training" icon="barbell-outline" iconColor={Colors.gym} colors={colors}>
        {loading ? (
          <ActivityIndicator size="small" color={Colors.gym} style={styles.loader} />
        ) : workoutsError ? (
          <EmptyState message="Could not load today's workouts." colors={colors} />
        ) : workouts.length === 0 ? (
          <EmptyState message="No workouts logged today." colors={colors} />
        ) : (
          workouts.map((w, i) => (
            <View
              key={w.id ?? i}
              style={[styles.doseRow, { borderTopColor: colors.border }]}
            >
              <Text style={[styles.doseName, { color: colors.textPrimary }]} numberOfLines={1}>
                {w.exercises.map((e) => e.name).join(', ')}
              </Text>
              <Text style={[styles.doseAmount, { color: colors.textSecondary }]}>
                {w.exercises.reduce((s, e) => s + e.sets, 0)} sets
              </Text>
            </View>
          ))
        )}
      </SectionCard>

      {/* Body Weight — static, no service yet */}
      <SectionCard title="Body Weight" icon="scale-outline" iconColor={Colors.accent} colors={colors}>
        <EmptyState message="No weight entry today." colors={colors} />
      </SectionCard>
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
});
