/**
 * AIInsightCard — live AI weekly insight powered by Claude.
 *
 * Tap-to-refresh bypasses the 7-day Firestore cache.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DashboardCard } from './DashboardCard';
import { Colors } from '../../constants/theme';
import { getWeeklyInsight } from '../../services/aiInsightService';
import type { Theme } from '../../constants/theme';

type Props = {
  colors: Theme['colors'];
};

export function AIInsightCard({ colors }: Props) {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const fetchInsight = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);

    const result = await getWeeklyInsight(forceRefresh);

    if (!mounted.current) return;
    setLoading(false);

    if (result.error) {
      if (result.error.message !== 'Cancelled') {
        setError('Could not load insight. Tap to retry.');
      }
      return;
    }
    if (result.data) {
      setInsight(result.data);
    }
  }, []);

  useEffect(() => {
    fetchInsight();
  }, [fetchInsight]);

  return (
    <DashboardCard
      title="AI Weekly Insight"
      icon="sparkles-outline"
      iconColor={Colors.gold}
      colors={colors}
    >
      {loading && !insight ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={Colors.gold} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Analysing your week…
          </Text>
        </View>
      ) : error ? (
        <TouchableOpacity onPress={() => fetchInsight(true)} activeOpacity={0.7}>
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error}</Text>
        </TouchableOpacity>
      ) : insight ? (
        <View>
          <Text style={[styles.insight, { color: colors.textPrimary }]}>{insight}</Text>
          <TouchableOpacity
            style={styles.refreshRow}
            onPress={() => fetchInsight(true)}
            disabled={loading}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator size="small" color={Colors.gold} />
            ) : (
              <>
                <Ionicons name="refresh-outline" size={13} color={colors.textSecondary} />
                <Text style={[styles.refreshText, { color: colors.textSecondary }]}>
                  Refresh insight
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : null}
    </DashboardCard>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: 14, lineHeight: 20 },
  center: { alignItems: 'center', gap: 8, paddingVertical: 8 },
  loadingText: { fontSize: 13 },
  errorText: { fontSize: 13, fontStyle: 'italic' },
  insight: { fontSize: 14, lineHeight: 22 },
  refreshRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 },
  refreshText: { fontSize: 12 },
});
