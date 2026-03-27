import React, { useMemo, useState } from 'react';
import {
  SafeAreaView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { GlassBackground } from '../../../src/components/GlassBackground';
import { AnimatedPressable } from '../../../src/components/AnimatedPressable';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import {
  COMPOUND_DATABASE,
  searchCompounds,
  getCompoundsByGroup,
  getCompoundGroups,
} from '../../../src/data/compoundDatabase';
import type { Compound, CompoundCategory, CompoundStatus } from '../../../src/data/compoundDatabase';

// ─── Types ─────────────────────────────────────────────────────────

interface CompoundSection {
  title: string;
  data: Compound[];
}

// ─── Status Badge ──────────────────────────────────────────────────

interface BadgeColors {
  bg: string;
  text: string;
}

function getStatusBadgeColors(status: CompoundStatus, dark: boolean): BadgeColors {
  if (status === 'FDA-Approved' || status === 'FDA-Approved (Rx/Compounded)') {
    return dark
      ? { bg: '#1B5E20' + '33', text: '#66BB6A' }
      : { bg: '#E8F5E9', text: '#2E7D32' };
  }
  if (status === 'Compounded') {
    return dark
      ? { bg: '#E65100' + '33', text: '#FFB74D' }
      : { bg: '#FFF3E0', text: '#E65100' };
  }
  // Research Peptide
  return dark
    ? { bg: '#546E7A' + '33', text: '#90A4AE' }
    : { bg: '#ECEFF1', text: '#546E7A' };
}

interface StatusBadgeProps {
  status: CompoundStatus;
  dark: boolean;
}

function StatusBadge({ status, dark }: StatusBadgeProps) {
  const { bg, text } = getStatusBadgeColors(status, dark);
  const label =
    status === 'FDA-Approved (Rx/Compounded)' ? 'FDA / Compounded' : status;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: text }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

// ─── Compound Row ──────────────────────────────────────────────────

interface CompoundRowProps {
  compound: Compound;
}

function CompoundRow({ compound }: CompoundRowProps) {
  const { colors, dark } = useTheme();
  const router = useRouter();

  return (
    <AnimatedPressable
      haptic
      accessibilityLabel={`Learn about ${compound.name}`}
      onPress={() =>
        router.push({
          pathname: '/(tabs)/peptides/compound-detail',
          params: { id: compound.id },
        })
      }
    >
      <View
        style={[
          styles.row,
          {
            backgroundColor: colors.glass.subtle,
            borderColor: colors.glass.border,
          },
        ]}
      >
        <View style={styles.rowContent}>
          <Text
            style={[styles.compoundName, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {compound.name}
          </Text>
          {compound.aliases !== 'N/A' && (
            <Text
              style={[styles.compoundAliases, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {compound.aliases}
            </Text>
          )}
        </View>
        <StatusBadge status={compound.status} dark={dark} />
        <Ionicons
          name="chevron-forward"
          size={16}
          color={colors.textSecondary}
          style={styles.chevron}
          accessible={false}
        />
      </View>
    </AnimatedPressable>
  );
}

// ─── Popular compound IDs (GLP-1 group, shown first) ───────────────

const POPULAR_IDS = ['semaglutide', 'tirzepatide', 'liraglutide'];

// ─── Main Screen ───────────────────────────────────────────────────

export default function CompoundLibraryScreen() {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<CompoundCategory | 'All'>('All');

  const allGroups = useMemo(() => getCompoundGroups(), []);

  const sections = useMemo<CompoundSection[]>(() => {
    // Search mode — flat "Search Results" section
    if (searchQuery.trim().length > 0) {
      return [
        {
          title: 'Search Results',
          data: searchCompounds(searchQuery),
        },
      ];
    }

    // Group filter mode — single section for the selected group
    if (selectedGroup !== 'All') {
      return [
        {
          title: selectedGroup,
          data: getCompoundsByGroup(selectedGroup),
        },
      ];
    }

    // Default: "Popular" first (GLP-1 compounds, prioritised order), then
    // all remaining groups sorted alphabetically.
    const glp1Compounds = COMPOUND_DATABASE.filter(
      (c) => c.group === 'GLP-1 / Weight Management',
    );

    const popularOrdered: Compound[] = [];
    const popularSet = new Set(POPULAR_IDS);

    // Insert pinned IDs in order
    POPULAR_IDS.forEach((id) => {
      const match = glp1Compounds.find((c) => c.id === id);
      if (match) popularOrdered.push(match);
    });
    // Append remaining GLP-1 entries not already pinned
    glp1Compounds.forEach((c) => {
      if (!popularSet.has(c.id)) popularOrdered.push(c);
    });

    const popularSection: CompoundSection = {
      title: 'Popular',
      data: popularOrdered,
    };

    // Remaining groups (excluding GLP-1 which is already in Popular), sorted A→Z
    const remainingGroups = allGroups
      .filter((g) => g !== 'GLP-1 / Weight Management')
      .sort((a, b) => a.localeCompare(b));

    const remainingSections: CompoundSection[] = remainingGroups
      .map((group) => ({
        title: group,
        data: getCompoundsByGroup(group),
      }))
      .filter((s) => s.data.length > 0);

    return [popularSection, ...remainingSections];
  }, [searchQuery, selectedGroup, allGroups]);

  return (
    <GlassBackground>
      <SafeAreaView style={styles.container}>
        {/* Search bar */}
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: colors.glass.subtle,
              borderColor: colors.glass.border,
            },
          ]}
        >
          <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search compounds, aliases..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>

        {/* Category filter chips */}
        <View style={styles.chipList}>
          <AnimatedPressable
            onPress={() => setSelectedGroup('All')}
            scaleValue={0.94}
          >
            <View
              style={[
                styles.chip,
                selectedGroup === 'All'
                  ? { backgroundColor: Colors.peptide, borderColor: Colors.peptide }
                  : { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: selectedGroup === 'All' ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                All
              </Text>
            </View>
          </AnimatedPressable>

          {allGroups.map((group) => {
            const active = selectedGroup === group;
            return (
              <AnimatedPressable
                key={group}
                onPress={() => setSelectedGroup(group)}
                scaleValue={0.94}
              >
                <View
                  style={[
                    styles.chip,
                    active
                      ? { backgroundColor: Colors.peptide, borderColor: Colors.peptide }
                      : { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: active ? '#FFFFFF' : colors.textSecondary },
                    ]}
                    numberOfLines={1}
                  >
                    {group}
                  </Text>
                </View>
              </AnimatedPressable>
            );
          })}
        </View>

        {/* Compound list */}
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <CompoundRow compound={item} />}
          renderSectionHeader={({ section: { title } }) => (
            <Text
              style={[styles.sectionHeader, { color: colors.textSecondary }]}
            >
              {title.toUpperCase()}
            </Text>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name="flask-outline"
                size={48}
                color={colors.textSecondary}
                style={styles.emptyIcon}
              />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                No compounds found
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Try a different search term or category
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        />
      </SafeAreaView>
    </GlassBackground>
  );
}

// ─── Styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Search bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginHorizontal: 16,
    marginTop: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },

  // Category chips
  chipList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Section list
  listContent: {
    paddingBottom: 100,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
  },

  // Compound row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  rowContent: {
    flex: 1,
  },
  compoundName: {
    fontSize: 16,
    fontWeight: '600',
  },
  compoundAliases: {
    fontSize: 13,
    marginTop: 2,
  },
  chevron: {
    marginLeft: 8,
  },

  // Status badge
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 10,
    flexShrink: 1,
    maxWidth: 120,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 64,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
