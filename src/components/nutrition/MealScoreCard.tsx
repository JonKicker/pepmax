/**
 * MealScoreCard — animated overlay shown after a meal is logged.
 *
 * Features:
 * - SVG circle ring that fills with Reanimated withTiming
 * - Score number animates 0 → final (withTiming, 1000ms)
 * - Color: green (80-100), yellow (50-79), orange (25-49), red (0-24)
 * - Feedback text below ring
 * - Tap to expand: 5-category horizontal bars
 * - "Got it" button and auto-dismiss after 5s
 * - Accepts `enabled` prop — when false the card never shows
 *
 * RAY MANDATORY: `enabled` prop controls visibility so callers can
 * toggle the feature without unmounting.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  AccessibilityInfo,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Reanimated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { GlassCard } from '../GlassCard';
import type { MealScoreCardProps } from '../../types/nutritionScore';

// ─── Animated SVG circle ──────────────────────────────────────────────────────

const AnimatedCircle = Reanimated.createAnimatedComponent(Circle);

// ─── Constants ────────────────────────────────────────────────────────────────

const RING_SIZE = 140;
const RING_STROKE = 12;
const RADIUS = (RING_SIZE - RING_STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const ANIMATION_DURATION_MS = 1000;
const AUTO_DISMISS_MS = 5000;

const CATEGORY_LABELS = ['Protein', 'Fiber', 'Balance', 'Micros', 'Processed'];

function getScoreColor(score: number, colors: ReturnType<typeof useTheme>['colors']): string {
  if (score >= 80) return colors.success;  // green
  if (score >= 50) return colors.warning;  // yellow/orange
  if (score >= 25) return colors.warning;  // orange (lower opacity handled at call site)
  return colors.error;                     // red
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 50) return 'Good';
  if (score >= 25) return 'Fair';
  return 'Needs Work';
}

// ─── Animated score number ─────────────────────────────────────────────────

function AnimatedScoreNumber({
  targetScore,
  color,
}: {
  targetScore: number;
  color: string;
}) {
  const animVal = useSharedValue(0);
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    animVal.value = 0;
    animVal.value = withTiming(targetScore, {
      duration: ANIMATION_DURATION_MS,
      easing: Easing.out(Easing.quad),
    });

    // Drive a JS counter in parallel (Reanimated runs on UI thread)
    let start: number | null = null;
    let rafId: ReturnType<typeof requestAnimationFrame>;
    const animate = (ts: number) => {
      if (start === null) start = ts;
      const progress = Math.min((ts - start) / ANIMATION_DURATION_MS, 1);
      setDisplayScore(Math.round(targetScore * progress));
      if (progress < 1) {
        rafId = requestAnimationFrame(animate);
      }
    };
    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetScore]);

  return (
    <Text style={[styles.scoreNumber, { color }]}>{displayScore}</Text>
  );
}

// ─── Breakdown bar ────────────────────────────────────────────────────────────

function BreakdownBar({
  label,
  value,
  maxValue,
  color,
  errorColor,
  trackColor,
  textPrimary,
  textSecondary,
}: {
  label: string;
  value: number;
  maxValue: number;
  color: string;
  errorColor: string;
  trackColor: string;
  textPrimary: string;
  textSecondary: string;
}) {
  const progress = useSharedValue(0);
  const pct = maxValue !== 0 ? Math.abs(value) / Math.abs(maxValue) : 0;

  useEffect(() => {
    progress.value = withTiming(pct, { duration: 600, easing: Easing.out(Easing.quad) });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pct]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  const isNegative = value < 0;

  return (
    <View style={styles.breakdownRow}>
      <Text style={[styles.breakdownLabel, { color: textSecondary }]}>{label}</Text>
      <View style={[styles.breakdownBarTrack, { backgroundColor: trackColor }]}>
        <Reanimated.View
          style={[
            styles.breakdownBarFill,
            barStyle,
            { backgroundColor: isNegative ? errorColor : color },
          ]}
        />
      </View>
      <Text style={[styles.breakdownValue, { color: textPrimary }]}>
        {isNegative ? value.toFixed(0) : `+${value.toFixed(0)}`}
      </Text>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MealScoreCard({
  visible,
  result,
  mealSlotLabel,
  onDismiss,
  enabled = true,
}: MealScoreCardProps) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  // Animate ring
  const ringProgress = useSharedValue(0);
  const ringColor = getScoreColor(result.score, colors);

  const animatedRingProps = useAnimatedProps(() => ({
    strokeDashoffset: interpolate(ringProgress.value, [0, 1], [CIRCUMFERENCE, CIRCUMFERENCE * (1 - result.score / 100)]),
  }));

  useEffect(() => {
    if (visible) {
      ringProgress.value = 0;
      ringProgress.value = withTiming(1, {
        duration: reduceMotion ? 0 : ANIMATION_DURATION_MS,
        easing: Easing.out(Easing.quad),
      });
      setExpanded(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, reduceMotion]);

  // Auto-dismiss after 5s
  const dismiss = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  useEffect(() => {
    if (!visible || !enabled) return;
    const timer = setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [visible, enabled, dismiss]);

  if (!enabled || !visible) return null;

  const { breakdown } = result;
  const breakdownItems = [
    { label: CATEGORY_LABELS[0], value: breakdown.proteinScore, max: 25 },
    { label: CATEGORY_LABELS[1], value: breakdown.fiberScore, max: 25 },
    { label: CATEGORY_LABELS[2], value: breakdown.balanceScore, max: 25 },
    { label: CATEGORY_LABELS[3], value: breakdown.microBonus, max: 25 },
    { label: CATEGORY_LABELS[4], value: breakdown.processedPenalty, max: 15 },
  ];

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={dismiss}
    >
      <View style={styles.overlay}>
        <GlassCard intensity="heavy" style={styles.card} padding={24}>
          {/* Drag handle */}
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 12 }} />

          {/* Header */}
          <Text style={[styles.headerText, { color: colors.textSecondary }]}>
            {mealSlotLabel.charAt(0).toUpperCase() + mealSlotLabel.slice(1)} Score
          </Text>

          {/* Ring + score */}
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setExpanded((v) => !v);
            }}
            activeOpacity={0.7}
            style={styles.ringContainer}
            accessibilityLabel={`Meal score ${result.score}, tap to see breakdown`}
            accessibilityRole="button"
          >
            <Svg width={RING_SIZE} height={RING_SIZE}>
              {/* Track */}
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RADIUS}
                stroke={colors.border}
                strokeWidth={RING_STROKE}
                fill="none"
              />
              {/* Animated fill */}
              <AnimatedCircle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RADIUS}
                stroke={ringColor}
                strokeWidth={RING_STROKE}
                fill="none"
                strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                strokeLinecap="round"
                rotation="-90"
                origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
                animatedProps={animatedRingProps}
              />
            </Svg>

            {/* Score number overlay */}
            <View style={styles.ringCenter} pointerEvents="none">
              <AnimatedScoreNumber targetScore={result.score} color={ringColor} />
              <Text style={[styles.scoreLabel, { color: ringColor }]}>
                {getScoreLabel(result.score)}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Feedback */}
          <Text style={[styles.feedback, { color: colors.textPrimary }]}>
            {result.feedback}
          </Text>

          {/* Expand hint */}
          <Text style={[styles.expandHint, { color: colors.textSecondary }]}>
            {expanded ? 'Tap ring to collapse' : 'Tap ring to see breakdown'}
          </Text>

          {/* Breakdown bars */}
          {expanded && (
            <View style={styles.breakdownContainer}>
              {breakdownItems.map((item) => (
                <BreakdownBar
                  key={item.label}
                  label={item.label}
                  value={item.value}
                  maxValue={item.max}
                  color={ringColor}
                  errorColor={colors.error}
                  trackColor={colors.border}
                  textPrimary={colors.textPrimary}
                  textSecondary={colors.textSecondary}
                />
              ))}
            </View>
          )}

          {/* Tips */}
          {result.tips.length > 0 && (
            <View style={[styles.tipsContainer, { borderTopColor: colors.border }]}>
              {result.tips.slice(0, 2).map((tip, i) => (
                <Text key={i} style={[styles.tipText, { color: colors.textSecondary }]}>
                  {'\u2022'} {tip}
                </Text>
              ))}
            </View>
          )}

          {/* Got it button */}
          <TouchableOpacity
            style={[styles.dismissButton, { backgroundColor: ringColor }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              dismiss();
            }}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <Text style={[styles.dismissButtonText, { color: colors.textPrimary }]}>Got it</Text>
          </TouchableOpacity>
        </GlassCard>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    borderRadius: 20,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    gap: 12,
  },
  headerText: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  ringContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: RING_SIZE,
    height: RING_SIZE,
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: {
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 40,
  },
  scoreLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  feedback: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
  },
  expandHint: {
    fontSize: 12,
  },
  breakdownContainer: {
    width: '100%',
    gap: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breakdownLabel: {
    fontSize: 12,
    width: 62,
    flexShrink: 0,
  },
  breakdownBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    // backgroundColor set inline via colors.border + opacity to avoid hardcoded hex
    overflow: 'hidden',
  },
  breakdownBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  breakdownValue: {
    fontSize: 11,
    fontWeight: '600',
    width: 32,
    textAlign: 'right',
  },
  tipsContainer: {
    width: '100%',
    borderTopWidth: 1,
    paddingTop: 12,
    gap: 6,
  },
  tipText: {
    fontSize: 13,
    lineHeight: 18,
  },
  dismissButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 4,
  },
  dismissButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
