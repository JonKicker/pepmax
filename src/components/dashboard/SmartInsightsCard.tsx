/**
 * SmartInsightsCard — shows cross-module insights on the dashboard.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { DashboardCard } from './DashboardCard';
import { Colors } from '../../constants/theme';
import type { Theme } from '../../constants/theme';
import type { Insight } from '../../types/insight';

type Props = {
  insights: Insight[];
  loading: boolean;
  onDismiss: (id: string) => void;
  colors: Theme['colors'];
};

export function SmartInsightsCard({ insights, loading, onDismiss, colors }: Props) {
  if (insights.length === 0 && !loading) return null;

  return (
    <DashboardCard
      title="Smart Insights"
      icon="bulb-outline"
      iconColor={Colors.primary}
      colors={colors}
    >
      {loading && insights.length === 0 ? (
        <ActivityIndicator size="small" color={Colors.primary} style={styles.loader} />
      ) : (
        insights.map((insight, index) => (
          <View key={insight.id}>
            {index > 0 && <View style={[styles.separator, { backgroundColor: colors.border }]} />}
            <View style={styles.row}>
              <Text style={styles.emoji}>{insight.emoji}</Text>
              <View style={styles.textBlock}>
                <Text style={[styles.headline, { color: colors.textPrimary }]}>
                  {insight.headline}
                </Text>
                <Text style={[styles.explanation, { color: colors.textSecondary }]}>
                  {insight.explanation}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onDismiss(insight.id);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.dismissBtn}
              >
                <Ionicons name="close-circle-outline" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </DashboardCard>
  );
}

const styles = StyleSheet.create({
  loader: {
    marginVertical: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 6,
    gap: 10,
  },
  emoji: {
    fontSize: 24,
    lineHeight: 28,
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  headline: {
    fontSize: 14,
    fontWeight: '700',
  },
  explanation: {
    fontSize: 13,
    lineHeight: 18,
  },
  dismissBtn: {
    paddingTop: 2,
  },
  separator: {
    height: 1,
    marginVertical: 4,
  },
});
