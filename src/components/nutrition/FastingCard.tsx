/**
 * FastingCard — compact fasting status card for the Nutrition index screen.
 *
 * Shows current fasting state, time remaining, and a mini SVG arc.
 * Tapping navigates to the fasting-timer screen.
 * If unconfigured, shows a "Set up intermittent fasting" prompt.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { Colors } from '../../constants/theme';
import { useFastingTimer } from '../../hooks/useFastingTimer';

// ─── Mini arc constants ───────────────────────────────────────────────────────

const ARC_SIZE = 48;
const ARC_THICKNESS = 5;
const ARC_RADIUS = (ARC_SIZE - ARC_THICKNESS) / 2;
const ARC_CIRCUMFERENCE = 2 * Math.PI * ARC_RADIUS;

// ─── Time formatter ──────────────────────────────────────────────────────────

function formatShortDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  }
  return `${String(minutes).padStart(2, '0')}m`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FastingCard() {
  const { colors } = useTheme();
  const router = useRouter();
  const { timerData, loading } = useFastingTimer();

  if (loading) return null;

  // Unconfigured prompt
  if (!timerData || timerData.state === 'unconfigured') {
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => router.push('/(tabs)/nutrition/fasting-setup')}
        activeOpacity={0.7}
      >
        <Ionicons name="timer-outline" size={22} color={Colors.nutrition} />
        <View style={styles.textGroup}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Intermittent Fasting</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Tap to set up your fasting schedule
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
      </TouchableOpacity>
    );
  }

  const isFasting = timerData.state === 'fasting';
  const stateColor = isFasting ? Colors.nutrition : '#27AE60';
  const arcOffset = ARC_CIRCUMFERENCE * (1 - Math.min(1, Math.max(0, timerData.progress)));

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => router.push('/(tabs)/nutrition/fasting-timer')}
      activeOpacity={0.7}
    >
      {/* Mini arc */}
      <View style={styles.arcContainer}>
        <Svg width={ARC_SIZE} height={ARC_SIZE}>
          <Circle
            cx={ARC_SIZE / 2}
            cy={ARC_SIZE / 2}
            r={ARC_RADIUS}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={ARC_THICKNESS}
            fill="none"
          />
          <Circle
            cx={ARC_SIZE / 2}
            cy={ARC_SIZE / 2}
            r={ARC_RADIUS}
            stroke={stateColor}
            strokeWidth={ARC_THICKNESS}
            fill="none"
            strokeDasharray={`${ARC_CIRCUMFERENCE} ${ARC_CIRCUMFERENCE}`}
            strokeDashoffset={arcOffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${ARC_SIZE / 2}, ${ARC_SIZE / 2}`}
          />
        </Svg>
        {/* Center icon */}
        <View style={styles.arcIcon}>
          <Ionicons
            name={isFasting ? 'moon-outline' : 'sunny-outline'}
            size={16}
            color={stateColor}
          />
        </View>
      </View>

      {/* Text */}
      <View style={styles.textGroup}>
        <Text style={[styles.stateText, { color: stateColor }]}>
          {isFasting ? 'Fasting' : 'Eating Window'}
        </Text>
        <Text style={[styles.timeText, { color: colors.textPrimary }]}>
          {formatShortDuration(timerData.timeRemainingMs)} remaining
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  arcContainer: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arcIcon: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textGroup: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  stateText: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timeText: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 2,
  },
});
