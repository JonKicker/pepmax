/**
 * Community Library screen — browse, search, filter, and paginate community templates.
 * Accessible from the Dashboard tab. Category tabs + search + sort + infinite scroll.
 */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import useCommunityTemplates from '../../../src/hooks/useCommunityTemplates';
import CategoryTabs from '../../../src/components/community/CategoryTabs';
import TemplateCard from '../../../src/components/community/TemplateCard';
import { SkeletonCard } from '../../../src/components/SkeletonLoader';
import type { CommunityTemplate } from '../../../src/types/communityTemplate';
import type { SortOption } from '../../../src/hooks/useCommunityTemplates';

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: 'newest', label: 'Newest' },
  { key: 'most_imported', label: 'Most Imported' },
  { key: 'highest_rated', label: 'Highest Rated' },
];

export default function CommunityLibraryScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [showSortMenu, setShowSortMenu] = useState(false);

  const {
    templates,
    loading,
    refreshing,
    hasMore,
    category,
    sortBy,
    searchQuery,
    setCategory,
    setSortBy,
    setSearchQuery,
    loadMore,
    refresh,
    initialLoad,
  } = useCommunityTemplates();

  // Debounce search
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = useCallback(
    (text: string) => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
      searchTimeout.current = setTimeout(() => setSearchQuery(text), 300);
    },
    [setSearchQuery]
  );

  useEffect(() => {
    initialLoad();
  }, []);

  const handleTemplatePress = useCallback(
    (template: CommunityTemplate) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push({
        pathname: '/(tabs)/dashboard/template-detail',
        params: { templateId: template.id },
      });
    },
    [router]
  );

  const currentSortLabel =
    SORT_OPTIONS.find((o) => o.key === sortBy)?.label ?? 'Sort';

  const renderFooter = () => {
    if (!hasMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.skeletonList}>
          {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <View style={[styles.emptyIconWrap, { backgroundColor: Colors.accent + '18' }]}>
          <Ionicons name="people-outline" size={48} color={Colors.accent} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Templates Yet</Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          {searchQuery
            ? 'No templates match your search. Try different tags or keywords.'
            : 'Be the first to share a protocol with the community!'}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search bar */}
      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={16} color={colors.textSecondary} />
        <TextInput
          placeholder="Search by title or tag…"
          placeholderTextColor={colors.textSecondary}
          style={[styles.searchInput, { color: colors.textPrimary }]}
          onChangeText={handleSearchChange}
          clearButtonMode="while-editing"
          autoCapitalize="none"
          returnKeyType="search"
        />
      </View>

      {/* Category tabs */}
      <CategoryTabs selected={category} onSelect={setCategory} colors={colors} />

      {/* Sort control */}
      <View style={[styles.sortRow, { borderBottomColor: colors.border }]}>
        <Text style={[styles.resultCount, { color: colors.textSecondary }]}>
          {templates.length > 0 ? `${templates.length} template${templates.length !== 1 ? 's' : ''}` : ''}
        </Text>
        <TouchableOpacity
          style={[styles.sortBtn, { borderColor: colors.border }]}
          onPress={() => setShowSortMenu((v) => !v)}
        >
          <Ionicons name="funnel-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.sortBtnText, { color: colors.textSecondary }]}>{currentSortLabel}</Text>
          <Ionicons name={showSortMenu ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Sort menu dropdown */}
      {showSortMenu && (
        <View style={[styles.sortMenu, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {SORT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.sortMenuRow, { borderBottomColor: colors.border }]}
              onPress={() => {
                setSortBy(opt.key);
                setShowSortMenu(false);
              }}
            >
              <Text style={[styles.sortMenuText, { color: opt.key === sortBy ? Colors.accent : colors.textPrimary }]}>
                {opt.label}
              </Text>
              {opt.key === sortBy && (
                <Ionicons name="checkmark" size={16} color={Colors.accent} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      <FlatList
        data={templates}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, templates.length === 0 && styles.listEmpty]}
        renderItem={({ item }) => (
          <TemplateCard template={item} onPress={handleTemplatePress} colors={colors} />
        )}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={Colors.accent}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 15 },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  resultCount: { fontSize: 12 },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  sortBtnText: { fontSize: 12, fontWeight: '600' },
  sortMenu: {
    position: 'absolute',
    right: 16,
    top: 130,
    zIndex: 100,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    minWidth: 160,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  sortMenuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sortMenuText: { fontSize: 14, fontWeight: '500' },
  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 80 },
  listEmpty: { flexGrow: 1 },
  footer: { paddingVertical: 20, alignItems: 'center' },
  skeletonList: { paddingHorizontal: 16, paddingTop: 12, gap: 10 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingTop: 60 },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
