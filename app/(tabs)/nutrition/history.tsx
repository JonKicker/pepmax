import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import {
  VictoryChart,
  VictoryLine,
  VictoryBar,
  VictoryStack,
  VictoryAxis,
  VictoryScatter,
} from 'victory-native';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors, Theme } from '../../../src/constants/theme';
import { useAuth } from '../../../src/contexts/AuthContext';
import { getLogsForDateRange } from '../../../src/services/nutritionService';
import { toLocalDateKey } from '../../../src/utils/nutrition';
import { DEFAULT_MEAL_SLOTS } from '../../../src/types/nutrition';
import type { FoodLogEntry, MealSlotConfig } from '../../../src/types/nutrition';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 40; // 20px padding each side

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dateRange(year: number, month: number): { startDate: string; endDate: string } {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { startDate: start, endDate: end };
}

function groupByDate(entries: FoodLogEntry[]): Record<string, FoodLogEntry[]> {
  const grouped: Record<string, FoodLogEntry[]> = {};
  for (const entry of entries) {
    if (!grouped[entry.date]) grouped[entry.date] = [];
    grouped[entry.date].push(entry);
  }
  return grouped;
}

function sumEntries(entries: FoodLogEntry[]) {
  return entries.reduce(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      protein: acc.protein + e.protein,
      carbs: acc.carbs + e.carbs,
      fat: acc.fat + e.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

/** Dot color for a day based on calorie adherence. */
function dotColor(calories: number, target: number): string {
  if (!target) return '#888';
  const diff = calories - target;
  if (Math.abs(diff) <= 100) return '#4CAF50'; // green — within 100 cal
  if (diff > 300) return Colors.error;          // red — more than 300 over
  if (Math.abs(diff) <= 300) return Colors.warning; // yellow — 100–300 off
  return '#888'; // gray — more than 300 under (incomplete log)
}

// ─── Day Detail ───────────────────────────────────────────────────────────────

function DayDetail({
  date,
  entries,
  target,
  activeSlots,
  colors,
}: {
  date: string;
  entries: FoodLogEntry[];
  target: { calories: number; protein: number; carbs: number; fat: number };
  activeSlots: MealSlotConfig[];
  colors: Theme['colors'];
}) {
  const [expandedSlots, setExpandedSlots] = useState<Record<string, boolean>>({});
  const totals = sumEntries(entries);

  const label = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  // Group entries by slot; orphans go to "Other"
  const activeSlotIds = new Set(activeSlots.map((s) => s.id));
  const bySlot: Record<string, FoodLogEntry[]> = {};
  const orphaned: FoodLogEntry[] = [];
  for (const entry of entries) {
    if (activeSlotIds.has(entry.mealSlot)) {
      if (!bySlot[entry.mealSlot]) bySlot[entry.mealSlot] = [];
      bySlot[entry.mealSlot].push(entry);
    } else {
      orphaned.push(entry);
    }
  }

  const toggleSlot = (id: string) =>
    setExpandedSlots((prev) => ({ ...prev, [id]: !prev[id] }));

  const slotSections = [
    ...activeSlots.map((s) => ({ id: s.id, label: s.label, items: bySlot[s.id] ?? [] })),
    ...(orphaned.length > 0 ? [{ id: '__other__', label: 'Other', items: orphaned }] : []),
  ].filter((s) => s.items.length > 0);

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.dayLabel, { color: colors.textPrimary }]}>{label}</Text>

      {entries.length === 0 ? (
        <Text style={[styles.emptyDay, { color: colors.textSecondary }]}>
          No meals logged on this day.
        </Text>
      ) : (
        <>
          {/* Totals row */}
          <View style={[styles.totalsRow, { borderBottomColor: colors.border }]}>
            <TotalPill label="Cal" value={Math.round(totals.calories)} target={target.calories} color={Colors.nutrition} colors={colors} />
            <TotalPill label="Pro" value={Math.round(totals.protein)} target={target.protein} color="#4A90D9" colors={colors} unit="g" />
            <TotalPill label="Carbs" value={Math.round(totals.carbs)} target={target.carbs} color={Colors.warning} colors={colors} unit="g" />
            <TotalPill label="Fat" value={Math.round(totals.fat)} target={target.fat} color={Colors.error} colors={colors} unit="g" />
          </View>

          {/* Meal breakdown */}
          {slotSections.map((section) => (
            <View key={section.id}>
              <TouchableOpacity
                style={styles.slotHeader}
                onPress={() => toggleSlot(section.id)}
              >
                <Ionicons
                  name={expandedSlots[section.id] === false ? 'chevron-forward' : 'chevron-down'}
                  size={14}
                  color={colors.textSecondary}
                />
                <Text style={[styles.slotTitle, { color: colors.textPrimary }]}>{section.label}</Text>
                <Text style={[styles.slotCal, { color: Colors.nutrition }]}>
                  {Math.round(section.items.reduce((s, e) => s + e.calories, 0))} kcal
                </Text>
              </TouchableOpacity>
              {expandedSlots[section.id] !== false &&
                section.items.map((entry) => (
                  <View key={entry.id} style={[styles.entryRow, { borderBottomColor: colors.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.entryName, { color: colors.textPrimary }]} numberOfLines={1}>
                        {entry.foodName}
                      </Text>
                      <Text style={[styles.entryServing, { color: colors.textSecondary }]}>
                        {entry.servingSize} {entry.servingUnit}
                      </Text>
                    </View>
                    <Text style={[styles.entryCal, { color: colors.textPrimary }]}>
                      {Math.round(entry.calories)} kcal
                    </Text>
                  </View>
                ))}
            </View>
          ))}
        </>
      )}
    </View>
  );
}

function TotalPill({
  label,
  value,
  target,
  color,
  unit = '',
  colors,
}: {
  label: string;
  value: number;
  target: number;
  color: string;
  unit?: string;
  colors: Theme['colors'];
}) {
  return (
    <View style={styles.totalPill}>
      <Text style={[styles.totalPillLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.totalPillValue, { color }]}>{value}{unit}</Text>
      <Text style={[styles.totalPillTarget, { color: colors.textSecondary }]}>/ {target}{unit}</Text>
    </View>
  );
}

// ─── Weekly Averages ──────────────────────────────────────────────────────────

function WeeklyAveragesCard({
  byDate,
  target,
  colors,
}: {
  byDate: Record<string, FoodLogEntry[]>;
  target: { calories: number; protein: number; carbs: number; fat: number };
  colors: Theme['colors'];
}) {
  // Rolling last 7 days from today
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(toLocalDateKey(d));
  }

  const daysWithData = days.filter((d) => (byDate[d]?.length ?? 0) > 0);
  if (daysWithData.length === 0) return null;

  const totals = daysWithData.map((d) => sumEntries(byDate[d] ?? []));
  const count = totals.length;
  const avg = {
    calories: Math.round(totals.reduce((s, t) => s + t.calories, 0) / count),
    protein: Math.round(totals.reduce((s, t) => s + t.protein, 0) / count),
    carbs: Math.round(totals.reduce((s, t) => s + t.carbs, 0) / count),
    fat: Math.round(totals.reduce((s, t) => s + t.fat, 0) / count),
  };

  function avgColor(avgVal: number, targetVal: number): string {
    if (!targetVal) return colors.textPrimary;
    const pct = Math.abs(avgVal - targetVal) / targetVal;
    if (pct <= 0.1) return '#4CAF50';
    if (pct <= 0.2) return Colors.warning;
    return Colors.error;
  }

  function pctLabel(avgVal: number, targetVal: number): string {
    if (!targetVal) return '';
    return ` — ${Math.round((avgVal / targetVal) * 100)}% of target`;
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        7-DAY ROLLING AVERAGES
      </Text>
      {[
        { label: 'Avg Calories', val: avg.calories, tgt: target.calories, unit: 'cal' },
        { label: 'Avg Protein', val: avg.protein, tgt: target.protein, unit: 'g' },
        { label: 'Avg Carbs', val: avg.carbs, tgt: target.carbs, unit: 'g' },
        { label: 'Avg Fat', val: avg.fat, tgt: target.fat, unit: 'g' },
      ].map(({ label, val, tgt, unit }) => (
        <View key={label} style={[styles.avgRow, { borderBottomColor: colors.border }]}>
          <Text style={[styles.avgLabel, { color: colors.textPrimary }]}>{label}</Text>
          <Text style={[styles.avgValue, { color: avgColor(val, tgt) }]}>
            {val.toLocaleString()} {unit}{pctLabel(val, tgt)}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ─── Charts ───────────────────────────────────────────────────────────────────

/**
 * Chart 1 — Calorie trend line for the current month.
 * Guard: requires ≥ 2 data points. VictoryLine with a single point has no domain.
 */
function CalorieTrendChart({
  byDate,
  year,
  month,
  calorieTarget,
  colors,
}: {
  byDate: Record<string, FoodLogEntry[]>;
  year: number;
  month: number;
  calorieTarget: number;
  colors: Theme['colors'];
}) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const data: { x: number; y: number; over: boolean }[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (byDate[key]?.length) {
      const cal = sumEntries(byDate[key]).calories;
      data.push({ x: d, y: cal, over: cal > calorieTarget });
    }
  }

  // Per-chart guard: need at least 2 points for a meaningful line
  if (data.length < 2) return null;

  const maxY = Math.max(...data.map((d) => d.y), calorieTarget * 1.1);

  return (
    <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>CALORIE TREND</Text>
      <VictoryChart width={CHART_WIDTH} height={200} padding={{ top: 16, bottom: 36, left: 50, right: 16 }}>
        <VictoryAxis
          style={{ tickLabels: { fontSize: 9, fill: colors.textSecondary }, axis: { stroke: colors.border } }}
          tickFormat={(t: number) => String(t)}
        />
        <VictoryAxis
          dependentAxis
          style={{ tickLabels: { fontSize: 9, fill: colors.textSecondary }, axis: { stroke: colors.border }, grid: { stroke: colors.border, strokeDasharray: '3,3' } }}
          tickFormat={(t: number) => `${Math.round(t / 100) * 100}`}
          domain={[0, maxY]}
        />
        {/* Target reference line */}
        {calorieTarget > 0 && (
          <VictoryLine
            data={[{ x: 1, y: calorieTarget }, { x: daysInMonth, y: calorieTarget }]}
            style={{ data: { stroke: Colors.warning, strokeDasharray: '5,4', strokeWidth: 1.5 } }}
          />
        )}
        {/* Calorie line */}
        <VictoryLine
          data={data}
          style={{ data: { stroke: Colors.nutrition, strokeWidth: 2 } }}
          interpolation="monotoneX"
        />
        {/* Colored dots — red over target, green under */}
        <VictoryScatter
          data={data}
          size={3}
          style={{ data: { fill: ({ datum }: any) => datum.over ? Colors.error : '#4CAF50' } }}
        />
      </VictoryChart>
    </View>
  );
}

/**
 * Chart 2 — Macro distribution stacked bar for last 14 days.
 * Guard: requires ≥ 1 day of data.
 */
function MacroStackedChart({
  byDate,
  colors,
}: {
  byDate: Record<string, FoodLogEntry[]>;
  colors: Theme['colors'];
}) {
  const days: string[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(toLocalDateKey(d));
  }

  const daysWithData = days.filter((d) => (byDate[d]?.length ?? 0) > 0);
  // Per-chart guard
  if (daysWithData.length < 1) return null;

  const labels = daysWithData.map((d) => d.slice(5)); // MM-DD
  const proteinData = daysWithData.map((d, i) => ({ x: i + 1, y: Math.round(sumEntries(byDate[d]).protein) }));
  const carbsData = daysWithData.map((d, i) => ({ x: i + 1, y: Math.round(sumEntries(byDate[d]).carbs) }));
  const fatData = daysWithData.map((d, i) => ({ x: i + 1, y: Math.round(sumEntries(byDate[d]).fat) }));

  return (
    <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>MACRO DISTRIBUTION (14 DAYS)</Text>
      <View style={styles.chartLegend}>
        <LegendDot color="#4A90D9" label="Protein" colors={colors} />
        <LegendDot color={Colors.warning} label="Carbs" colors={colors} />
        <LegendDot color={Colors.error} label="Fat" colors={colors} />
      </View>
      <VictoryChart width={CHART_WIDTH} height={200} padding={{ top: 8, bottom: 36, left: 44, right: 8 }}>
        <VictoryAxis
          style={{ tickLabels: { fontSize: 8, fill: colors.textSecondary }, axis: { stroke: colors.border } }}
          tickFormat={(t: number) => labels[t - 1] ?? ''}
          tickCount={Math.min(7, daysWithData.length)}
        />
        <VictoryAxis
          dependentAxis
          style={{ tickLabels: { fontSize: 9, fill: colors.textSecondary }, axis: { stroke: colors.border } }}
        />
        <VictoryStack>
          <VictoryBar data={proteinData} style={{ data: { fill: '#4A90D9' } }} />
          <VictoryBar data={carbsData} style={{ data: { fill: Colors.warning } }} />
          <VictoryBar data={fatData} style={{ data: { fill: Colors.error } }} />
        </VictoryStack>
      </VictoryChart>
    </View>
  );
}

/**
 * Chart 3 — Weekly average calorie bar chart for last 8 weeks.
 * Guard: requires ≥ 1 week with data.
 */
function WeeklyAvgBarChart({
  byDate,
  calorieTarget,
  colors,
}: {
  byDate: Record<string, FoodLogEntry[]>;
  calorieTarget: number;
  colors: Theme['colors'];
}) {
  // Build 8 weeks of data (most recent week last)
  const weeks: { label: string; avg: number }[] = [];
  for (let w = 7; w >= 0; w--) {
    const dayTotals: number[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date();
      date.setDate(date.getDate() - w * 7 - d);
      const key = toLocalDateKey(date);
      if (byDate[key]?.length) {
        dayTotals.push(sumEntries(byDate[key]).calories);
      }
    }
    if (dayTotals.length > 0) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - w * 7 - 6);
      weeks.push({
        label: weekStart.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }),
        avg: Math.round(dayTotals.reduce((s, v) => s + v, 0) / dayTotals.length),
      });
    }
  }

  // Per-chart guard
  if (weeks.length < 1) return null;

  const barData = weeks.map((w, i) => ({ x: i + 1, y: w.avg }));
  const maxY = Math.max(...barData.map((d) => d.y), calorieTarget * 1.1);

  return (
    <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>WEEKLY CALORIE AVERAGES</Text>
      <VictoryChart width={CHART_WIDTH} height={200} padding={{ top: 16, bottom: 36, left: 50, right: 8 }}>
        <VictoryAxis
          style={{ tickLabels: { fontSize: 8, fill: colors.textSecondary }, axis: { stroke: colors.border } }}
          tickFormat={(t: number) => weeks[t - 1]?.label ?? ''}
        />
        <VictoryAxis
          dependentAxis
          style={{ tickLabels: { fontSize: 9, fill: colors.textSecondary }, axis: { stroke: colors.border }, grid: { stroke: colors.border, strokeDasharray: '3,3' } }}
          domain={[0, maxY]}
        />
        {calorieTarget > 0 && (
          <VictoryLine
            data={[{ x: 0.5, y: calorieTarget }, { x: weeks.length + 0.5, y: calorieTarget }]}
            style={{ data: { stroke: Colors.warning, strokeDasharray: '5,4', strokeWidth: 1.5 } }}
          />
        )}
        <VictoryBar
          data={barData}
          style={{ data: { fill: Colors.nutrition, opacity: 0.85 } }}
          barRatio={0.6}
        />
      </VictoryChart>
    </View>
  );
}

function LegendDot({ color, label, colors }: { color: string; label: string; colors: Theme['colors'] }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function NutritionHistoryScreen() {
  const { colors } = useTheme();
  const { userProfile } = useAuth();

  // toLocalDateKey() with no args calls new Date() internally — no stale closure risk
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });
  const [selectedDate, setSelectedDate] = useState(() => toLocalDateKey());

  const [monthEntries, setMonthEntries] = useState<FoodLogEntry[]>([]);
  const [rollingEntries, setRollingEntries] = useState<FoodLogEntry[]>([]);

  // Separate loading/error states so month transitions don't re-fetch the
  // rolling 56-day window, and the rolling fetch doesn't block calendar navigation.
  const [monthLoading, setMonthLoading] = useState(true);
  const [rollingLoading, setRollingLoading] = useState(true);
  const [monthError, setMonthError] = useState<string | null>(null);
  const [rollingError, setRollingError] = useState<string | null>(null);

  const target = {
    calories: userProfile?.calorieTarget ?? 2000,
    protein: userProfile?.macros?.proteinG ?? 150,
    carbs: userProfile?.macros?.carbsG ?? 200,
    fat: userProfile?.macros?.fatG ?? 65,
  };

  const activeSlots: MealSlotConfig[] = userProfile?.mealSlots ?? DEFAULT_MEAL_SLOTS;

  // Calendar month data — re-fetched whenever the displayed month changes.
  const fetchMonthData = useCallback(async (year: number, month: number) => {
    setMonthLoading(true);
    setMonthError(null);
    const { startDate, endDate } = dateRange(year, month);
    const result = await getLogsForDateRange(startDate, endDate);
    if (result.error) {
      setMonthError('Failed to load this month.');
    } else {
      setMonthEntries(result.data ?? []);
    }
    setMonthLoading(false);
  }, []);

  // Rolling 56-day data — fetched once on mount. Independent of calendar month.
  // new Date() is computed fresh inside the callback — no stale closure.
  const fetchRollingData = useCallback(async () => {
    setRollingLoading(true);
    setRollingError(null);
    const now = new Date();                          // fresh on every call
    const rollingEnd = toLocalDateKey(now);
    const rollingStart = (() => {
      const d = new Date();
      d.setDate(d.getDate() - 55);
      return toLocalDateKey(d);
    })();
    const result = await getLogsForDateRange(rollingStart, rollingEnd);
    if (result.error) {
      setRollingError('Failed to load trend data.');
    } else {
      setRollingEntries(result.data ?? []);
    }
    setRollingLoading(false);
  }, []);

  // Month data — re-fetch on calendar month change
  useEffect(() => {
    fetchMonthData(currentMonth.year, currentMonth.month);
  }, [currentMonth.year, currentMonth.month]);

  // Rolling data — fetch once on mount only
  useEffect(() => {
    fetchRollingData();
  }, []);

  const monthByDate = groupByDate(monthEntries);
  const rollingByDate = groupByDate(rollingEntries);

  // Total days with any data across rolling window (for empty state)
  const daysWithAnyData = Object.keys(rollingByDate).length;

  // Build markedDates for the calendar
  const markedDates: Record<string, object> = {};
  for (const [date, entries] of Object.entries(monthByDate)) {
    if (entries.length === 0) continue;
    const cal = sumEntries(entries).calories;
    markedDates[date] = {
      marked: true,
      dotColor: dotColor(cal, target.calories),
    };
  }
  // Selected day overlay
  markedDates[selectedDate] = {
    ...(markedDates[selectedDate] ?? {}),
    selected: true,
    selectedColor: Colors.nutrition,
  };

  const calendarTheme = {
    backgroundColor: colors.background,
    calendarBackground: colors.surface,
    textSectionTitleColor: colors.textSecondary,
    selectedDayBackgroundColor: Colors.nutrition,
    selectedDayTextColor: 'white',
    todayTextColor: Colors.nutrition,
    dayTextColor: colors.textPrimary,
    textDisabledColor: colors.textSecondary + '80',
    dotColor: Colors.nutrition,
    arrowColor: Colors.nutrition,
    monthTextColor: colors.textPrimary,
    textDayFontSize: 14,
    textMonthFontSize: 15,
    textDayHeaderFontSize: 12,
  };

  // Full-screen spinner only on initial load (both fetches pending, no data yet)
  const initialLoad = (monthLoading || rollingLoading) &&
    monthEntries.length === 0 && rollingEntries.length === 0;

  const anyError = monthError ?? rollingError;

  if (initialLoad) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={Colors.nutrition} size="large" />
      </View>
    );
  }

  if (anyError && monthEntries.length === 0 && rollingEntries.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="cloud-offline-outline" size={48} color={colors.textSecondary} />
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>{anyError}</Text>
        <TouchableOpacity
          style={[styles.retryBtn, { backgroundColor: Colors.nutrition }]}
          onPress={() => {
            fetchMonthData(currentMonth.year, currentMonth.month);
            fetchRollingData();
          }}
        >
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.scroll}>

      {/* Calendar */}
      <View style={[styles.calendarWrap, { borderColor: colors.border }]}>
        <Calendar
          current={`${currentMonth.year}-${String(currentMonth.month).padStart(2, '0')}-01`}
          onDayPress={(day: { dateString: string }) => setSelectedDate(day.dateString)}
          onMonthChange={(month: { year: number; month: number }) =>
            setCurrentMonth({ year: month.year, month: month.month })
          }
          markedDates={markedDates}
          markingType="dot"
          theme={calendarTheme}
        />
        {/* Dot legend */}
        <View style={styles.dotLegend}>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} /><Text style={[styles.legendLabel, { color: colors.textSecondary }]}>On target</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: Colors.warning }]} /><Text style={[styles.legendLabel, { color: colors.textSecondary }]}>Near target</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: Colors.error }]} /><Text style={[styles.legendLabel, { color: colors.textSecondary }]}>Over</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#888' }]} /><Text style={[styles.legendLabel, { color: colors.textSecondary }]}>Under</Text></View>
        </View>
      </View>

      {/* Day detail */}
      <DayDetail
        date={selectedDate}
        entries={monthByDate[selectedDate] ?? rollingByDate[selectedDate] ?? []}
        target={target}
        activeSlots={activeSlots}
        colors={colors}
      />

      {/* Empty state for trend charts */}
      {daysWithAnyData < 3 ? (
        <View style={[styles.card, styles.emptyCharts, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="bar-chart-outline" size={36} color={colors.textSecondary} />
          <Text style={[styles.emptyChartsText, { color: colors.textSecondary }]}>
            Keep logging for a few more days to see your trends!
          </Text>
        </View>
      ) : (
        <>
          <WeeklyAveragesCard byDate={rollingByDate} target={target} colors={colors} />
          <CalorieTrendChart
            byDate={monthByDate}
            year={currentMonth.year}
            month={currentMonth.month}
            calorieTarget={target.calories}
            colors={colors}
          />
          <MacroStackedChart byDate={rollingByDate} colors={colors} />
          <WeeklyAvgBarChart byDate={rollingByDate} calorieTarget={target.calories} colors={colors} />
        </>
      )}
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  errorText: { fontSize: 15, textAlign: 'center', marginTop: 16, marginBottom: 24 },
  retryBtn: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10 },
  retryBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },

  scroll: { paddingVertical: 12, paddingHorizontal: 0, paddingBottom: 48 },

  calendarWrap: { marginHorizontal: 16, borderRadius: 14, borderWidth: 1, overflow: 'hidden', marginBottom: 12 },

  dotLegend: { flexDirection: 'row', justifyContent: 'center', gap: 16, paddingVertical: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 11 },

  card: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  dayLabel: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  emptyDay: { fontSize: 14, fontStyle: 'italic', textAlign: 'center', paddingVertical: 8 },

  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: 12,
    marginBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  totalPill: { alignItems: 'center' },
  totalPillLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  totalPillValue: { fontSize: 16, fontWeight: '800', marginTop: 2 },
  totalPillTarget: { fontSize: 11, marginTop: 1 },

  slotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  slotTitle: { fontSize: 13, fontWeight: '700', flex: 1 },
  slotCal: { fontSize: 12, fontWeight: '600' },

  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingLeft: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  entryName: { fontSize: 13, fontWeight: '500' },
  entryServing: { fontSize: 11, marginTop: 1 },
  entryCal: { fontSize: 13, fontWeight: '600', marginLeft: 8 },

  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 10,
  },

  avgRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avgLabel: { fontSize: 14 },
  avgValue: { fontSize: 13, fontWeight: '600', textAlign: 'right', flex: 1, marginLeft: 12 },

  chartCard: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  chartLegend: { flexDirection: 'row', gap: 16, marginBottom: 4 },

  emptyCharts: { alignItems: 'center', gap: 12, paddingVertical: 24 },
  emptyChartsText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
