/**
 * CategoryTabs — horizontal chip filter for community template categories.
 * Follows the FilterBar chip pattern from cardio/FilterBar.tsx.
 */
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Colors } from '../../constants/theme';
import type { TemplateCategory } from '../../types/communityTemplate';

export type CategoryFilter = TemplateCategory | 'all';

type Tab = { key: CategoryFilter; label: string };

const TABS: Tab[] = [
  { key: 'all', label: 'All' },
  { key: 'peptide_cycle', label: 'Peptide Cycles' },
  { key: 'workout', label: 'Workouts' },
  { key: 'nutrition_plan', label: 'Nutrition Plans' },
];

type Props = {
  selected: CategoryFilter;
  onSelect: (category: CategoryFilter) => void;
  colors: any;
};

export default function CategoryTabs({ selected, onSelect, colors }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {TABS.map((tab) => {
        const active = selected === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.chip,
              {
                backgroundColor: active ? Colors.accent : colors.surface,
                borderColor: active ? Colors.accent : colors.border,
              },
            ]}
            onPress={() => onSelect(tab.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, { color: active ? 'white' : colors.textPrimary }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
