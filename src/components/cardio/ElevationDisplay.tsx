import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, AccessibilityInfo } from 'react-native';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { GlassCard } from '../GlassCard';

type Props = {
  currentAltitude: number | null; // RAY #F5: null hides the component
  elevationGain: number;
  elevationLoss: number;
};

export default function ElevationDisplay({ currentAltitude, elevationLoss, elevationGain }: Props) {
  const { colors } = useTheme();
  const [reduceMotion, setReduceMotion] = useState(false);

  const opacity = useSharedValue(0);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  useEffect(() => {
    if (currentAltitude === null) return;
    const duration = reduceMotion ? 0 : 300;
    opacity.value = withTiming(1, { duration, easing: Easing.out(Easing.cubic) });
  }, [currentAltitude, reduceMotion]); // eslint-disable-line react-hooks/exhaustive-deps

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  // RAY #F5: hide entirely when altitude is null
  if (currentAltitude === null) return null;

  return (
    <Reanimated.View style={animatedStyle}>
      <GlassCard intensity="subtle" padding={12}>
        <View style={styles.row}>
          <View
            style={styles.stat}
            accessibilityLabel={`Current altitude: ${Math.round(currentAltitude)} meters`}
            accessibilityRole="text"
          >
            <Ionicons name="location" size={14} color={colors.textSecondary} />
            <Text style={[styles.label, { color: colors.textSecondary }]}>Altitude</Text>
            <Text style={[styles.value, { color: colors.textPrimary }]}>
              {Math.round(currentAltitude)} m
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View
            style={styles.stat}
            accessibilityLabel={`Elevation gain: ${Math.round(elevationGain)} meters`}
            accessibilityRole="text"
          >
            <Text style={[styles.arrow, { color: colors.textSecondary }]}>↑</Text>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Gain</Text>
            <Text style={[styles.value, { color: colors.success }]}>
              {Math.round(elevationGain)} m
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View
            style={styles.stat}
            accessibilityLabel={`Elevation loss: ${Math.round(elevationLoss)} meters`}
            accessibilityRole="text"
          >
            <Text style={[styles.arrow, { color: colors.textSecondary }]}>↓</Text>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Loss</Text>
            <Text style={[styles.value, { color: colors.error }]}>
              {Math.round(elevationLoss)} m
            </Text>
          </View>
        </View>
      </GlassCard>
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
  value: {
    fontSize: 16,
    fontWeight: '700',
  },
  arrow: {
    fontSize: 14,
  },
  divider: {
    width: 1,
    height: 36,
  },
});
