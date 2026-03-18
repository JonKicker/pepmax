/**
 * BodyWeightCard — sparkline chart + today's weight + delta + log button.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { DashboardCard } from './DashboardCard';
import { Colors } from '../../constants/theme';
import type { Theme } from '../../constants/theme';
import type { BodyWeightEntry } from '../../types/bodyTracking';

type Props = {
  weights: BodyWeightEntry[];
  colors: Theme['colors'];
  error: boolean;
  units: 'imperial' | 'metric';
  onLogPress: () => void;
  onPress?: () => void;
};

function toDisplay(kg: number, units: 'imperial' | 'metric'): string {
  if (units === 'imperial') return `${(kg * 2.20462).toFixed(1)} lbs`;
  return `${kg.toFixed(1)} kg`;
}

export const BodyWeightCard = React.memo(function BodyWeightCard({
  weights,
  colors,
  error,
  units,
  onLogPress,
  onPress,
}: Props) {
  // Weights come sorted by date asc from the service
  const sorted = weights;
  const latest = sorted.length > 0 ? sorted[sorted.length - 1] : null;

  // 7-day delta
  let delta: number | null = null;
  if (sorted.length >= 2) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDayKey = `${sevenDaysAgo.getFullYear()}-${String(sevenDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(sevenDaysAgo.getDate()).padStart(2, '0')}`;
    // Find closest entry to 7 days ago
    const older = sorted.find((w) => w.date <= sevenDayKey) ?? sorted[0];
    if (older && latest) {
      delta = latest.weight - older.weight;
    }
  }

  // Sparkline data points (simple SVG-free approach using bars)
  const sparklineData = sorted.slice(-14); // last 14 entries
  const minW = sparklineData.length > 0 ? Math.min(...sparklineData.map((w) => w.weight)) : 0;
  const maxW = sparklineData.length > 0 ? Math.max(...sparklineData.map((w) => w.weight)) : 0;
  const range = maxW - minW || 1;

  return (
    <DashboardCard
      title="Body Weight"
      icon="scale-outline"
      iconColor={Colors.body}
      colors={colors}
      onPress={onPress}
    >
      {error ? (
        <Text style={[styles.empty, { color: colors.textSecondary }]}>Could not load weight data.</Text>
      ) : sorted.length === 0 ? (
        <View>
          <Text style={[styles.empty, { color: colors.textSecondary }]}>No weight entries yet.</Text>
          <TouchableOpacity
            style={[styles.logBtn, { backgroundColor: Colors.accent + '15', borderColor: Colors.accent + '30' }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onLogPress();
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle-outline" size={16} color={Colors.accent} />
            <Text style={[styles.logBtnText, { color: Colors.accent }]}>Log Weight</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          {/* Mini sparkline */}
          {sparklineData.length >= 2 && (
            <View style={styles.sparkline}>
              {sparklineData.map((w, i) => {
                const pct = (w.weight - minW) / range;
                return (
                  <View
                    key={w.date ?? i}
                    style={[
                      styles.sparkBar,
                      {
                        height: 8 + pct * 50,
                        backgroundColor: Colors.accent + (i === sparklineData.length - 1 ? 'FF' : '60'),
                        borderRadius: 2,
                      },
                    ]}
                  />
                );
              })}
            </View>
          )}

          {/* Current weight + delta */}
          <View style={styles.statsRow}>
            <Text style={[styles.currentWeight, { color: colors.textPrimary }]}>
              {latest ? toDisplay(latest.weight, units) : '—'}
            </Text>
            {delta !== null && (
              <Text
                style={[
                  styles.delta,
                  { color: delta <= 0 ? colors.success : colors.error },
                ]}
              >
                {delta > 0 ? '+' : ''}{units === 'imperial' ? (delta * 2.20462).toFixed(1) : delta.toFixed(1)}
                {units === 'imperial' ? ' lbs' : ' kg'} (7d)
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.logBtn, { backgroundColor: Colors.accent + '15', borderColor: Colors.accent + '30' }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onLogPress();
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle-outline" size={16} color={Colors.accent} />
            <Text style={[styles.logBtnText, { color: Colors.accent }]}>Log Weight</Text>
          </TouchableOpacity>
        </View>
      )}
    </DashboardCard>
  );
});

const styles = StyleSheet.create({
  empty: { fontSize: 14, fontStyle: 'italic' },
  sparkline: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 60,
    marginBottom: 10,
  },
  sparkBar: {
    flex: 1,
    minWidth: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 4,
  },
  currentWeight: { fontSize: 20, fontWeight: '800' },
  delta: { fontSize: 13, fontWeight: '600' },
  logBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
  },
  logBtnText: { fontSize: 14, fontWeight: '700' },
});
