/**
 * NutritionCard — mini calorie display + macro row.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DashboardCard } from './DashboardCard';
import { Colors } from '../../constants/theme';
import type { Theme } from '../../constants/theme';
import type { DailyTotals } from '../../types/nutrition';

type Props = {
  totals: DailyTotals | null;
  colors: Theme['colors'];
  error: boolean;
  onPress: () => void;
  calorieTarget?: number;
};

export function NutritionCard({ totals, colors, error, onPress, calorieTarget }: Props) {
  const hasData = totals && totals.calories > 0;
  const pct = calorieTarget && hasData ? Math.min(totals.calories / calorieTarget, 1) : 0;

  return (
    <DashboardCard
      title="Today's Nutrition"
      icon="nutrition-outline"
      iconColor={Colors.nutrition}
      onPress={onPress}
      colors={colors}
    >
      {error ? (
        <Text style={[styles.empty, { color: colors.textSecondary }]}>Could not load nutrition data.</Text>
      ) : !hasData ? (
        <View style={{ alignItems: 'center', paddingVertical: 16, gap: 8 }}>
          <Ionicons name="nutrition-outline" size={48} color={colors.textSecondary} style={{ opacity: 0.5 }} />
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>No Meals Logged</Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center' }}>Track your first meal to see your macros</Text>
        </View>
      ) : (
        <View style={styles.container}>
          <View style={styles.ringRow}>
            {/* Mini calorie ring */}
            <View style={styles.ringContainer}>
              <View style={[styles.ringBg, { borderColor: Colors.nutrition + '25' }]}>
                <View
                  style={[
                    styles.ringProgress,
                    {
                      borderColor: Colors.nutrition,
                      borderTopColor: 'transparent',
                      borderRightColor: pct > 0.25 ? Colors.nutrition : 'transparent',
                      borderBottomColor: pct > 0.5 ? Colors.nutrition : 'transparent',
                      borderLeftColor: pct > 0.75 ? Colors.nutrition : 'transparent',
                      transform: [{ rotate: `${pct * 360}deg` }],
                    },
                  ]}
                />
              </View>
              <View style={styles.ringCenter}>
                <Text style={[styles.calorieNum, { color: colors.textPrimary }]}>
                  {Math.round(totals.calories).toLocaleString()}
                </Text>
                <Text style={[styles.calorieLabel, { color: colors.textSecondary }]}>kcal</Text>
              </View>
            </View>
            {calorieTarget ? (
              <Text style={[styles.targetText, { color: colors.textSecondary }]}>
                / {calorieTarget.toLocaleString()}
              </Text>
            ) : null}
          </View>
          <View style={styles.macroRow}>
            <Text style={[styles.macroItem, { color: colors.textSecondary }]}>
              P: {Math.round(totals.protein)}g
            </Text>
            <Text style={[styles.macroItem, { color: colors.textSecondary }]}>
              C: {Math.round(totals.carbs)}g
            </Text>
            <Text style={[styles.macroItem, { color: colors.textSecondary }]}>
              F: {Math.round(totals.fat)}g
            </Text>
          </View>
        </View>
      )}
    </DashboardCard>
  );
}

const styles = StyleSheet.create({
  empty: { fontSize: 14, fontStyle: 'italic' },
  container: { gap: 8 },
  ringRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ringContainer: { width: 60, height: 60, justifyContent: 'center', alignItems: 'center' },
  ringBg: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 6,
  },
  ringProgress: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 6,
  },
  ringCenter: { alignItems: 'center' },
  calorieNum: { fontSize: 14, fontWeight: '800' },
  calorieLabel: { fontSize: 10 },
  targetText: { fontSize: 13 },
  macroRow: { flexDirection: 'row', gap: 16 },
  macroItem: { fontSize: 13 },
});
