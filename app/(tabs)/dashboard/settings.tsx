/**
 * Dashboard Settings — toggle card visibility.
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import { useDashboard } from '../../../src/hooks/useDashboard';
import type { DashboardCardId } from '../../../src/types/dashboard';

type CardMeta = {
  id: DashboardCardId;
  title: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
};

const CARDS: CardMeta[] = [
  { id: 'peptides', title: "Today's Peptides", icon: 'eyedrop-outline', color: Colors.peptide },
  { id: 'nutrition', title: "Today's Nutrition", icon: 'nutrition-outline', color: Colors.nutrition },
  { id: 'training', title: 'Training', icon: 'barbell-outline', color: Colors.gym },
  { id: 'cardio', title: 'Cardio', icon: 'heart-outline', color: Colors.cardio },
  { id: 'bodyWeight', title: 'Body Weight', icon: 'scale-outline', color: Colors.accent },
  { id: 'aiInsight', title: 'AI Weekly Insight', icon: 'sparkles-outline', color: Colors.gold },
];

export default function DashboardSettingsScreen() {
  const { colors } = useTheme();
  const { hiddenCards, toggleCardVisibility } = useDashboard();

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.scroll}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>VISIBLE CARDS</Text>

      {CARDS.map((card) => {
        const isVisible = !hiddenCards.includes(card.id);
        return (
          <View key={card.id} style={[styles.row, { borderBottomColor: colors.border }]}>
            <Ionicons name={card.icon} size={20} color={card.color} />
            <Text style={[styles.label, { color: colors.textPrimary }]}>{card.title}</Text>
            <Switch
              value={isVisible}
              onValueChange={() => toggleCardVisibility(card.id)}
              trackColor={{ false: colors.border, true: Colors.accent + '80' }}
              thumbColor={isVisible ? Colors.accent : colors.textSecondary}
            />
          </View>
        );
      })}

      <Text style={[styles.note, { color: colors.textSecondary }]}>
        Card reordering coming soon.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: { fontSize: 15, fontWeight: '500', flex: 1 },
  note: { fontSize: 13, fontStyle: 'italic', marginTop: 20, textAlign: 'center' },
});
