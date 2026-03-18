/**
 * HalfLifeTimelineChart — Victory-native chart showing estimated blood levels
 * for multiple compounds over time, with side-effect overlays.
 *
 * Follows WeightChart.tsx structure.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import {
  VictoryChart,
  VictoryLine,
  VictoryScatter,
  VictoryAxis,
  VictoryVoronoiContainer,
  VictoryTooltip,
} from 'victory-native';
import { Colors } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import type { CompoundSeries, SideEffectMarker, TimelineRange } from '../../hooks/useHalfLifeTimeline';

type Props = {
  series: CompoundSeries[];
  sideEffects: SideEffectMarker[];
  range: TimelineRange;
  onRangeChange: (r: TimelineRange) => void;
  yMax: number;
};

const RANGES: TimelineRange[] = ['7d', '14d', '30d'];

function formatXTick(epochMs: number, range: TimelineRange): string {
  const d = new Date(epochMs);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  if (range === '7d') {
    const h = d.getHours().toString().padStart(2, '0');
    const min = d.getMinutes().toString().padStart(2, '0');
    return `${m}/${day} ${h}:${min}`;
  }
  return `${m}/${day}`;
}

function msToHoursElapsed(x: number, doses: { amount: number; timestampMs: number }[]): number {
  const prior = doses.filter((d) => d.timestampMs <= x);
  if (prior.length === 0) return 0;
  const latest = Math.max(...prior.map((d) => d.timestampMs));
  return Math.round((x - latest) / 3_600_000);
}

export default function HalfLifeTimelineChart({
  series,
  sideEffects,
  range,
  onRangeChange,
  yMax,
}: Props) {
  const { colors } = useTheme();

  // Compounds that have real curve data
  const activeSeries = series.filter(
    (s) => s.curveData.length > 0 || s.doseMarkers.length > 0,
  );
  const missingHalfLife = series.filter(
    (s) => !s.hasHalfLife && s.doseMarkers.length > 0,
  );

  const now = Date.now();
  const rangeMs = { '7d': 7, '14d': 14, '30d': 30 }[range] * 24 * 3_600_000;
  const startMs = now - rangeMs;

  return (
    <View>
      {/* Legend */}
      {activeSeries.length > 0 && (
        <View style={styles.legend}>
          {activeSeries.map((s) => (
            <View key={s.peptideId} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: s.color }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]} numberOfLines={1}>
                {s.peptideName}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Range tabs */}
      <View style={styles.tabs}>
        {RANGES.map((r) => (
          <TouchableOpacity
            key={r}
            style={[
              styles.tab,
              { backgroundColor: r === range ? Colors.peptide : 'transparent' },
            ]}
            onPress={() => onRangeChange(r)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                { color: r === range ? '#fff' : colors.textSecondary },
              ]}
            >
              {r}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Empty state */}
      {activeSeries.length === 0 ? (
        <View style={styles.emptyChart}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Log doses to see activity curves
          </Text>
        </View>
      ) : (
        <>
          <VictoryChart
            height={260}
            padding={{ top: 16, bottom: 40, left: 48, right: 16 }}
            domain={{ y: [0, Math.max(yMax, 10)] }}
            containerComponent={
              <VictoryVoronoiContainer
                voronoiDimension="x"
                labels={({ datum }: { datum: { x: number; y: number; _seriesName?: string; _isSideEffect?: boolean; _seLabel?: string; _seSeverity?: string; _seNotes?: string; _peptideName?: string } }) => {
                  if (datum._isSideEffect) {
                    const lines = [datum._seLabel ?? '', `Severity: ${datum._seSeverity ?? ''}`];
                    if (datum._seNotes) lines.push(datum._seNotes);
                    if (datum._peptideName) lines.push(`Compound: ${datum._peptideName}`);
                    return lines.filter(Boolean).join('\n');
                  }
                  if (datum._seriesName) {
                    return `Est. level: ${datum.y}%\n${datum._seriesName}`;
                  }
                  return `${datum.y}%`;
                }}
                labelComponent={
                  <VictoryTooltip
                    flyoutStyle={{ fill: colors.surface, stroke: colors.border }}
                    style={{ fill: colors.textPrimary, fontSize: 9 }}
                    cornerRadius={6}
                    flyoutPadding={{ top: 6, bottom: 6, left: 10, right: 10 }}
                  />
                }
              />
            }
          >
            {/* X axis */}
            <VictoryAxis
              style={{
                axis: { stroke: colors.border },
                tickLabels: { fill: colors.textSecondary, fontSize: 8 },
                grid: { stroke: colors.border, strokeDasharray: '4,4', opacity: 0.3 },
              }}
              tickCount={5}
              tickFormat={(t: number) => formatXTick(t, range)}
              domain={[startMs, now]}
            />

            {/* Y axis */}
            <VictoryAxis
              dependentAxis
              style={{
                axis: { stroke: colors.border },
                tickLabels: { fill: colors.textSecondary, fontSize: 8 },
                grid: { stroke: colors.border, strokeDasharray: '4,4', opacity: 0.3 },
              }}
              tickFormat={(t: number) => `${t}%`}
            />

            {/* Curves + dose markers per compound */}
            {activeSeries.map((s) => [
              s.hasHalfLife && s.curveData.length > 0 ? (
                <VictoryLine
                  key={`line-${s.peptideId}`}
                  data={s.curveData.map((p) => ({ x: p.x, y: p.y, _seriesName: s.peptideName }))}
                  style={{ data: { stroke: s.color, strokeWidth: 2 } }}
                  interpolation="monotoneX"
                />
              ) : null,
              s.doseMarkers.length > 0 ? (
                <VictoryScatter
                  key={`doses-${s.peptideId}`}
                  data={s.doseMarkers.map((p) => ({
                    x: p.x,
                    y: p.y,
                    _seriesName: s.peptideName,
                  }))}
                  size={5}
                  symbol={s.hasHalfLife ? 'diamond' : 'circle'}
                  style={{ data: { fill: s.color } }}
                />
              ) : null,
            ])}

            {/* Side-effect overlay pinned near top */}
            {sideEffects.length > 0 && (
              <VictoryScatter
                data={sideEffects.map((se) => ({
                  x: se.x,
                  y: Math.max(yMax, 10) * 0.95,
                  label: se.emoji,
                  _isSideEffect: true,
                  _seLabel: se.label,
                  _seSeverity: se.severity,
                  _seNotes: se.notes,
                  _peptideName: se.peptideName,
                }))}
                size={6}
                style={{ data: { fill: 'transparent', stroke: 'transparent' } }}
                labelComponent={
                  <VictoryTooltip
                    flyoutStyle={{ fill: colors.surface, stroke: colors.border }}
                    style={{ fill: colors.textPrimary, fontSize: 9 }}
                    cornerRadius={6}
                    flyoutPadding={{ top: 6, bottom: 6, left: 10, right: 10 }}
                  />
                }
                labels={({ datum }: { datum: { label: string } }) => datum.label}
              />
            )}
          </VictoryChart>

          {/* Missing half-life footnotes */}
          {missingHalfLife.length > 0 && (
            <View style={styles.footnotes}>
              {missingHalfLife.map((s) => (
                <Text
                  key={s.peptideId}
                  style={[styles.footnote, { color: colors.textSecondary }]}
                >
                  * {s.peptideName}: add half-life data to see estimated levels
                </Text>
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, fontWeight: '500', maxWidth: 100 },

  tabs: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 4,
    paddingHorizontal: 16,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tabText: { fontSize: 12, fontWeight: '600' },

  emptyChart: { height: 200, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 14, fontStyle: 'italic' },

  footnotes: { paddingHorizontal: 16, paddingBottom: 8 },
  footnote: { fontSize: 11, fontStyle: 'italic', marginTop: 2 },
});
