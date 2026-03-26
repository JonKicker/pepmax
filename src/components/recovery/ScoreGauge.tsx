/**
 * ScoreGauge — circular arc indicator for the 0–100 recovery score.
 * Uses react-native-svg for the arc. Color-coded by zone.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { getZone, getZoneColor, getZoneLabel } from '../../utils/recoveryScore';
import type { Theme } from '../../constants/theme';

type Props = {
  score: number;
  size?: number;
  strokeWidth?: number;
  colors: Theme['colors'];
  showLabel?: boolean;
};

export function ScoreGauge({
  score,
  size = 120,
  strokeWidth = 10,
  colors,
  showLabel = true,
}: Props) {
  const zone = getZone(score);
  const zoneColor = getZoneColor(zone);
  const label = getZoneLabel(zone);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, score)) / 100;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Background track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.border}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
        {/* Progress arc */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={zoneColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      {/* Center text */}
      <View style={[styles.center, { width: size, height: size }]}>
        <Text style={[styles.scoreText, { color: zoneColor, fontSize: size * 0.28 }]}>
          {Math.round(score)}
        </Text>
      </View>
      {/* Label below */}
      {showLabel && (
        <Text style={[styles.label, { color: zoneColor }]}>{label}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontWeight: '800',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
});
