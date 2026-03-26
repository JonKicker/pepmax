/**
 * Dashboard Settings — toggle card visibility and reorder cards.
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity } from 'react-native';
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
  const { cardOrder, hiddenCards, toggleCardVisibility, reorderCards } = useDashboard();

  // Build ordered list of known cards (respects saved order, falls back to CARDS default)
  const orderedCards = cardOrder
    .map((id) => CARDS.find((c) => c.id === id))
    .filter((c): c is CardMeta => c !== undefined);

  // Append any CARDS entries not yet in cardOrder (forward-compat for new cards)
  for (const c of CARDS) {
    if (!orderedCards.find((o) => o.id === c.id)) orderedCards.push(c);
  }

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.scroll}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>VISIBLE CARDS</Text>
      <Text style={[styles.hint, { color: colors.textSecondary }]}>
        Use arrows to reorder. Toggle to show or hide.
      </Text>

      {orderedCards.map((card, index) => {
        const isVisible = !hiddenCards.includes(card.id);
        const isFirst = index === 0;
        const isLast = index === orderedCards.length - 1;

        return (
          <View
            key={card.id}
            style={[styles.row, { borderBottomColor: colors.border }]}
          >
            {/* Reorder arrows */}
            <View style={styles.arrows}>
              <TouchableOpacity
                onPress={() => reorderCards(card.id, 'up')}
                disabled={isFirst}
                hitSlop={{ top: 8, bottom: 4, left: 8, right: 8 }}
              >
                <Ionicons
                  name="chevron-up"
                  size={18}
                  color={isFirst ? colors.border : colors.textSecondary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => reorderCards(card.id, 'down')}
                disabled={isLast}
                hitSlop={{ top: 4, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name="chevron-down"
                  size={18}
                  color={isLast ? colors.border : colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {/* Card icon + label */}
            <Ionicons name={card.icon} size={20} color={card.color} />
            <Text style={[styles.label, { color: colors.textPrimary }]}>{card.title}</Text>

            {/* Visibility toggle */}
            <Switch
              value={isVisible}
              onValueChange={() => toggleCardVisibility(card.id)}
              trackColor={{ false: colors.border, true: Colors.accent + '80' }}
              thumbColor={isVisible ? Colors.accent : colors.textSecondary}
            />
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  hint: {
    fontSize: 12,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  arrows: {
    alignItems: 'center',
    gap: 2,
  },
  label: { fontSize: 15, fontWeight: '500', flex: 1 },
});
