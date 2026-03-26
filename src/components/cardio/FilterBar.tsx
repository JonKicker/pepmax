import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { Colors } from '../../constants/theme';
import type { ActivityType, DateRange, HistoryFilter } from '../../types/cardio';

type Props = {
  filters: HistoryFilter;
  onFiltersChange: (filters: HistoryFilter) => void;
};

const ACTIVITIES: { value: ActivityType | undefined; label: string }[] = [
  { value: undefined, label: 'All' },
  { value: 'run', label: 'Run' },
  { value: 'cycle', label: 'Cycle' },
  { value: 'walk', label: 'Walk' },
  { value: 'swim', label: 'Swim' },
];

const DATE_RANGES: { value: DateRange; label: string }[] = [
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: '3months', label: '3 Months' },
  { value: 'all', label: 'All Time' },
];

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        {
          backgroundColor: active ? Colors.cardio : colors.surface,
          borderColor: active ? Colors.cardio : colors.border,
        },
      ]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      activeOpacity={0.7}
    >
      <Text style={[styles.chipText, { color: active ? 'white' : colors.textPrimary }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function FilterBar({ filters, onFiltersChange }: Props) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {/* Activity type */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {ACTIVITIES.map((a) => (
          <Chip
            key={a.label}
            label={a.label}
            active={filters.activityType === a.value}
            onPress={() => onFiltersChange({ ...filters, activityType: a.value })}
          />
        ))}
      </ScrollView>

      {/* Date range */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {DATE_RANGES.map((d) => (
          <Chip
            key={d.value}
            label={d.label}
            active={(filters.dateRange ?? 'all') === d.value}
            onPress={() => onFiltersChange({ ...filters, dateRange: d.value })}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8, marginBottom: 12 },
  row: { gap: 6, paddingHorizontal: 16 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontWeight: '600' },
});
