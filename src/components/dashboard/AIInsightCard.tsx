/**
 * AIInsightCard — placeholder for future AI Weekly Insight (premium feature).
 */
import React from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { DashboardCard } from './DashboardCard';
import { Colors } from '../../constants/theme';
import type { Theme } from '../../constants/theme';

type Props = {
  colors: Theme['colors'];
};

export function AIInsightCard({ colors }: Props) {
  return (
    <DashboardCard
      title="AI Weekly Insight"
      icon="sparkles-outline"
      iconColor={Colors.gold}
      colors={colors}
    >
      <View style={styles.container}>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          Personalized weekly analysis of your training, nutrition, and recovery patterns.
        </Text>
        <View style={[styles.badge, { backgroundColor: Colors.gold + '20' }]}>
          <Text style={[styles.badgeText, { color: Colors.gold }]}>Coming Soon — Premium</Text>
        </View>
      </View>
    </DashboardCard>
  );
}

const styles = StyleSheet.create({
  container: { opacity: 0.7 },
  body: { fontSize: 14, marginBottom: 10, lineHeight: 20 },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: { fontSize: 12, fontWeight: '700' },
});
