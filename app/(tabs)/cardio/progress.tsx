import React, { useState } from 'react';
import PremiumGate from '../../../src/components/premium/PremiumGate';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  VictoryChart,
  VictoryLine,
  VictoryBar,
  VictoryAxis,
  VictoryScatter,
  VictoryVoronoiContainer,
  VictoryTooltip,
} from 'victory-native';
import { Calendar } from 'react-native-calendars';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import { useCardioSettings } from '../../../src/hooks/useCardioSettings';
import { useCardioProgress, type TimeRange } from '../../../src/hooks/useCardioProgress';
import {
  formatPace,
  formatDistance,
  formatDuration,
  metersToMiles,
  metersToKm,
  PR_LABELS,
  formatPRValue,
} from '../../../src/utils/cardio';
import type { ActivityType, CardioPR, DistanceUnit } from '../../../src/types/cardio';

const CHART_WIDTH = Dimensions.get('window').width - 40;

// ─── Pickers ──────────────────────────────────────────────────────────────────

const ACTIVITY_OPTIONS: { value: ActivityType | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'run', label: 'Run' },
  { value: 'cycle', label: 'Cycle' },
  { value: 'walk', label: 'Walk' },
  { value: 'swim', label: 'Swim' },
];

const TIME_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: '1m', label: '1M' },
  { value: '3m', label: '3M' },
  { value: '6m', label: '6M' },
  { value: '1y', label: '1Y' },
  { value: 'all', label: 'All' },
];

function ChipRow<T extends string>({
  options,
  selected,
  onSelect,
  colors,
}: {
  options: { value: T; label: string }[];
  selected: T;
  onSelect: (v: T) => void;
  colors: any;
}) {
  return (
    <View style={styles.chipRow}>
      {options.map((o) => (
        <TouchableOpacity
          key={o.value}
          style={[styles.chip, {
            backgroundColor: selected === o.value ? Colors.cardio : colors.surface,
            borderColor: selected === o.value ? Colors.cardio : colors.border,
          }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onSelect(o.value);
          }}
          activeOpacity={0.8}
        >
          <Text style={[styles.chipText, { color: selected === o.value ? 'white' : colors.textPrimary }]}>
            {o.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle, colors }: { title: string; subtitle?: string; colors: any }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
      {subtitle && <Text style={[styles.sectionSubtitle, { color: Colors.cardio }]}>{subtitle}</Text>}
    </View>
  );
}

// PR_LABELS and formatPRValue imported from src/utils/cardio (DRY)

// ─── Activity heatmap colors ──────────────────────────────────────────────────

const ACTIVITY_DOT_COLORS: Record<string, string> = {
  run: '#E74C3C',
  cycle: '#2E86C1',
  walk: '#27AE60',
  swim: '#1ABC9C',
};

// ─── Main screen ───────────────────────────────────────────────────────────────

export default function ProgressScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { settings } = useCardioSettings();
  const unit = settings.distanceUnit;

  const [activityType, setActivityType] = useState<ActivityType | 'all'>('all');
  const [timeRange, setTimeRange] = useState<TimeRange>('3m');

  const {
    paceTrend,
    paceTrendLabel,
    distanceByWeek,
    frequencyByDay,
    personalBests,
    currentStreak,
    longestStreak,
    loading,
    error,
  } = useCardioProgress(activityType, timeRange);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={Colors.cardio} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="cloud-offline-outline" size={48} color={colors.textSecondary} />
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          Could not load progress data.
        </Text>
      </View>
    );
  }

  // Calendar marked dates
  const markedDates: Record<string, any> = {};
  for (const fd of frequencyByDay) {
    markedDates[fd.date] = {
      marked: true,
      dotColor: ACTIVITY_DOT_COLORS[fd.activityType] ?? Colors.cardio,
    };
  }

  // Running average for distance chart
  const distAvg = distanceByWeek.length > 0
    ? distanceByWeek.reduce((sum, d) => sum + d.y, 0) / distanceByWeek.length
    : 0;

  return (
    <PremiumGate mode="blur" fullScreen>
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Pickers */}
      <ChipRow options={ACTIVITY_OPTIONS} selected={activityType} onSelect={setActivityType} colors={colors} />
      <ChipRow options={TIME_OPTIONS} selected={timeRange} onSelect={setTimeRange} colors={colors} />

      {/* ── Chart 1: Pace Trend ─────────────────────────────────── */}
      <SectionHeader title="Pace Trend" subtitle={paceTrendLabel || undefined} colors={colors} />
      {paceTrend.length >= 2 ? (
        <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <VictoryChart
            width={CHART_WIDTH}
            height={200}
            padding={{ top: 16, bottom: 36, left: 50, right: 16 }}
            containerComponent={
              <VictoryVoronoiContainer
                voronoiDimension="x"
                labels={({ datum }: { datum: { x: Date; y: number } }) => {
                  const m = Math.floor(datum.y / 60);
                  const s = Math.floor(datum.y % 60);
                  const dateStr = datum.x instanceof Date
                    ? datum.x.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : String(datum.x);
                  return `${dateStr}\n${m}:${String(s).padStart(2, '0')}/${unit === 'mi' ? 'mi' : 'km'}`;
                }}
                labelComponent={
                  <VictoryTooltip
                    flyoutStyle={{ fill: '#1C1C1E', stroke: 'transparent' }}
                    style={{ fill: '#FFFFFF', fontSize: 10 }}
                    cornerRadius={6}
                    flyoutPadding={{ top: 6, bottom: 6, left: 10, right: 10 }}
                  />
                }
              />
            }
          >
            <VictoryAxis
              style={{
                axis: { stroke: colors.border },
                tickLabels: { fill: colors.textSecondary, fontSize: 9, angle: -30 },
              }}
              tickFormat={(d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              tickCount={Math.min(6, paceTrend.length)}
            />
            <VictoryAxis
              dependentAxis
              style={{
                axis: { stroke: colors.border },
                tickLabels: { fill: colors.textSecondary, fontSize: 9 },
                grid: { stroke: colors.border, strokeDasharray: '3,3' },
              }}
              tickFormat={(t: number) => {
                const m = Math.floor(t / 60);
                const s = Math.floor(t % 60);
                return `${m}:${String(s).padStart(2, '0')}`;
              }}
              invertAxis
            />
            <VictoryLine
              data={paceTrend}
              style={{ data: { stroke: Colors.cardio, strokeWidth: 2 } }}
              interpolation="monotoneX"
            />
            <VictoryScatter
              data={paceTrend}
              size={3}
              style={{ data: { fill: Colors.cardio } }}
            />
          </VictoryChart>
        </View>
      ) : (
        <View style={[styles.emptyChart, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="analytics-outline" size={32} color={colors.textSecondary} />
          <Text style={[styles.emptyChartText, { color: colors.textSecondary }]}>
            Complete 2+ sessions to see pace trends
          </Text>
        </View>
      )}

      {/* ── Chart 2: Distance Over Time ─────────────────────────── */}
      <SectionHeader title="Weekly Distance" colors={colors} />
      {distanceByWeek.length >= 1 ? (
        <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <VictoryChart
            width={CHART_WIDTH}
            height={200}
            domainPadding={{ x: 20 }}
            padding={{ top: 16, bottom: 36, left: 50, right: 16 }}
          >
            <VictoryAxis
              style={{
                axis: { stroke: colors.border },
                tickLabels: { fill: colors.textSecondary, fontSize: 8 },
              }}
              tickFormat={(t: number) => {
                const wk = distanceByWeek[t - 1];
                return wk ? wk.x.split('-W')[1] : '';
              }}
              tickCount={Math.min(8, distanceByWeek.length)}
            />
            <VictoryAxis
              dependentAxis
              style={{
                axis: { stroke: colors.border },
                tickLabels: { fill: colors.textSecondary, fontSize: 9 },
                grid: { stroke: colors.border, strokeDasharray: '3,3' },
              }}
              tickFormat={(t: number) => {
                const val = unit === 'mi' ? metersToMiles(t) : metersToKm(t);
                return val >= 10 ? Math.round(val).toString() : val.toFixed(1);
              }}
            />
            {distAvg > 0 && (
              <VictoryLine
                data={[
                  { x: 0.5, y: distAvg },
                  { x: distanceByWeek.length + 0.5, y: distAvg },
                ]}
                style={{ data: { stroke: Colors.cardio, strokeDasharray: '5,4', strokeWidth: 1.5 } }}
              />
            )}
            <VictoryBar
              data={distanceByWeek.map((d, i) => ({ x: i + 1, y: d.y }))}
              style={{ data: { fill: Colors.cardio, opacity: 0.85 } }}
              barRatio={0.6}
              cornerRadius={{ top: 4 }}
            />
          </VictoryChart>
        </View>
      ) : (
        <View style={[styles.emptyChart, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="bar-chart-outline" size={32} color={colors.textSecondary} />
          <Text style={[styles.emptyChartText, { color: colors.textSecondary }]}>
            Complete a session to see weekly distance
          </Text>
        </View>
      )}

      {/* ── Chart 3: Activity Heatmap ──────────────────────────── */}
      <SectionHeader title="Activity Calendar" colors={colors} />
      <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Calendar
          markedDates={markedDates}
          markingType="dot"
          theme={{
            calendarBackground: 'transparent',
            textSectionTitleColor: colors.textSecondary,
            dayTextColor: colors.textPrimary,
            textDisabledColor: colors.textSecondary + '50',
            todayTextColor: Colors.cardio,
            monthTextColor: colors.textPrimary,
            arrowColor: Colors.cardio,
          }}
          style={styles.calendar}
        />
        <View style={styles.streakRow}>
          <View style={styles.streakItem}>
            <Ionicons name="flame" size={16} color={Colors.cardio} />
            <Text style={[styles.streakLabel, { color: colors.textSecondary }]}>Current</Text>
            <Text style={[styles.streakValue, { color: colors.textPrimary }]}>{currentStreak} day{currentStreak !== 1 ? 's' : ''}</Text>
          </View>
          <View style={styles.streakItem}>
            <Ionicons name="trophy" size={16} color="#FFD700" />
            <Text style={[styles.streakLabel, { color: colors.textSecondary }]}>Longest</Text>
            <Text style={[styles.streakValue, { color: colors.textPrimary }]}>{longestStreak} day{longestStreak !== 1 ? 's' : ''}</Text>
          </View>
        </View>
      </View>

      {/* ── Chart 4: Personal Bests ───────────────────────────── */}
      <SectionHeader title="Personal Bests" colors={colors} />
      {personalBests.length > 0 ? (
        <View style={[styles.prsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {personalBests.map((pr) => (
            <TouchableOpacity
              key={pr.metric}
              style={[styles.prRow, { borderBottomColor: colors.border }]}
              onPress={() => router.push({
                pathname: '/(tabs)/cardio/session-detail',
                params: { sessionId: pr.sessionId },
              })}
              activeOpacity={0.8}
            >
              <Ionicons name="trophy" size={18} color="#FFD700" />
              <View style={styles.prInfo}>
                <Text style={[styles.prLabel, { color: colors.textSecondary }]}>
                  {PR_LABELS[pr.metric] ?? pr.metric}
                </Text>
                <Text style={[styles.prValue, { color: colors.textPrimary }]}>
                  {formatPRValue(pr, unit)}
                </Text>
              </View>
              <Text style={[styles.prDate, { color: colors.textSecondary }]}>
                {pr.achievedAt.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </Text>
              <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={[styles.emptyChart, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="trophy-outline" size={32} color={colors.textSecondary} />
          <Text style={[styles.emptyChartText, { color: colors.textSecondary }]}>
            Complete sessions to set personal records
          </Text>
        </View>
      )}
    </ScrollView>
    </PremiumGate>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  errorText: { fontSize: 15, textAlign: 'center' },
  content: { padding: 16, paddingBottom: 48, gap: 10 },

  chipRow: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontWeight: '600' },

  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  sectionSubtitle: { fontSize: 13, fontWeight: '600' },

  chartCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden', padding: 4 },
  emptyChart: {
    borderRadius: 14,
    borderWidth: 1,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyChartText: { fontSize: 13, textAlign: 'center', paddingHorizontal: 24 },

  calendar: { borderRadius: 12 },
  streakRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12 },
  streakItem: { alignItems: 'center', gap: 4 },
  streakLabel: { fontSize: 11 },
  streakValue: { fontSize: 15, fontWeight: '700' },

  prsCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  prRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  prInfo: { flex: 1 },
  prLabel: { fontSize: 12, fontWeight: '600' },
  prValue: { fontSize: 16, fontWeight: '700' },
  prDate: { fontSize: 12 },
});
