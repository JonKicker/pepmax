import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import type { HeartRateZone } from '../../types/cardio';

type Props = {
  currentBpm: number;
  maxHR: number;
  zones: HeartRateZone[];
};

export default function HeartRateBar({ currentBpm, maxHR, zones }: Props) {
  const markerAnim = useRef(new Animated.Value(0)).current;
  const pct = maxHR > 0 && currentBpm > 0 ? Math.min(currentBpm / maxHR, 1) : 0;

  useEffect(() => {
    Animated.timing(markerAnim, {
      toValue: pct,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [pct, markerAnim]);

  return (
    <View style={styles.container}>
      <View style={styles.bar}>
        {zones.map((z) => (
          <View
            key={z.zone}
            style={[styles.segment, { flex: z.maxPct - z.minPct, backgroundColor: z.color }]}
          />
        ))}
        {/* Animated position marker */}
        <Animated.View
          style={[
            styles.marker,
            {
              left: markerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
      <View style={styles.labelRow}>
        <Text style={styles.bpmText}>
          {currentBpm > 0 ? `${currentBpm} bpm` : '-- bpm'}
        </Text>
        <Text style={styles.pctText}>
          {pct > 0 ? `${Math.round(pct * 100)}% max HR` : ''}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  bar: {
    height: 12,
    flexDirection: 'row',
    borderRadius: 6,
    overflow: 'visible',
    position: 'relative',
  },
  segment: {},
  marker: {
    position: 'absolute',
    top: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'white',
    borderWidth: 3,
    borderColor: '#333',
    marginLeft: -10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  bpmText: { fontSize: 13, fontWeight: '700', color: '#E74C3C' },
  pctText: { fontSize: 12, color: '#888' },
});
