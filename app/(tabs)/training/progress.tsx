import React, { useState, useCallback, useMemo, useEffect } from 'react';
import PremiumGate from '../../../src/components/premium/PremiumGate';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  FlatList,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import {
  VictoryChart,
  VictoryLine,
  VictoryBar,
  VictoryAxis,
  VictoryScatter,
} from 'victory-native';
import * as Haptics from 'expo-haptics';
import { Timestamp } from 'firebase/firestore';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import { getCompletedSessions } from '../../../src/services/workoutSessionService';
import { getAllPersonalRecords } from '../../../src/services/personalRecordService';
import {
  estimateOneRepMax,
  formatVolume,
} from '../../../src/utils/training';
import { toLocalDateKey } from '../../../src/utils/nutrition';
import type { WorkoutSession } from '../../../src/types/workout';
import type { PersonalRecord, PRType } from '../../../src/types/personalRecord';
import type { MuscleGroup } from '../../../src/types/exercise';

// ─── Constants ──────────────────────────────────────────────────────────────

const CHART_WIDTH = Dimensions.get('window').width - 40;
const TIME_RANGES = ['1M', '3M', '6M', '1Y', 'All'] as const;
type TimeRange = (typeof TIME_RANGES)[number];

const MUSCLE_PALETTE: Partial<Record<MuscleGroup, string>> = {
  Chest: '#E74C3C',
  Back: '#2E86C1',
  Shoulders: '#E67E22',
  Biceps: '#27AE60',
  Triceps: '#8E44AD',
  Quads: '#1ABC9C',
  Hamstrings: '#D35400',
  Glutes: '#C0392B',
  Core: '#2980B9',
  Calves: '#16A085',
  Forearms: '#F39C12',
  'Full Body': '#7F8C8D',
};

const PR_TYPE_LABELS: Record<PRType, string> = {
  weight: 'Weight',
  volume: 'Volume',
  reps: 'Reps',
  estimated1RM: 'Est. 1RM',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tsToDate(ts: Timestamp | any): Date {
  return ts?.toDate ? ts.toDate() : new Date(ts as any);
}

function getCutoff(range: TimeRange): Date {
  const now = new Date();
  switch (range) {
    case '1M': { const d = new Date(now); d.setMonth(d.getMonth() - 1); return d; }
    case '3M': { const d = new Date(now); d.setMonth(d.getMonth() - 3); return d; }
    case '6M': { const d = new Date(now); d.setMonth(d.getMonth() - 6); return d; }
    case '1Y': { const d = new Date(now); d.setFullYear(d.getFullYear() - 1); return d; }
    case 'All': return new Date(0);
  }
}

function getISOWeek(d: Date): string {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  return `W${weekNum}`;
}

// ─── Time Range Picker ──────────────────────────────────────────────────────

function TimeRangePicker({
  value,
  onChange,
  colors,
}: {
  value: TimeRange;
  onChange: (v: TimeRange) => void;
  colors: any;
}) {
  return (
    <View style={pickerStyles.row}>
      {TIME_RANGES.map((r) => (
        <TouchableOpacity
          key={r}
          onPress={() => { onChange(r); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          style={[
            pickerStyles.chip,
            {
              backgroundColor: value === r ? Colors.gym : colors.surface,
              borderColor: value === r ? Colors.gym : colors.border,
            },
          ]}
        >
          <Text style={[pickerStyles.chipText, { color: value === r ? 'white' : colors.textSecondary }]}>
            {r}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const pickerStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '600' },
});

// ─── Exercise Picker ────────────────────────────────────────────────────────

function ExercisePicker({
  exercises,
  selected,
  onSelect,
  colors,
}: {
  exercises: { id: string; name: string; count: number }[];
  selected: string;
  onSelect: (id: string) => void;
  colors: any;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={exPickerStyles.scroll}>
      {exercises.map((ex) => (
        <TouchableOpacity
          key={ex.id}
          onPress={() => onSelect(ex.id)}
          style={[
            exPickerStyles.chip,
            {
              backgroundColor: selected === ex.id ? Colors.gym : colors.surface,
              borderColor: selected === ex.id ? Colors.gym : colors.border,
            },
          ]}
        >
          <Text
            style={[exPickerStyles.chipText, { color: selected === ex.id ? 'white' : colors.textSecondary }]}
            numberOfLines={1}
          >
            {ex.name}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const exPickerStyles = StyleSheet.create({
  scroll: { marginBottom: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, marginRight: 6 },
  chipText: { fontSize: 12, fontWeight: '600', maxWidth: 120 },
});

// ─── Chart Card Wrapper ─────────────────────────────────────────────────────

function ChartCard({
  title,
  icon,
  children,
  colors,
}: {
  title: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  children: React.ReactNode;
  colors: any;
}) {
  return (
    <View style={[chartCardStyles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={chartCardStyles.header}>
        <Ionicons name={icon} size={18} color={Colors.gym} />
        <Text style={[chartCardStyles.title, { color: colors.textPrimary }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

const chartCardStyles = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '700' },
});

// ─── Empty State ────────────────────────────────────────────────────────────

function ChartEmpty({ message, colors }: { message?: string; colors: any }) {
  return (
    <View style={emptyStyles.container}>
      <Ionicons name="bar-chart-outline" size={32} color={colors.textSecondary} />
      <Text style={[emptyStyles.text, { color: colors.textSecondary }]}>
        {message ?? 'Complete a few workouts to see your progress here!'}
      </Text>
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 24 },
  text: { fontSize: 13, textAlign: 'center', marginTop: 8, fontStyle: 'italic' },
});

// ─── Main Screen ────────────────────────────────────────────────────────────

export default function ProgressScreen() {
  const { colors } = useTheme();

  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [allPRs, setAllPRs] = useState<PersonalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [strengthRange, setStrengthRange] = useState<TimeRange>('3M');
  const [volumeRange, setVolumeRange] = useState<TimeRange>('3M');
  const [muscleRange, setMuscleRange] = useState<TimeRange>('3M');
  const [selectedExercise, setSelectedExercise] = useState('');

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const [sessResult, prResult] = await Promise.all([
          getCompletedSessions(200),
          getAllPersonalRecords(),
        ]);
        if (cancelled) return;
        const s = sessResult.data ?? [];
        setSessions(s);
        setAllPRs(prResult.data ?? []);
        setLoading(false);
      })();
      return () => { cancelled = true; };
    }, []),
  );

  // Exercise frequency map
  const exerciseOptions = useMemo(() => {
    const counts = new Map<string, { name: string; count: number }>();
    for (const s of sessions) {
      for (const e of s.exercises) {
        const existing = counts.get(e.exerciseId);
        if (existing) existing.count++;
        else counts.set(e.exerciseId, { name: e.exerciseName, count: 1 });
      }
    }
    const arr = [...counts.entries()]
      .filter(([, v]) => v.count >= 2)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([id, v]) => ({ id, name: v.name, count: v.count }));
    return arr;
  }, [sessions]);

  // Auto-select most frequent exercise
  useEffect(() => {
    if (!selectedExercise && exerciseOptions.length > 0) {
      setSelectedExercise(exerciseOptions[0].id);
    }
  }, [exerciseOptions, selectedExercise]);

  // ─── Chart 1: Strength Progress ──────────────────────────────────────────

  const strengthData = useMemo(() => {
    if (!selectedExercise) return [];
    const cutoff = getCutoff(strengthRange);
    const points: { x: Date; y: number }[] = [];

    for (const s of sessions) {
      const date = tsToDate(s.startedAt);
      if (date < cutoff) continue;
      for (const e of s.exercises) {
        if (e.exerciseId !== selectedExercise) continue;
        let best1RM = 0;
        for (const set of e.sets) {
          if (!set.completed || set.weight <= 0) continue;
          const e1rm = estimateOneRepMax(set.weight, set.reps);
          if (e1rm > best1RM) best1RM = e1rm;
        }
        if (best1RM > 0) points.push({ x: date, y: best1RM });
      }
    }

    return points.sort((a, b) => a.x.getTime() - b.x.getTime());
  }, [sessions, selectedExercise, strengthRange]);

  // ─── Chart 2: Volume Over Time ───────────────────────────────────────────

  const volumeData = useMemo(() => {
    const cutoff = getCutoff(volumeRange);
    const weekMap = new Map<string, number>();

    for (const s of sessions) {
      const date = tsToDate(s.startedAt);
      if (date < cutoff) continue;
      const week = getISOWeek(date);
      weekMap.set(week, (weekMap.get(week) ?? 0) + s.totalVolume);
    }

    return [...weekMap.entries()].map(([week, vol]) => ({ x: week, y: vol }));
  }, [sessions, volumeRange]);

  const volumeAvg = useMemo(() => {
    if (volumeData.length === 0) return 0;
    return volumeData.reduce((s, d) => s + d.y, 0) / volumeData.length;
  }, [volumeData]);

  // ─── Chart 3: Workout Frequency ──────────────────────────────────────────

  const { markedDates, currentStreak, longestStreak } = useMemo(() => {
    const marks: Record<string, { selected: boolean; selectedColor: string }> = {};
    const workoutDates = new Set<string>();

    for (const s of sessions) {
      const date = tsToDate(s.startedAt);
      const key = toLocalDateKey(date);
      workoutDates.add(key);
      marks[key] = { selected: true, selectedColor: Colors.gym };
    }

    // Calculate streaks
    const sortedDates = [...workoutDates].sort().reverse();
    let current = 0;
    let longest = 0;

    if (sortedDates.length > 0) {
      const today = toLocalDateKey();
      const yesterday = toLocalDateKey(new Date(Date.now() - 86400000));

      if (sortedDates[0] === today || sortedDates[0] === yesterday) {
        let checkDate = new Date(sortedDates[0]);
        while (workoutDates.has(toLocalDateKey(checkDate))) {
          current++;
          checkDate = new Date(checkDate.getTime() - 86400000);
        }
      }

      // Longest streak
      let streak = 0;
      const allSorted = [...workoutDates].sort();
      for (let i = 0; i < allSorted.length; i++) {
        const curr = new Date(allSorted[i]);
        const prev = i > 0 ? new Date(allSorted[i - 1]) : null;
        if (prev && curr.getTime() - prev.getTime() <= 86400000 * 1.5) {
          streak++;
        } else {
          streak = 1;
        }
        if (streak > longest) longest = streak;
      }
    }

    return { markedDates: marks, currentStreak: current, longestStreak: longest };
  }, [sessions]);

  // ─── Chart 4: Muscle Group Distribution ──────────────────────────────────

  const muscleData = useMemo(() => {
    const cutoff = getCutoff(muscleRange);
    const counts = new Map<string, number>();

    for (const s of sessions) {
      if (tsToDate(s.startedAt) < cutoff) continue;
      for (const e of s.exercises) {
        const m = e.primaryMuscle;
        const setCount = e.sets.filter((set) => set.completed).length;
        counts.set(m, (counts.get(m) ?? 0) + setCount);
      }
    }

    const total = [...counts.values()].reduce((s, v) => s + v, 0);
    return [...counts.entries()]
      .map(([muscle, count]) => ({
        muscle: muscle as MuscleGroup,
        count,
        pct: total > 0 ? Math.round((count / total) * 100) : 0,
        color: MUSCLE_PALETTE[muscle as MuscleGroup] ?? Colors.gym,
      }))
      .sort((a, b) => b.count - a.count);
  }, [sessions, muscleRange]);

  // ─── Chart 5: PR Timeline ────────────────────────────────────────────────

  const prTimeline = useMemo(() => {
    const items: { date: string; exercise: string; type: PRType; value: string }[] = [];

    for (const pr of allPRs) {
      if (pr.weightPR) {
        items.push({
          date: pr.weightPR.date,
          exercise: pr.exerciseName,
          type: 'weight',
          value: `${pr.weightPR.value} ${pr.weightPR.unit}`,
        });
      }
      if (pr.volumePR) {
        items.push({
          date: pr.volumePR.date,
          exercise: pr.exerciseName,
          type: 'volume',
          value: `${pr.volumePR.value.toLocaleString()} ${pr.volumePR.unit}`,
        });
      }
      if (pr.estimated1RM) {
        items.push({
          date: pr.estimated1RM.date,
          exercise: pr.exerciseName,
          type: 'estimated1RM',
          value: `${pr.estimated1RM.value} ${pr.estimated1RM.unit}`,
        });
      }
    }

    return items.sort((a, b) => b.date.localeCompare(a.date));
  }, [allPRs]);

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={Colors.gym} size="large" />
      </View>
    );
  }

  if (sessions.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <View style={[styles.emptyIcon, { backgroundColor: Colors.gym + '1A' }]}>
          <Ionicons name="analytics-outline" size={48} color={Colors.gym} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Data Yet</Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          Complete a few workouts to see your progress here!
        </Text>
      </View>
    );
  }

  return (
    <PremiumGate mode="blur">
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.scroll}
    >
      {/* Chart 1: Strength Progress */}
      <ChartCard title="Strength Progress" icon="trending-up-outline" colors={colors}>
        {exerciseOptions.length > 0 && (
          <ExercisePicker
            exercises={exerciseOptions}
            selected={selectedExercise}
            onSelect={setSelectedExercise}
            colors={colors}
          />
        )}
        <TimeRangePicker value={strengthRange} onChange={setStrengthRange} colors={colors} />

        {strengthData.length >= 2 ? (
          <VictoryChart
            width={CHART_WIDTH}
            height={220}
            padding={{ top: 10, bottom: 40, left: 50, right: 20 }}
          >
            <VictoryAxis
              dependentAxis
              style={{
                axis: { stroke: colors.border },
                tickLabels: { fill: colors.textSecondary, fontSize: 10 },
                grid: { stroke: colors.border, strokeDasharray: '4,4' },
              }}
            />
            <VictoryAxis
              style={{
                axis: { stroke: colors.border },
                tickLabels: { fill: colors.textSecondary, fontSize: 9, angle: -30 },
              }}
              tickFormat={(d: Date) =>
                d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              }
            />
            <VictoryLine
              data={strengthData}
              style={{ data: { stroke: Colors.gym, strokeWidth: 2 } }}
            />
            <VictoryScatter
              data={strengthData}
              size={4}
              style={{ data: { fill: Colors.gym } }}
            />
          </VictoryChart>
        ) : (
          <ChartEmpty message="Need at least 2 sessions with this exercise." colors={colors} />
        )}
      </ChartCard>

      {/* Chart 2: Volume Over Time */}
      <ChartCard title="Weekly Volume" icon="bar-chart-outline" colors={colors}>
        <TimeRangePicker value={volumeRange} onChange={setVolumeRange} colors={colors} />

        {volumeData.length >= 1 ? (
          <VictoryChart
            width={CHART_WIDTH}
            height={220}
            domainPadding={{ x: 20 }}
            padding={{ top: 10, bottom: 40, left: 60, right: 20 }}
          >
            <VictoryAxis
              dependentAxis
              style={{
                axis: { stroke: colors.border },
                tickLabels: { fill: colors.textSecondary, fontSize: 10 },
                grid: { stroke: colors.border, strokeDasharray: '4,4' },
              }}
              tickFormat={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
            />
            <VictoryAxis
              style={{
                axis: { stroke: colors.border },
                tickLabels: { fill: colors.textSecondary, fontSize: 10 },
              }}
            />
            <VictoryBar
              data={volumeData}
              style={{ data: { fill: Colors.gym + 'D9' } }}
              cornerRadius={{ top: 4 }}
            />
            {volumeAvg > 0 && (
              <VictoryLine
                data={[
                  { x: volumeData[0]?.x, y: volumeAvg },
                  { x: volumeData[volumeData.length - 1]?.x, y: volumeAvg },
                ]}
                style={{ data: { stroke: Colors.gym, strokeWidth: 1.5, strokeDasharray: '6,4' } }}
              />
            )}
          </VictoryChart>
        ) : (
          <ChartEmpty colors={colors} />
        )}
      </ChartCard>

      {/* Chart 3: Workout Frequency */}
      <ChartCard title="Workout Frequency" icon="calendar-outline" colors={colors}>
        {currentStreak > 0 && (
          <Text style={[styles.streakText, { color: Colors.gym }]}>
            {currentStreak}-day streak!
          </Text>
        )}
        {longestStreak > currentStreak && (
          <Text style={[styles.streakSubtext, { color: colors.textSecondary }]}>
            Longest: {longestStreak} days
          </Text>
        )}
        <Calendar
          markedDates={markedDates}
          theme={{
            backgroundColor: 'transparent',
            calendarBackground: 'transparent',
            textSectionTitleColor: colors.textSecondary,
            dayTextColor: colors.textPrimary,
            todayTextColor: Colors.gym,
            monthTextColor: colors.textPrimary,
            arrowColor: Colors.gym,
            textDisabledColor: colors.textSecondary + '40',
          }}
          style={{ marginHorizontal: -8 }}
        />
      </ChartCard>

      {/* Chart 4: Muscle Group Distribution */}
      <ChartCard title="Muscle Group Distribution" icon="body-outline" colors={colors}>
        <TimeRangePicker value={muscleRange} onChange={setMuscleRange} colors={colors} />

        {muscleData.length > 0 ? (
          <View>
            {muscleData.map((item) => (
              <View key={item.muscle} style={muscleStyles.row}>
                <View style={[muscleStyles.dot, { backgroundColor: item.color }]} />
                <Text style={[muscleStyles.label, { color: colors.textPrimary }]} numberOfLines={1}>
                  {item.muscle}
                </Text>
                <View style={muscleStyles.barTrack}>
                  <View
                    style={[
                      muscleStyles.barFill,
                      {
                        backgroundColor: item.color,
                        width: `${Math.max(item.pct, 3)}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={[muscleStyles.pct, { color: colors.textSecondary }]}>
                  {item.pct}%
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <ChartEmpty colors={colors} />
        )}
      </ChartCard>

      {/* Chart 5: PR Timeline */}
      <ChartCard title="PR Timeline" icon="trophy-outline" colors={colors}>
        {prTimeline.length > 0 ? (
          <FlatList
            data={prTimeline.slice(0, 20)}
            keyExtractor={(_, i) => String(i)}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View style={prTimeStyles.row}>
                <View style={prTimeStyles.dotCol}>
                  <View style={prTimeStyles.dot} />
                  <View style={[prTimeStyles.line, { backgroundColor: Colors.gold + '40' }]} />
                </View>
                <View style={prTimeStyles.content}>
                  <Text style={[prTimeStyles.date, { color: colors.textSecondary }]}>
                    {item.date}
                  </Text>
                  <Text style={[prTimeStyles.exercise, { color: colors.textPrimary }]}>
                    {item.exercise}
                  </Text>
                  <View style={prTimeStyles.typeRow}>
                    <Ionicons name="trophy" size={12} color={Colors.gold} />
                    <Text style={[prTimeStyles.typeText, { color: Colors.gold }]}>
                      {PR_TYPE_LABELS[item.type]}: {item.value}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          />
        ) : (
          <ChartEmpty message="No personal records yet. Keep training!" colors={colors} />
        )}
      </ChartCard>

      <View style={{ height: 40 }} />
    </ScrollView>
    </PremiumGate>
  );
}

// ─── Muscle Bar Styles ──────────────────────────────────────────────────────

const muscleStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  label: { width: 80, fontSize: 12, fontWeight: '600' },
  barTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: '#00000010' },
  barFill: { height: 8, borderRadius: 4 },
  pct: { width: 32, fontSize: 12, fontWeight: '600', textAlign: 'right' },
});

// ─── PR Timeline Styles ─────────────────────────────────────────────────────

const prTimeStyles = StyleSheet.create({
  row: { flexDirection: 'row', marginBottom: 2 },
  dotCol: { alignItems: 'center', width: 24, paddingTop: 6 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.gold },
  line: { width: 2, flex: 1, marginTop: 2 },
  content: { flex: 1, paddingBottom: 14, paddingLeft: 8 },
  date: { fontSize: 11, fontWeight: '600' },
  exercise: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  typeText: { fontSize: 12, fontWeight: '600' },
});

// ─── Main Styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },
  emptyIcon: {
    width: 100, height: 100, borderRadius: 50,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  streakText: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  streakSubtext: { fontSize: 13, marginBottom: 8 },
});
