import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, AccessibilityInfo } from 'react-native';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../../hooks/useTheme';
import { GlassCard } from '../GlassCard';
import type { Insight } from '../../types/insight';
import type { CardioContext } from '../../utils/cardioInsightCalc';
import {
  checkPeptidePaceImprovement,
  checkInjectionDayScheduling,
  checkPeptideHRRecovery,
  checkCompoundPerformanceTrend,
} from '../../utils/cardioInsightCalc';

type Props = {
  context: CardioContext;
};

function computePostRunInsights(context: CardioContext): Insight[] {
  const checks = [
    () => checkPeptidePaceImprovement(context),
    () => checkInjectionDayScheduling(context),
    () => checkPeptideHRRecovery(context),
    () => checkCompoundPerformanceTrend(context),
  ];

  const results: Insight[] = [];
  for (const check of checks) {
    try {
      const insight = check();
      if (insight) results.push(insight);
    } catch {
      // swallow — no single insight failure should block the view
    }
  }

  return results.sort((a, b) => a.priority - b.priority).slice(0, 2);
}

// Individual animated insight card
function InsightCard({ insight, index, reduceMotion }: { insight: Insight; index: number; reduceMotion: boolean }) {
  const { colors } = useTheme();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(8);

  useEffect(() => {
    const duration = reduceMotion ? 0 : 300;
    const delay = reduceMotion ? 0 : index * 80;
    opacity.value = withDelay(delay, withTiming(1, { duration, easing: Easing.out(Easing.cubic) }));
    translateY.value = withDelay(delay, withTiming(0, { duration, easing: Easing.out(Easing.cubic) }));
  }, [reduceMotion]); // eslint-disable-line react-hooks/exhaustive-deps

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Reanimated.View
      style={animatedStyle}
      accessibilityLabel={`${insight.headline}. ${insight.explanation}`}
      accessibilityRole="text"
    >
      <GlassCard intensity="subtle" padding={14}>
        <View style={styles.cardHeader}>
          <Text style={styles.emoji}>{insight.emoji}</Text>
          <Text style={[styles.headline, { color: colors.textPrimary }]}>{insight.headline}</Text>
        </View>
        <Text style={[styles.explanation, { color: colors.textSecondary }]}>{insight.explanation}</Text>
      </GlassCard>
    </Reanimated.View>
  );
}

export default function PostRunInsight({ context }: Props) {
  const { colors } = useTheme();
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  const insights = computePostRunInsights(context);

  if (insights.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Session Insights</Text>
      {insights.map((insight, index) => (
        <InsightCard
          key={insight.id}
          insight={insight}
          index={index}
          reduceMotion={reduceMotion}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  emoji: {
    fontSize: 20,
  },
  headline: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  explanation: {
    fontSize: 13,
    lineHeight: 18,
  },
});
