/**
 * QuickLogStrip — horizontal scrollable row of quick-action chips for logging.
 */
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';

type QuickLogItem = {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  route: string;
};

const QUICK_LOGS: QuickLogItem[] = [
  // log-dose.tsx shows a graceful empty-state when no peptides exist, so this
  // direct route is safe even if the user has no active peptide protocol.
  { label: 'Log Dose',   icon: 'eyedrop-outline',    color: '#7B68EE', route: '/(tabs)/peptides/log-dose' },
  { label: 'Log Meal',   icon: 'restaurant-outline',  color: '#2D9F6F', route: '/(tabs)/nutrition' },
  { label: 'Log Set',    icon: 'barbell-outline',      color: '#E8793A', route: '/(tabs)/training' },
  { label: 'Log Run',    icon: 'walk-outline',         color: '#3A7BD5', route: '/(tabs)/cardio/start-session' },
  { label: 'Log Weight', icon: 'scale-outline',        color: '#5A7A9A', route: '/(tabs)/nutrition/weight-log' },
];

export function QuickLogStrip() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {QUICK_LOGS.map((item) => (
          <TouchableOpacity
            key={item.label}
            style={[
              styles.chip,
              {
                backgroundColor: colors.surface,
                borderLeftColor: item.color,
              },
            ]}
            onPress={() => router.push(item.route as Parameters<typeof router.push>[0])}
            activeOpacity={0.7}
          >
            <Ionicons name={item.icon} size={20} color={item.color} />
            <Text style={[styles.chipLabel, { color: colors.textSecondary }]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
  },
  scrollContent: {
    gap: 8,
  },
  chip: {
    width: 90,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 14,
    alignItems: 'center',
    gap: 6,
    borderLeftWidth: 3,
  },
  chipLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
});
