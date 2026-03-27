/**
 * useCommunityTemplates — data-fetching hook for the community library browser.
 *
 * Manages paginated template fetching with category, sort, and search filtering.
 * Cursor-based pagination: loads 20 per page, appends on loadMore().
 */
import { useState, useCallback, useRef } from 'react';
import type { DocumentSnapshot } from 'firebase/firestore';
import { queryTemplates } from '../services/communityTemplateService';
import type { SortOption } from '../services/communityTemplateService';
import type { CommunityTemplate } from '../types/communityTemplate';
import type { CategoryFilter } from '../components/community/CategoryTabs';

export type { SortOption };

export default function useCommunityTemplates() {
  const [templates, setTemplates] = useState<CommunityTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [category, setCategory] = useState<CategoryFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [searchQuery, setSearchQuery] = useState('');

  const cursorRef = useRef<DocumentSnapshot | null>(null);
  const isLoadingRef = useRef(false);

  // Raw (unfiltered) results from last fetch — we filter client-side for search.
  const rawTemplatesRef = useRef<CommunityTemplate[]>([]);

  const applySearch = useCallback(
    (list: CommunityTemplate[], query: string): CommunityTemplate[] => {
      if (!query.trim()) return list;
      const q = query.trim().toLowerCase();
      return list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.includes(q))
      );
    },
    []
  );

  const fetch = useCallback(
    async (opts: { reset?: boolean; newCategory?: CategoryFilter; newSort?: SortOption } = {}) => {
      if (isLoadingRef.current) return;
      isLoadingRef.current = true;

      const effectiveCategory = opts.newCategory ?? category;
      const effectiveSort = opts.newSort ?? sortBy;

      if (opts.reset) {
        cursorRef.current = null;
        rawTemplatesRef.current = [];
        setTemplates([]);
        setHasMore(true);
      }

      setLoading(true);

      const result = await queryTemplates({
        category: effectiveCategory,
        sortBy: effectiveSort,
        cursor: opts.reset ? null : cursorRef.current,
      });

      setLoading(false);
      isLoadingRef.current = false;

      if (result.error || !result.data) {
        setHasMore(false);
        return;
      }

      const { templates: newBatch, lastDoc } = result.data;
      cursorRef.current = lastDoc;
      setHasMore(newBatch.length === 20);

      const combined = opts.reset
        ? newBatch
        : [...rawTemplatesRef.current, ...newBatch];
      rawTemplatesRef.current = combined;
      setTemplates(applySearch(combined, searchQuery));
    },
    [category, sortBy, searchQuery, applySearch]
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetch({ reset: true });
    setRefreshing(false);
  }, [fetch]);

  const loadMore = useCallback(() => {
    if (!hasMore || isLoadingRef.current) return;
    fetch();
  }, [hasMore, fetch]);

  const handleSetCategory = useCallback(
    (newCategory: CategoryFilter) => {
      setCategory(newCategory);
      fetch({ reset: true, newCategory });
    },
    [fetch]
  );

  const handleSetSortBy = useCallback(
    (newSort: SortOption) => {
      setSortBy(newSort);
      fetch({ reset: true, newSort });
    },
    [fetch]
  );

  const handleSetSearchQuery = useCallback(
    (q: string) => {
      setSearchQuery(q);
      // Filter the already-fetched results client-side — no new Firestore query.
      setTemplates(applySearch(rawTemplatesRef.current, q));
    },
    [applySearch]
  );

  return {
    templates,
    loading,
    refreshing,
    hasMore,
    category,
    sortBy,
    searchQuery,
    setCategory: handleSetCategory,
    setSortBy: handleSetSortBy,
    setSearchQuery: handleSetSearchQuery,
    loadMore,
    refresh,
    initialLoad: () => fetch({ reset: true }),
  };
}
