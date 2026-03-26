import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { VictoryChart, VictoryLine, VictoryAxis, VictoryVoronoiContainer, VictoryTooltip } from 'victory-native';
import type { HeartRatePoint, HeartRateZone } from '../../types/cardio';
import type { useTheme } from '../../hooks/useTheme';

const CHART_WIDTH = Dimensions.get('window').width - 64;

type Props = {
  hrData: HeartRatePoint[];
  zones: HeartRateZone[];
  maxHR: number;
  colors: ReturnType<typeof useTheme>['colors'];
};

export default function HeartRateChart({ hrData, zones, maxHR, colors }: Props) {
  if (hrData.length < 2) return null;

  const startTime = hrData[0].timestamp;
  const data = hrData.map((p) => ({
    x: (p.timestamp - startTime) / 1000, // seconds from session start
    y: p.bpm,
  }));

  const bpms = hrData.map((p) => p.bpm);
  const minBpm = Math.max(0, Math.min(...bpms) - 10);
  const maxBpm = Math.min(220, Math.max(...bpms) + 10);
  const domainY: [number, number] = [minBpm, maxBpm];

  return (
    <View style={styles.container}>
      <VictoryChart
        width={CHART_WIDTH}
        height={160}
        padding={{ top: 8, bottom: 30, left: 44, right: 8 }}
        domain={{ y: domainY }}
        containerComponent={
          <VictoryVoronoiContainer
            voronoiDimension="x"
            labels={({ datum }: { datum: { x: number; y: number } }) => {
              const mins = Math.floor(datum.x / 60);
              const secs = Math.floor(datum.x % 60);
              return `${mins}:${String(secs).padStart(2, '0')}\n${datum.y} bpm`;
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
            tickLabels: { fontSize: 8, fill: colors.textSecondary },
          }}
          tickFormat={(t: number) => `${Math.floor(t / 60)}m`}
          tickCount={5}
        />
        <VictoryAxis
          dependentAxis
          style={{
            axis: { stroke: colors.border },
            tickLabels: { fontSize: 8, fill: colors.textSecondary },
            grid: { stroke: colors.border, strokeDasharray: '3,3' },
          }}
        />
        <VictoryLine
          data={data}
          style={{ data: { stroke: '#E74C3C', strokeWidth: 2 } }}
          interpolation="monotoneX"
        />
      </VictoryChart>

      {/* Zone reference lines legend */}
      <View style={styles.zoneLegend}>
        {zones.map((z) => (
          <View key={z.zone} style={styles.zoneLegendItem}>
            <View style={[styles.zoneLineSwatch, { backgroundColor: z.color }]} />
            <View style={styles.zoneLegendText}>
              <View style={{ alignItems: 'flex-start' }}>
                <View style={[styles.zoneBar, { backgroundColor: z.color, width: Math.round((z.maxPct - z.minPct) * 120) }]} />
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Max HR label */}
      <View style={styles.maxHRRow}>
        {maxHR > 0 && (
          <View style={[styles.zoneLineSwatch, { backgroundColor: '#ccc' }]} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 4 },
  zoneLegend: { flexDirection: 'row', gap: 4, paddingHorizontal: 8, marginTop: 4 },
  zoneLegendItem: { flex: 1, alignItems: 'center', gap: 2 },
  zoneLineSwatch: { width: '100%', height: 4, borderRadius: 2 },
  zoneLegendText: { width: '100%' },
  zoneBar: { height: 4, borderRadius: 2 },
  maxHRRow: { flexDirection: 'row', paddingHorizontal: 8 },
});
