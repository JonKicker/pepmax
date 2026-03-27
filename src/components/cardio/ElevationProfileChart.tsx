import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, AccessibilityInfo } from 'react-native';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { VictoryArea, VictoryChart, VictoryAxis, VictoryVoronoiContainer, VictoryTooltip } from 'victory-native';
import { useTheme } from '../../hooks/useTheme';
import { GlassCard } from '../GlassCard';
import type { RoutePoint } from '../../types/cardio';
import { buildElevationProfile } from '../../utils/cardioElevation';

type Props = {
  route: RoutePoint[];
  elevationGain: number;
  distanceUnit: 'mi' | 'km';
};

export default function ElevationProfileChart({ route, elevationGain, distanceUnit }: Props) {
  const { colors } = useTheme();
  const [reduceMotion, setReduceMotion] = useState(false);

  const opacity = useSharedValue(0);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  useEffect(() => {
    const duration = reduceMotion ? 0 : 600;
    opacity.value = withTiming(1, { duration, easing: Easing.out(Easing.cubic) });
  }, [reduceMotion]); // eslint-disable-line react-hooks/exhaustive-deps

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  // Only show for routes with meaningful elevation (skip flat routes)
  if (elevationGain <= 5) return null;

  const data = buildElevationProfile(route, distanceUnit);
  if (data.length < 2) return null;

  const unitDivisor = distanceUnit === 'mi' ? 1609.344 : 1000;

  // Convert x (meters) to display unit
  const chartData = data.map((p) => ({
    x: p.x / unitDivisor,
    y: p.y,
  }));

  return (
    <Reanimated.View
      style={animatedStyle}
      accessibilityRole="image"
      accessibilityLabel={`Elevation profile chart. Total gain: ${Math.round(elevationGain)} meters over the route.`}
    >
      <GlassCard intensity="heavy" padding={12}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Elevation Profile</Text>
        <VictoryChart
          height={140}
          padding={{ top: 10, bottom: 30, left: 40, right: 10 }}
          containerComponent={
            <VictoryVoronoiContainer
              voronoiDimension="x"
              labels={({ datum }: { datum: { x: number; y: number } }) =>
                `${datum.x.toFixed(2)}${distanceUnit}\n${Math.round(datum.y)}m`
              }
              labelComponent={
                <VictoryTooltip
                  flyoutStyle={{ fill: colors.surface, stroke: colors.border }}
                  style={{ fill: colors.textPrimary, fontSize: 10 }}
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
              tickLabels: { fill: colors.textSecondary, fontSize: 11 },
              grid: { stroke: colors.border, strokeOpacity: 0.5 },
            }}
            tickFormat={(t: number) => `${t.toFixed(1)}${distanceUnit}`}
            tickCount={4}
          />
          <VictoryAxis
            dependentAxis
            style={{
              axis: { stroke: colors.border },
              tickLabels: { fill: colors.textSecondary, fontSize: 11 },
              grid: { stroke: colors.border, strokeOpacity: 0.5 },
            }}
            tickFormat={(t: number) => `${Math.round(t)}m`}
            tickCount={3}
          />
          <VictoryArea
            data={chartData}
            style={{
              data: {
                fill: colors.cardio + '22',
                stroke: colors.cardio,
                strokeWidth: 2,
              },
            }}
            interpolation="monotoneX"
          />
        </VictoryChart>
      </GlassCard>
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
});
