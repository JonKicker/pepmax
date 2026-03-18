import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors, Theme } from '../../../src/constants/theme';
import {
  searchFood,
  getRecentFoods,
  getFavorites,
  removeFavorite,
} from '../../../src/services/nutritionService';
import type { FoodSearchResult, FavoriteFood, FoodLogEntry, MealSlot, FoodNavPayload } from '../../../src/types/nutrition';
import { MEAL_SLOTS, MEAL_SLOT_LABELS } from '../../../src/types/nutrition';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function foodNavPayload(
  item: FoodSearchResult | FavoriteFood | FoodLogEntry,
  source: FoodNavPayload['source']
): string {
  // Strip to only what Food Detail needs — never pass full objects through params
  if (source === 'recent') {
    const e = item as FoodLogEntry;
    const servingSizeG = parseFloat(String(e.servingSize)) || 100;
    // Reverse-engineer per-100g from logged amounts (they were already scaled)
    const factor = servingSizeG > 0 ? 100 / servingSizeG : 1;
    const payload: FoodNavPayload = {
      name: e.foodName,
      brand: e.brand ?? '',
      calories100g: Math.round(e.calories * factor),
      protein100g: Math.round(e.protein * factor * 10) / 10,
      carbs100g: Math.round(e.carbs * factor * 10) / 10,
      fat100g: Math.round(e.fat * factor * 10) / 10,
      fiber100g: null,
      sugar100g: null,
      sodium100g: null,
      servingSizeG,
      barcode: '',
      source,
      servingUnit: e.servingUnit,
    };
    return JSON.stringify(payload);
  }
  if (source === 'favorites') {
    const f = item as FavoriteFood;
    const servingSizeG = parseFloat(String(f.servingSize)) || 100;
    const factor = servingSizeG > 0 ? 100 / servingSizeG : 1;
    const payload: FoodNavPayload = {
      name: f.foodName,
      brand: f.brand ?? '',
      calories100g: Math.round(f.calories * factor),
      protein100g: Math.round(f.protein * factor * 10) / 10,
      carbs100g: Math.round(f.carbs * factor * 10) / 10,
      fat100g: Math.round(f.fat * factor * 10) / 10,
      fiber100g: null,
      sugar100g: null,
      sodium100g: null,
      servingSizeG,
      barcode: '',
      source,
      servingUnit: f.servingUnit,
    };
    return JSON.stringify(payload);
  }
  // search
  const s = item as FoodSearchResult;
  const payload: FoodNavPayload = {
    name: s.name,
    brand: s.brand,
    calories100g: s.calories100g,
    protein100g: s.protein100g,
    carbs100g: s.carbs100g,
    fat100g: s.fat100g,
    fiber100g: s.fiber100g,
    sugar100g: s.sugar100g,
    sodium100g: s.sodium100g,
    servingSizeG: s.servingSizeG,
    barcode: s.barcode,
    source,
  };
  return JSON.stringify(payload);
}

// ─── Search Result Row ────────────────────────────────────────────────────────

function SearchResultRow({
  item,
  onPress,
  colors,
}: {
  item: FoodSearchResult;
  onPress: () => void;
  colors: Theme['colors'];
}) {
  return (
    <TouchableOpacity
      style={[styles.resultRow, { borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.resultBody}>
        <Text style={[styles.resultName, { color: colors.textPrimary }]} numberOfLines={1}>
          {item.name}
        </Text>
        {!!item.brand && (
          <Text style={[styles.resultBrand, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.brand}
          </Text>
        )}
        <Text style={[styles.resultMacros, { color: colors.textSecondary }]}>
          P {item.protein100g}g · C {item.carbs100g}g · F {item.fat100g}g per 100g
        </Text>
      </View>
      <View style={styles.resultRight}>
        <Text style={[styles.resultCal, { color: Colors.nutrition }]}>{item.calories100g}</Text>
        <Text style={[styles.resultCalUnit, { color: colors.textSecondary }]}>kcal/100g</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Recent / Favorite Row ────────────────────────────────────────────────────

function FoodRow({
  name,
  brand,
  calories,
  sub,
  onPress,
  onSwipeDelete,
  colors,
}: {
  name: string;
  brand?: string;
  calories: number;
  sub: string;
  onPress: () => void;
  onSwipeDelete?: () => void;
  colors: Theme['colors'];
}) {
  return (
    <TouchableOpacity
      style={[styles.resultRow, { borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.resultBody}>
        <Text style={[styles.resultName, { color: colors.textPrimary }]} numberOfLines={1}>{name}</Text>
        {!!brand && (
          <Text style={[styles.resultBrand, { color: colors.textSecondary }]} numberOfLines={1}>{brand}</Text>
        )}
        <Text style={[styles.resultMacros, { color: colors.textSecondary }]}>{sub}</Text>
      </View>
      <View style={styles.resultRight}>
        <Text style={[styles.resultCal, { color: Colors.nutrition }]}>{Math.round(calories)}</Text>
        <Text style={[styles.resultCalUnit, { color: colors.textSecondary }]}>kcal</Text>
      </View>
      {onSwipeDelete && (
        <TouchableOpacity style={styles.removeFavBtn} onPress={onSwipeDelete}>
          <Ionicons name="star" size={18} color={Colors.warning} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

// ─── Tab constants ─────────────────────────────────────────────────────────────

type Tab = 'search' | 'recent' | 'favorites';

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AddFoodScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { mealSlot: paramSlot } = useLocalSearchParams<{ mealSlot?: MealSlot }>();

  const [activeTab, setActiveTab] = useState<Tab>('search');
  const [mealSlot, setMealSlot] = useState<MealSlot>(
    (MEAL_SLOTS.includes(paramSlot as MealSlot) ? paramSlot : 'breakfast') as MealSlot
  );
  const [showSlotPicker, setShowSlotPicker] = useState(false);

  // Search tab state
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoodSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchDone, setSearchDone] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);

  // Recent tab state
  const [recentFoods, setRecentFoods] = useState<FoodLogEntry[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);

  // Favorites tab state
  const [favorites, setFavorites] = useState<FavoriteFood[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);

  // ─── Debounced search (400ms as required by Ray) ──────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setSearchResults([]);
      setSearchDone(false);
      setSearchError(null);
      setSearchLoading(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      // Abort any in-flight request before starting a new one
      searchAbortRef.current?.abort();
      searchAbortRef.current = new AbortController();
      const signal = searchAbortRef.current.signal;

      setSearchLoading(true);
      setSearchError(null);
      setSearchDone(false);
      const result = await searchFood(query, signal);

      // Ignore results from aborted (stale) requests
      if (result.error?.name === 'AbortError') return;

      setSearchLoading(false);
      setSearchDone(true);
      if (result.error) {
        setSearchError('Search unavailable. Try manual entry.');
        setSearchResults([]);
      } else {
        setSearchResults(result.data ?? []);
      }
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // ─── Load recent/favorites on tab change ─────────────────────────────────
  useEffect(() => {
    if (activeTab === 'recent' && recentFoods.length === 0) {
      setRecentLoading(true);
      getRecentFoods(20).then((r) => {
        if (r.data) setRecentFoods(r.data);
        setRecentLoading(false);
      });
    }
    if (activeTab === 'favorites' && favorites.length === 0) {
      setFavoritesLoading(true);
      getFavorites().then((r) => {
        if (r.data) setFavorites(r.data);
        setFavoritesLoading(false);
      });
    }
  }, [activeTab]);

  const navigateToDetail = useCallback(
    (item: FoodSearchResult | FavoriteFood | FoodLogEntry, source: FoodNavPayload['source']) => {
      router.push({
        pathname: '/(tabs)/nutrition/food-detail',
        params: { foodData: foodNavPayload(item, source), mealSlot },
      });
    },
    [mealSlot, router]
  );

  const handleRemoveFavorite = async (id: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    const result = await removeFavorite(id);
    if (!result.error) setFavorites((prev) => prev.filter((f) => f.id !== id));
  };

  // ─── Render search tab content ────────────────────────────────────────────
  const renderSearch = () => (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', gap: 8, marginHorizontal: 12, marginVertical: 12 }}>
        <TextInput
          style={[styles.searchInput, { flex: 1, backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border, margin: 0 }]}
          value={query}
          onChangeText={setQuery}
          placeholder="Search foods…"
          placeholderTextColor={colors.textSecondary}
          returnKeyType="search"
          autoFocus
          clearButtonMode="while-editing"
        />
        <TouchableOpacity
          style={[styles.barcodeBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => router.push(`/(tabs)/nutrition/barcode-scan?mealSlot=${mealSlot}`)}
          activeOpacity={0.7}
        >
          <Ionicons name="barcode-outline" size={22} color={Colors.nutrition} />
        </TouchableOpacity>
      </View>
      {searchLoading && (
        <View style={styles.searchFeedback}>
          <ActivityIndicator color={Colors.nutrition} />
        </View>
      )}
      {!searchLoading && searchError && (
        <View style={styles.searchFeedback}>
          <Text style={[styles.feedbackText, { color: colors.textSecondary }]}>{searchError}</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/nutrition/manual-entry')}>
            <Text style={[styles.manualLink, { color: Colors.nutrition }]}>Enter manually →</Text>
          </TouchableOpacity>
        </View>
      )}
      {!searchLoading && !searchError && searchDone && searchResults.length === 0 && (
        <View style={styles.searchFeedback}>
          <Text style={[styles.feedbackText, { color: colors.textSecondary }]}>
            No results for "{query}".
          </Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/nutrition/manual-entry')}>
            <Text style={[styles.manualLink, { color: Colors.nutrition }]}>Enter manually →</Text>
          </TouchableOpacity>
        </View>
      )}
      {!searchLoading && !searchError && !searchDone && query.trim().length < 2 && (
        <View style={styles.searchFeedback}>
          <Ionicons name="search" size={36} color={colors.textSecondary} style={{ opacity: 0.3 }} />
          <Text style={[styles.feedbackText, { color: colors.textSecondary }]}>
            Type to search the food database
          </Text>
          <TouchableOpacity
            style={styles.manualEntryRow}
            onPress={() => router.push('/(tabs)/nutrition/manual-entry')}
          >
            <Text style={[styles.manualLink, { color: Colors.nutrition }]}>
              Can't find it? Enter manually →
            </Text>
          </TouchableOpacity>
        </View>
      )}
      <FlatList
        data={searchResults}
        keyExtractor={(item, i) => `${item.barcode || item.name}-${i}`}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <SearchResultRow
            item={item}
            colors={colors}
            onPress={() => navigateToDetail(item, 'search')}
          />
        )}
      />
    </View>
  );

  const renderRecent = () => (
    <View style={{ flex: 1 }}>
      {recentLoading ? (
        <View style={styles.searchFeedback}>
          <ActivityIndicator color={Colors.nutrition} />
        </View>
      ) : recentFoods.length === 0 ? (
        <View style={styles.searchFeedback}>
          <Ionicons name="time-outline" size={36} color={colors.textSecondary} style={{ opacity: 0.3 }} />
          <Text style={[styles.feedbackText, { color: colors.textSecondary }]}>
            No recent foods yet. Log something first.
          </Text>
        </View>
      ) : (
        <FlatList
          data={recentFoods}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <FoodRow
              name={item.foodName}
              brand={item.brand}
              calories={item.calories}
              sub={`${item.servingSize} ${item.servingUnit} · Last logged ${new Date(item.createdAt?.toDate?.() ?? 0).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
              colors={colors}
              onPress={() => navigateToDetail(item, 'recent')}
            />
          )}
        />
      )}
    </View>
  );

  const renderFavorites = () => (
    <View style={{ flex: 1 }}>
      {favoritesLoading ? (
        <View style={styles.searchFeedback}>
          <ActivityIndicator color={Colors.nutrition} />
        </View>
      ) : favorites.length === 0 ? (
        <View style={styles.searchFeedback}>
          <Ionicons name="star-outline" size={36} color={colors.textSecondary} style={{ opacity: 0.3 }} />
          <Text style={[styles.feedbackText, { color: colors.textSecondary }]}>
            No favorites yet. Star a food when logging to save it here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <FoodRow
              name={item.foodName}
              brand={item.brand}
              calories={item.calories}
              sub={`${item.servingSize} ${item.servingUnit}`}
              colors={colors}
              onPress={() => navigateToDetail(item, 'favorites')}
              onSwipeDelete={() => handleRemoveFavorite(item.id)}
            />
          )}
        />
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Meal slot selector */}
      <View style={[styles.slotRow, { borderBottomColor: colors.border }]}>
        <Text style={[styles.slotLabel, { color: colors.textSecondary }]}>Logging to:</Text>
        <TouchableOpacity
          style={[styles.slotBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => setShowSlotPicker((v) => !v)}
        >
          <Text style={[styles.slotBtnText, { color: colors.textPrimary }]}>
            {MEAL_SLOT_LABELS[mealSlot]}
          </Text>
          <Ionicons name={showSlotPicker ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
      {showSlotPicker && (
        <View style={[styles.slotDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {MEAL_SLOTS.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.slotItem, { borderBottomColor: colors.border }]}
              onPress={() => { setMealSlot(s); setShowSlotPicker(false); }}
            >
              <Text style={[styles.slotItemText, { color: s === mealSlot ? Colors.nutrition : colors.textPrimary }]}>
                {MEAL_SLOT_LABELS[s]}
              </Text>
              {s === mealSlot && <Ionicons name="checkmark" size={16} color={Colors.nutrition} />}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Tabs */}
      <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
        {(['search', 'recent', 'favorites'] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, activeTab === t && { borderBottomColor: Colors.nutrition, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(t)}
          >
            <Text style={[styles.tabText, { color: activeTab === t ? Colors.nutrition : colors.textSecondary }]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab content */}
      <View style={{ flex: 1 }}>
        {activeTab === 'search' && renderSearch()}
        {activeTab === 'recent' && renderRecent()}
        {activeTab === 'favorites' && renderFavorites()}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  slotLabel: { fontSize: 13 },
  slotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  slotBtnText: { fontSize: 14, fontWeight: '600' },
  slotDropdown: {
    marginHorizontal: 16,
    marginTop: 4,
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
    zIndex: 10,
  },
  slotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  slotItemText: { fontSize: 15 },

  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabText: { fontSize: 14, fontWeight: '600' },

  searchInput: {
    margin: 12,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
  },
  searchFeedback: { flex: 1, alignItems: 'center', paddingTop: 48, gap: 12, paddingHorizontal: 32 },
  feedbackText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  manualLink: { fontSize: 14, fontWeight: '600' },
  manualEntryRow: { marginTop: 8 },

  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  resultBody: { flex: 1 },
  resultName: { fontSize: 14, fontWeight: '600' },
  resultBrand: { fontSize: 12, marginTop: 1 },
  resultMacros: { fontSize: 12, marginTop: 3 },
  resultRight: { alignItems: 'flex-end', marginLeft: 12 },
  resultCal: { fontSize: 16, fontWeight: '700' },
  resultCalUnit: { fontSize: 11 },
  removeFavBtn: { padding: 8, marginLeft: 4 },
  barcodeBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
});
