import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatDuration } from '../../utils/cardio';
import type { TimeInZone } from '../../types/cardio';

type Props = {
  timeInZones: TimeInZone[];
};

export default function TimeInZones({ timeInZones }: Props) {
  const total = timeInZones.reduce((sum, z) => sum + z.seconds, 0);
  if (total === 0) return null;

  return (
    <View style={styles.container}>
      {/* Stacked proportional bar */}
      <View style={styles.bar}>
        {timeInZones
          .filter((z) => z.seconds > 0)
          .map((z) => (
            <View
              key={z.zone}
              style={[
                styles.segment,
                { flex: z.seconds / total, backgroundColor: z.color },
              ]}
            />
          ))}
      </View>

      {/* Zone rows */}
      {timeInZones.map((z) => {
        const pct = total > 0 ? Math.round((z.seconds / total) * 100) : 0;
        return (
          <View key={z.zone} style={styles.row}>
            <View style={[styles.dot, { backgroundColor: z.color }]} />
            <Text style={styles.zoneName}>Z{z.zone} {z.name}</Text>
            <View style={styles.barCell}>
              <View
                style={[
                  styles.miniBar,
                  { width: `${pct}%`, backgroundColor: z.color },
                ]}
              />
            </View>
            <Text style={styles.zoneTime}>{formatDuration(z.seconds)}</Text>
            <Text style={styles.zonePct}>{pct}%</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  bar: {
    height: 10,
    flexDirection: 'row',
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: '#eee',
  },
  segment: {},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  zoneName: { width: 80, fontSize: 12, color: '#666' },
  barCell: { flex: 1, height: 6, backgroundColor: '#f0f0f0', borderRadius: 3 },
  miniBar: { height: 6, borderRadius: 3 },
  zoneTime: { fontSize: 12, color: '#333', width: 40, textAlign: 'right' },
  zonePct: { fontSize: 11, color: '#999', width: 30, textAlign: 'right' },
});
