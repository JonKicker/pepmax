/**
 * TemplateCard — compact card for the community library list.
 * Shows title, category badge, description preview, tags, rating, and import count.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import StarRating from './StarRating';
import type { CommunityTemplate } from '../../types/communityTemplate';

function categoryColor(cat: CommunityTemplate['category']): string {
  switch (cat) {
    case 'peptide_cycle': return Colors.peptide;
    case 'workout': return Colors.gym;
    case 'nutrition_plan': return Colors.nutrition;
  }
}

function categoryLabel(cat: CommunityTemplate['category']): string {
  switch (cat) {
    case 'peptide_cycle': return 'Peptide Cycle';
    case 'workout': return 'Workout';
    case 'nutrition_plan': return 'Nutrition';
  }
}

type Props = {
  template: CommunityTemplate;
  onPress: (template: CommunityTemplate) => void;
  colors: any;
};

export default function TemplateCard({ template, onPress, colors }: Props) {
  const catColor = categoryColor(template.category);
  const catLabel = categoryLabel(template.category);

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => onPress(template)}
      activeOpacity={0.7}
    >
      {/* Left accent stripe */}
      <View style={[styles.accent, { backgroundColor: catColor }]} />

      <View style={styles.body}>
        {/* Top row: category badge + title */}
        <View style={styles.topRow}>
          <View style={[styles.catBadge, { backgroundColor: catColor + '18' }]}>
            <Text style={[styles.catBadgeText, { color: catColor }]}>{catLabel}</Text>
          </View>
        </View>

        <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
          {template.title}
        </Text>

        <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
          {template.description}
        </Text>

        {/* Tags */}
        {template.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {template.tags.slice(0, 4).map((tag) => (
              <View key={tag} style={[styles.tagPill, { backgroundColor: colors.background }]}>
                <Text style={[styles.tagText, { color: colors.textSecondary }]}>{tag}</Text>
              </View>
            ))}
            {template.tags.length > 4 && (
              <Text style={[styles.tagText, { color: colors.textSecondary }]}>
                +{template.tags.length - 4}
              </Text>
            )}
          </View>
        )}

        {/* Stats row */}
        <View style={styles.statsRow}>
          <StarRating rating={template.averageRating} size={13} />
          {template.reviewCount > 0 && (
            <Text style={[styles.statText, { color: colors.textSecondary }]}>
              ({template.reviewCount})
            </Text>
          )}
          <View style={styles.statSpacer} />
          <Ionicons name="download-outline" size={13} color={colors.textSecondary} />
          <Text style={[styles.statText, { color: colors.textSecondary }]}>
            {template.importCount}
          </Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} style={styles.chevron} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    overflow: 'hidden',
  },
  accent: { width: 4 },
  body: { flex: 1, padding: 12 },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  catBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  catBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 8,
  },
  tagPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tagText: {
    fontSize: 11,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
  },
  statSpacer: { flex: 1 },
  chevron: { alignSelf: 'center', marginRight: 10 },
});
