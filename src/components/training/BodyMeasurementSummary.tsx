import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useUnits } from '../../hooks/useUnits';
import { Colors } from '../../constants/theme';
import type { BodyMeasurement } from '../../types/bodyMeasurement';

type Props = {
  latest: BodyMeasurement | null;
  monthlyWeightChange: number | null;
  colors: ReturnType<typeof import('../../hooks/useTheme').useTheme>['colors'];
};

function getTodayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function getWeekStartStr(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().split('T')[0];
}

export default function BodyMeasurementSummary({ latest, monthlyWeightChange, colors }: Props) {
  const router = useRouter();
  const { formatWeight, convertWeightToDisplay, weightLabel } = useUnits();

  const hasRecentWeight = latest?.weight != null && latest.date >= getWeekStartStr();

  const changeStr = (() => {
    if (monthlyWeightChange == null || latest?.weight == null) return null;
    const displayChange = convertWeightToDisplay(Math.abs(monthlyWeightChange));
    const sign = monthlyWeightChange < 0 ? '↓' : '↑';
    return `${sign} ${displayChange} ${weightLabel} this month`;
  })();

  if (!latest) return null;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => router.push('/(tabs)/training/body-measurements')}
      activeOpacity={0.8}
    >
      <View style={[styles.accent, { backgroundColor: Colors.gym }]} />
      <View style={styles.body}>
        <View style={styles.row}>
          <Ionicons name="body-outline" size={16} color={Colors.gym} />
          <Text style={[styles.title, { color: colors.textSecondary }]}>Body Measurements</Text>
        </View>
        {hasRecentWeight && latest.weight != null ? (
          <View style={styles.statsRow}>
            <Text style={[styles.mainStat, { color: colors.textPrimary }]}>
              {formatWeight(latest.weight)}
            </Text>
            {changeStr && (
              <Text style={[styles.change, { color: monthlyWeightChange! < 0 ? Colors.light.success : Colors.error }]}>
                {changeStr}
              </Text>
            )}
          </View>
        ) : (
          <Text style={[styles.noData, { color: colors.textSecondary }]}>
            Last logged: {latest.date}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 10,
    overflow: 'hidden',
  },
  accent: { width: 4, alignSelf: 'stretch' },
  body: { flex: 1, paddingVertical: 12, paddingHorizontal: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  title: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mainStat: { fontSize: 18, fontWeight: '700' },
  change: { fontSize: 13, fontWeight: '600' },
  noData: { fontSize: 13 },
});
