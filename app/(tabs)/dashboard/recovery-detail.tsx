/**
 * Recovery Detail — full score breakdown screen.
 * Shows sub-score bars, recommendations, and 7-day trend chart.
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import { ScoreGauge } from '../../../src/components/recovery/ScoreGauge';
import { SubScoreBar } from '../../../src/components/recovery/SubScoreBar';
import { RecoveryTrendChart } from '../../../src/components/recovery/RecoveryTrendChart';
import {
  getTodayRecoveryScore,
  getRecoveryScoreHistory,
} from '../../../src/services/recoveryScoreService';
import { analytics, AnalyticsEvent } from '../../../src/services/analytics';
import type { RecoveryScoreDoc } from '../../../src/types/recoveryScore';

const CATEGORY_ORDER = ['sleep', 'hrv', 'trainingLoad', 'nutrition', 'subjective'] as const;
const CATEGORY_LABELS: Record<string, string> = {
  sleep: 'Sleep',
  hrv: 'Heart Rate',
  trainingLoad: 'Training Load',
  nutrition: 'Nutrition',
  subjective: 'Subjective',
};

export default function RecoveryDetailScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [doc, setDoc] = useState<RecoveryScoreDoc | null>(null);
  const [trend, setTrend] = useState<Array<{ date: string; score: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analytics.track(AnalyticsEvent.RECOVERY_DETAIL_VIEWED);
    (async () => {
      const [scoreResult, historyResult] = await Promise.all([
        getTodayRecoveryScore(),
        getRecoveryScoreHistory(7),
      ]);
      if (scoreResult.data) setDoc(scoreResult.data);
      if (historyResult.data) setTrend(historyResult.data);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  if (!doc || doc.recoveryScore == null) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          No recovery score for today. Complete a morning check-in first.
        </Text>
        <TouchableOpacity
          style={[styles.checkInBtn, { backgroundColor: Colors.accent }]}
          onPress={() => router.replace('/(tabs)/dashboard/morning-check-in')}
          activeOpacity={0.7}
        >
          <Text style={styles.checkInBtnText}>Start Check-In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.scroll}
    >
      {/* Score Gauge */}
      <View style={styles.gaugeSection}>
        <ScoreGauge
          score={doc.recoveryScore}
          size={160}
          strokeWidth={14}
          colors={colors}
        />
      </View>

      {/* Primary recommendation */}
      {doc.recommendations?.[0] && (
        <Text style={[styles.primaryRec, { color: colors.textPrimary }]}>
          {doc.recommendations[0]}
        </Text>
      )}

      {/* Sub-score breakdown */}
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
        Score Breakdown
      </Text>
      {CATEGORY_ORDER.map((key) => {
        const subScore = doc.subScores?.[key];
        const weight = doc.weights?.[key] ?? 0;
        const available = subScore != null && weight > 0;
        return (
          <SubScoreBar
            key={key}
            label={`${CATEGORY_LABELS[key]} (${Math.round(weight * 100)}%)`}
            score={subScore ?? 0}
            available={available}
            colors={colors}
          />
        );
      })}

      {/* Recommendations */}
      {doc.recommendations && doc.recommendations.length > 1 && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Recommendations
          </Text>
          {doc.recommendations.map((rec, i) => (
            <View key={i} style={styles.recRow}>
              <Text style={[styles.recBullet, { color: Colors.accent }]}>
                {'\u2022'}
              </Text>
              <Text style={[styles.recText, { color: colors.textSecondary }]}>
                {rec}
              </Text>
            </View>
          ))}
        </>
      )}

      {/* 7-day trend */}
      <View style={styles.trendSection}>
        <RecoveryTrendChart data={trend} colors={colors} />
      </View>

      {/* Redo check-in */}
      <TouchableOpacity
        style={[styles.redoBtn, { borderColor: colors.border }]}
        onPress={() => router.push('/(tabs)/dashboard/morning-check-in')}
        activeOpacity={0.7}
      >
        <Text style={[styles.redoBtnText, { color: Colors.accent }]}>
          Redo Check-In
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 24,
    paddingBottom: 60,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  checkInBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  checkInBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  gaugeSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryRec: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 8,
  },
  recRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
    paddingRight: 16,
  },
  recBullet: {
    fontSize: 16,
    lineHeight: 22,
  },
  recText: {
    fontSize: 14,
    lineHeight: 22,
    flex: 1,
  },
  trendSection: {
    marginTop: 24,
  },
  redoBtn: {
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  redoBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
