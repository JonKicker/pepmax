/**
 * CompareStatRow — three-column stat comparison row.
 *
 * Layout: [leftValue (40%)] [label (20%)] [rightValue (40%)]
 * - Winner's value is rendered in accentColor text.
 * - Loser's value is rendered in gray text.
 * - Tie: both values render in the default text color.
 * - leftWins = null → tie.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

// ─── Props ────────────────────────────────────────────────────────────────────

type CompareStatRowProps = {
  leftValue: string;
  rightValue: string;
  label: string;
  /** true = left wins, false = right wins, null = tie */
  leftWins: boolean | null;
  accentColor: string;
  showTrendArrow?: boolean;
  /** Delay in ms before the fade-in animation starts (staggered rows). */
  animDelay?: number;
};

// ─── Colors ───────────────────────────────────────────────────────────────────

const COLOR_LOSER = '#9CA3AF';

// ─── Accessibility helper ─────────────────────────────────────────────────────

/** Builds a concise accessibility label for a stat comparison row. */
export function buildA11yLabel(
  label: string,
  leftValue: string,
  rightValue: string,
  leftWins: boolean | null,
): string {
  if (leftWins === null) {
    return `${label}: tie, ${leftValue} vs ${rightValue}`;
  }
  const winner = leftWins ? 'You lead' : 'Opponent leads';
  return `${label}: ${winner}, ${leftValue} vs ${rightValue}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CompareStatRow({
  leftValue,
  rightValue,
  label,
  leftWins,
  accentColor,
  showTrendArrow = false,
  animDelay = 0,
}: CompareStatRowProps) {
  const { colors } = useTheme();

  // Staggered fade-in animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, animDelay);
    return () => clearTimeout(timer);
  }, [animDelay, fadeAnim]);

  // Winner pulse animation — scale 1.0→1.05→1.0, 3 iterations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (leftWins === null) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 750, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 750, useNativeDriver: true }),
      ]),
      { iterations: 3 },
    );
    loop.start();
    return () => loop.stop();
  }, [leftWins, pulseAnim]);

  // Resolve text colors — tie uses theme default, loser uses gray
  const isTie = leftWins === null;
  const leftColor = isTie ? colors.textPrimary : leftWins ? accentColor : COLOR_LOSER;
  const rightColor = isTie ? colors.textPrimary : leftWins ? COLOR_LOSER : accentColor;

  const a11yLabel = buildA11yLabel(label, leftValue, rightValue, leftWins);

  // Left value text — apply pulse if left wins
  const leftText = (
    <Animated.Text
      style={[
        styles.valueText,
        { color: leftColor },
        leftWins === true ? { transform: [{ scale: pulseAnim }] } : undefined,
      ]}
      numberOfLines={1}
    >
      {showTrendArrow && !isTie
        ? `${leftWins ? '▲' : '▼'} ${leftValue}`
        : leftValue}
    </Animated.Text>
  );

  // Right value text — apply pulse if right wins
  const rightText = (
    <Animated.Text
      style={[
        styles.valueText,
        { color: rightColor },
        leftWins === false ? { transform: [{ scale: pulseAnim }] } : undefined,
      ]}
      numberOfLines={1}
    >
      {showTrendArrow && !isTie
        ? `${!leftWins ? '▲' : '▼'} ${rightValue}`
        : rightValue}
    </Animated.Text>
  );

  return (
    <Animated.View
      style={[styles.row, { opacity: fadeAnim }]}
      accessible={true}
      accessibilityLabel={a11yLabel}
    >
      {/* Left value */}
      <View style={styles.leftCell}>
        {leftText}
      </View>

      {/* Center label */}
      <View style={styles.centerCell}>
        <Text style={[styles.labelText, { color: colors.textSecondary }]} numberOfLines={1}>
          {label}
        </Text>
      </View>

      {/* Right value */}
      <View style={styles.rightCell}>
        {rightText}
      </View>
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    minHeight: 48,
  },
  leftCell: {
    flex: 4,
    alignItems: 'flex-end',
    paddingRight: 8,
  },
  centerCell: {
    flex: 2,
    alignItems: 'center',
  },
  rightCell: {
    flex: 4,
    alignItems: 'flex-start',
    paddingLeft: 8,
  },
  valueText: {
    fontSize: 15,
    fontWeight: '600',
  },
  labelText: {
    fontSize: 11,
    textAlign: 'center',
  },
});
