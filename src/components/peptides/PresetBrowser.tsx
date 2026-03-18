/**
 * PresetBrowser — modal sheet for browsing and adding pre-built compound presets.
 *
 * Features: search bar, category filter chips, compound cards with dose chips.
 * Adding a preset calls onAdd(preset, selectedDose); the parent handles Firestore write.
 */
import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { Colors } from '../../constants/theme';
import { PEPTIDE_CATEGORIES } from '../../types/peptide';
import type { PeptideCategory } from '../../types/peptide';
import { PRESET_COMPOUNDS } from '../../data/presetCompounds';
import type { PresetCompound } from '../../data/presetCompounds';

type Props = {
  visible: boolean;
  onClose: () => void;
  onAdd: (preset: PresetCompound, dose: number) => void;
  existingPeptideNames: string[];
};

// ─── Compound card ────────────────────────────────────────────────────────────

function CompoundCard({
  preset,
  alreadyInLibrary,
  onAdd,
  colors,
}: {
  preset: PresetCompound;
  alreadyInLibrary: boolean;
  onAdd: (dose: number) => void;
  colors: ReturnType<typeof import('../../hooks/useTheme').useTheme>['colors'];
}) {
  const halfLifeLabel =
    preset.halfLifeHours < 1
      ? `t½: ${preset.halfLifeHours * 60}min`
      : `t½: ${preset.halfLifeHours}h`;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.cardAccent, { backgroundColor: Colors.peptide }]} />
      <View style={styles.cardContent}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardName, { color: colors.textPrimary }]}>{preset.name}</Text>
            {preset.subcategoryLabel && (
              <Text style={[styles.cardSubcategory, { color: colors.textSecondary }]}>
                {preset.subcategoryLabel}
              </Text>
            )}
          </View>
          {alreadyInLibrary && (
            <Text style={[styles.alreadyLabel, { color: colors.textSecondary }]}>In library</Text>
          )}
        </View>

        {/* Info badges */}
        <View style={styles.badgeRow}>
          <Badge label={preset.category} color={Colors.peptide} />
          <Badge label={halfLifeLabel} color={colors.textSecondary} />
          <Badge label={preset.defaultRoute} color={colors.textSecondary} />
        </View>

        {/* Dose chips */}
        <Text style={[styles.doseLabel, { color: colors.textSecondary }]}>Select dose to add:</Text>
        <View style={styles.doseRow}>
          {preset.commonDoses.map((dose) => (
            <TouchableOpacity
              key={dose}
              style={[styles.doseChip, { borderColor: Colors.peptide }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onAdd(dose);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.doseChipText, { color: Colors.peptide }]}>
                {dose} {preset.unit}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.badge, { borderColor: color + '40' }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PresetBrowser({ visible, onClose, onAdd, existingPeptideNames }: Props) {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<PeptideCategory | 'All'>('All');

  const existingSet = useMemo(
    () => new Set(existingPeptideNames.map((n) => n.toLowerCase())),
    [existingPeptideNames],
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return PRESET_COMPOUNDS.filter((p) => {
      const matchesQuery = q === '' || p.name.toLowerCase().includes(q);
      const matchesCategory = activeCategory === 'All' || p.category === activeCategory;
      return matchesQuery && matchesCategory;
    });
  }, [query, activeCategory]);

  const handleAdd = (preset: PresetCompound, dose: number) => {
    const alreadyInLibrary = existingSet.has(preset.name.toLowerCase());
    if (alreadyInLibrary) {
      Alert.alert(
        'Already in library',
        `You already have ${preset.name}. Add another entry?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Add',
            onPress: () => onAdd(preset, dose),
          },
        ],
      );
    } else {
      onAdd(preset, dose);
    }
  };

  const handleClose = () => {
    setQuery('');
    setActiveCategory('All');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.background }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {/* Title row */}
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Browse Presets</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="search-outline" size={16} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              value={query}
              onChangeText={setQuery}
              placeholder="Search compounds..."
              placeholderTextColor={colors.textSecondary}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
          </View>

          {/* Category filter chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryRow}
          >
            {(['All', ...PEPTIDE_CATEGORIES] as const).map((cat) => {
              const active = activeCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: active ? Colors.peptide : colors.surface,
                      borderColor: active ? Colors.peptide : colors.border,
                    },
                  ]}
                  onPress={() => setActiveCategory(cat)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      { color: active ? '#fff' : colors.textSecondary },
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Compound list */}
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.presetId}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No compounds match your search.
              </Text>
            }
            renderItem={({ item }) => (
              <CompoundCard
                preset={item}
                alreadyInLibrary={existingSet.has(item.name.toLowerCase())}
                onAdd={(dose) => handleAdd(item, dose)}
                colors={colors}
              />
            )}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  categoryRow: {
    gap: 8,
    paddingBottom: 12,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  list: {
    gap: 12,
    paddingTop: 4,
    paddingBottom: 20,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    fontStyle: 'italic',
    paddingVertical: 24,
  },

  // Card
  card: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardAccent: {
    width: 4,
    alignSelf: 'stretch',
  },
  cardContent: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    paddingRight: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '700',
  },
  cardSubcategory: {
    fontSize: 12,
    marginTop: 2,
  },
  alreadyLabel: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  doseLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  doseRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  doseChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  doseChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
