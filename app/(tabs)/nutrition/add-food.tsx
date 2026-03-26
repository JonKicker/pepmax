import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  SectionList,
  ActivityIndicator,
  Switch,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { analytics, AnalyticsEvent } from '../../../src/services/analytics';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors, Theme } from '../../../src/constants/theme';
import { useAuth } from '../../../src/contexts/AuthContext';
import {
  searchFood,
  getRecentFoods,
  getFavorites,
  removeFavorite,
} from '../../../src/services/nutritionService';
import { getRecipes, logRecipeAsFood } from '../../../src/services/recipeService';
import type { FoodSearchResult, FavoriteFood, FoodLogEntry, FoodNavPayload, MealSlotConfig } from '../../../src/types/nutrition';
import { DEFAULT_MEAL_SLOTS, getSlotLabel } from '../../../src/types/nutrition';
import type { Recipe } from '../../../src/types/recipe';
import { getPeptides } from '../../../src/services/peptideService';
import type { Peptide } from '../../../src/types/peptide';
import { usePeptideFasting } from '../../../src/hooks/usePeptideFasting';
import { GlassBackground } from '../../../src/components/GlassBackground';

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
    foodSource: s.foodSource,
    micronutrients100g: s.micronutrients100g,
    portions: s.portions,
  };
  return JSON.stringify(payload);
}

// ─── Source Badge ─────────────────────────────────────────────────────────────

function SourceBadge({ source, colors }: { source: 'usda' | 'off' | undefined; colors: Theme['colors'] }) {
  if (source === 'usda') {
    return (
      <View style={[styles.badge, styles.badgeUSDA]}>
        <Ionicons name="checkmark-circle" size={10} color="white" />
        <Text style={styles.badgeTextUSDA}>USDA</Text>
      </View>
    );
  }
  if (source === 'off') {
    return (
      <View style={[styles.badge, { backgroundColor: colors.textSecondary }]}>
        <Text style={styles.badgeTextOFF}>Community</Text>
      </View>
    );
  }
  return null;
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
        <View style={styles.resultNameRow}>
          <Text style={[styles.resultName, { color: colors.textPrimary }]} numberOfLines={1}>
            {item.name}
          </Text>
          <SourceBadge source={item.foodSource} colors={colors} />
        </View>
        {!!item.usdaFullDescription && item.usdaFullDescription !== item.name && (
          <Text style={[styles.resultSubtitle, { color: colors.textSecondary }]} numberOfLines={2}>
            {item.usdaFullDescription}
          </Text>
        )}
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

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ title, colors }: { title: string; colors: Theme['colors'] }) {
  return (
    <View style={[styles.sectionHeader, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
      <Text style={[styles.sectionHeaderText, { color: colors.textSecondary }]}>{title}</Text>
    </View>
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

type Tab = 'search' | 'recent' | 'favorites' | 'recipes';

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AddFoodScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { userProfile } = useAuth();
  const { mealSlot: paramSlot, mode } = useLocalSearchParams<{ mealSlot?: string; mode?: string }>();

  const isIngredientMode = mode === 'ingredient';
  const activeSlots: MealSlotConfig[] = userProfile?.mealSlots ?? DEFAULT_MEAL_SLOTS;

  const [activeTab, setActiveTab] = useState<Tab>('search');
  const [mealSlot, setMealSlot] = useState<string>(
    activeSlots.some((s) => s.id === paramSlot) ? (paramSlot as string) : (activeSlots[0]?.id ?? 'breakfast')
  );

  // Sync mealSlot once userProfile loads — catches the case where userProfile was null on
  // first render (so DEFAULT_MEAL_SLOTS was used) but paramSlot is valid in the loaded slots.
  useEffect(() => {
    if (paramSlot && activeSlots.some((s) => s.id === paramSlot)) {
      setMealSlot(paramSlot);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile]);

  const [showSlotPicker, setShowSlotPicker] = useState(false);

  // ─── Peptide fasting warning ──────────────────────────────────────────────
  // Load peptides once so usePeptideFasting can resolve fasting windows
  const [peptideList, setPeptideList] = useState<Peptide[]>([]);
  const fastingWarningTrackedRef = useRef(false);
  useEffect(() => {
    getPeptides().then((r) => { if (r.data) setPeptideList(r.data); }).catch(() => {});
  }, []);
  const { activeWindows: activePeptideFastingWindows } = usePeptideFasting({ peptides: peptideList });

  // Track the warning once when it first appears (fire-and-forget)
  useEffect(() => {
    if (activePeptideFastingWindows.length > 0 && !fastingWarningTrackedRef.current) {
      fastingWarningTrackedRef.current = true;
      analytics.track(AnalyticsEvent.PEPTIDE_FASTING_WARNING_SHOWN, {
        peptide_count: activePeptideFastingWindows.length,
      });
    }
  }, [activePeptideFastingWindows]);

  // Recipes tab state
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [recipesLoading, setRecipesLoading] = useState(false);

  // Search tab state
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoodSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchDone, setSearchDone] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);

  // Recent tab state
  const [recentFoods, setRecentFoods] = useState<FoodLogEntry[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);

  // Favorites tab state
  const [favorites, setFavorites] = useState<FavoriteFood[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);

  // ─── Debounced search (500ms) ─────────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setSearchResults([]);
      setSearchDone(false);
      setSearchError(null);
      setSearchLoading(false);
      return;
    }
    // Show spinner immediately — before the debounce fires
    setSearchLoading(true);
    setSearchError(null);
    debounceRef.current = setTimeout(async () => {
      // Abort any in-flight request before starting a new one
      searchAbortRef.current?.abort();
      searchAbortRef.current = new AbortController();
      const signal = searchAbortRef.current.signal;

      setSearchDone(false);
      const result = await searchFood(query, signal);

      // Ignore results from aborted (stale) requests
      if (result.error?.name === 'AbortError') return;

      setSearchLoading(false);
      setSearchDone(true);
      if (result.error) {
        if (result.error.message === 'Request timed out') {
          setSearchError('Search timed out — try a simpler term.');
        } else {
          setSearchError('Search unavailable. Try manual entry.');
        }
        setSearchResults([]);
      } else {
        setSearchResults(result.data ?? []);
        analytics.track(AnalyticsEvent.FOOD_SEARCH_PERFORMED, {
          query_length: query.trim().length,
          results_count: result.data?.length ?? 0,
        });
      }
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // ─── Load recent/favorites/recipes on tab change ─────────────────────────
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
    if (activeTab === 'recipes' && recipes.length === 0) {
      setRecipesLoading(true);
      getRecipes().then((r) => {
        if (r.data) setRecipes(r.data);
        setRecipesLoading(false);
      });
    }
  }, [activeTab]);

  const navigateToDetail = useCallback(
    (item: FoodSearchResult | FavoriteFood | FoodLogEntry, source: FoodNavPayload['source']) => {
      router.push({
        pathname: '/(tabs)/nutrition/food-detail',
        params: {
          foodData: foodNavPayload(item, source),
          mealSlot,
          ...(isIngredientMode ? { mode: 'ingredient' } : {}),
        },
      });
    },
    [mealSlot, router, isIngredientMode]
  );

  const handleRemoveFavorite = async (id: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    const result = await removeFavorite(id);
    if (!result.error) setFavorites((prev) => prev.filter((f) => f.id !== id));
  };

  // ─── Build sections for SectionList ──────────────────────────────────────
  const filteredResults = verifiedOnly
    ? searchResults.filter((r) => r.foodSource === 'usda')
    : searchResults;

  const usdaResults = filteredResults.filter((r) => r.foodSource === 'usda');
  const offResults = filteredResults.filter((r) => r.foodSource === 'off');

  const sections = [
    ...(usdaResults.length > 0
      ? [{ title: 'Verified Database', data: usdaResults }]
      : []),
    ...(offResults.length > 0 && !verifiedOnly
      ? [{ title: 'Community Database', data: offResults }]
      : []),
  ];

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

      {/* Verified Only toggle */}
      {searchResults.length > 0 && (
        <View style={[styles.toggleRow, { borderBottomColor: colors.border }]}>
          <Text style={[styles.toggleLabel, { color: colors.textSecondary }]}>Verified only</Text>
          <Switch
            value={verifiedOnly}
            onValueChange={setVerifiedOnly}
            trackColor={{ true: Colors.nutrition }}
            thumbColor="white"
          />
        </View>
      )}

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
      {!searchLoading && !searchError && searchDone && filteredResults.length === 0 && (
        <View style={styles.searchFeedback}>
          <Text style={[styles.feedbackText, { color: colors.textSecondary }]}>
            {verifiedOnly
              ? 'No verified results. Try turning off "Verified only".'
              : `No results for "${query}".`}
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
      {sections.length > 0 && (
        <SectionList
          sections={sections}
          keyExtractor={(item, i) => `${item.barcode || item.name}-${i}`}
          keyboardShouldPersistTaps="handled"
          renderSectionHeader={({ section }) => (
            <SectionHeader title={section.title} colors={colors} />
          )}
          renderItem={({ item }) => (
            <SearchResultRow
              item={item}
              colors={colors}
              onPress={() => navigateToDetail(item, 'search')}
            />
          )}
          stickySectionHeadersEnabled={false}
        />
      )}
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

  const renderRecipes = () => (
    <View style={{ flex: 1 }}>
      {recipesLoading ? (
        <View style={styles.searchFeedback}>
          <ActivityIndicator color={Colors.nutrition} />
        </View>
      ) : recipes.length === 0 ? (
        <View style={styles.searchFeedback}>
          <Ionicons name="book-outline" size={36} color={colors.textSecondary} style={{ opacity: 0.3 }} />
          <Text style={[styles.feedbackText, { color: colors.textSecondary }]}>
            No recipes yet. Create one from My Recipes.
          </Text>
        </View>
      ) : (
        <FlatList
          data={recipes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.resultRow, { borderBottomColor: colors.border }]}
              onPress={async () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                // Batch cook recipes need fraction selection — send to My Recipes modal
                if (item.isBatchCook) {
                  router.push('/(tabs)/nutrition/my-recipes');
                  return;
                }
                // Non-batch: log full serving inline
                const result = await logRecipeAsFood(item, mealSlot, 1);
                if (result.error) {
                  Alert.alert('Error', 'Failed to log recipe.');
                  return;
                }
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                router.back();
              }}
              activeOpacity={0.7}
            >
              <View style={styles.resultBody}>
                <Text style={[styles.resultName, { color: colors.textPrimary }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[styles.resultMacros, { color: colors.textSecondary }]}>
                  {item.servings} serving{item.servings !== 1 ? 's' : ''} · P {item.perServingNutrition.protein}g · C {item.perServingNutrition.carbs}g · F {item.perServingNutrition.fat}g
                </Text>
              </View>
              <View style={styles.resultRight}>
                <Text style={[styles.resultCal, { color: Colors.nutrition }]}>{item.perServingNutrition.calories}</Text>
                <Text style={[styles.resultCalUnit, { color: colors.textSecondary }]}>kcal</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );

  return (
    <GlassBackground>
    <View style={styles.container}>
      {/* Meal slot selector — hidden in ingredient mode */}
      {!isIngredientMode && (
        <>
          <View style={[styles.slotRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.slotLabel, { color: colors.textSecondary }]}>Logging to:</Text>
            <TouchableOpacity
              style={[styles.slotBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setShowSlotPicker((v) => !v)}
            >
              <Text style={[styles.slotBtnText, { color: colors.textPrimary }]}>
                {getSlotLabel(mealSlot, activeSlots)}
              </Text>
              <Ionicons name={showSlotPicker ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          {showSlotPicker && (
            <View style={[styles.slotDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {activeSlots.map((slot) => (
                <TouchableOpacity
                  key={slot.id}
                  style={[styles.slotItem, { borderBottomColor: colors.border }]}
                  onPress={() => { setMealSlot(slot.id); setShowSlotPicker(false); }}
                >
                  <Text style={[styles.slotItemText, { color: slot.id === mealSlot ? Colors.nutrition : colors.textPrimary }]}>
                    {slot.label}
                  </Text>
                  {slot.id === mealSlot && <Ionicons name="checkmark" size={16} color={Colors.nutrition} />}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </>
      )}

      {/* Peptide fasting warning — shown when an active post-injection window is open */}
      {activePeptideFastingWindows.length > 0 && (
        <View style={[styles.fastingWarning, { backgroundColor: Colors.warning + '1A', borderColor: Colors.warning + '4D' }]}>
          <Ionicons name="warning-outline" size={16} color={Colors.warning} />
          <Text style={[styles.fastingWarningText, { color: colors.textPrimary }]}>
            {activePeptideFastingWindows.length === 1
              ? `${activePeptideFastingWindows[0]!.peptideName} fasting window is active — eating may reduce effectiveness.`
              : `${activePeptideFastingWindows.length} peptide fasting windows are active — eating may reduce effectiveness.`}
          </Text>
        </View>
      )}

      {/* Tabs */}
      <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
        {(isIngredientMode
          ? (['search', 'recent', 'favorites'] as Tab[])
          : (['search', 'recent', 'favorites', 'recipes'] as Tab[])
        ).map((t) => (
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
        {activeTab === 'recipes' && !isIngredientMode && renderRecipes()}
      </View>
    </View>
    </GlassBackground>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  fastingWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  fastingWarningText: { flex: 1, fontSize: 13, lineHeight: 18 },

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
    minHeight: 44,
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
    minHeight: 44,
  },
  slotItemText: { fontSize: 15 },

  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, minHeight: 44 },
  tabText: { fontSize: 14, fontWeight: '600' },

  searchInput: {
    margin: 12,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    minHeight: 44,
  },
  searchFeedback: { flex: 1, alignItems: 'center', paddingTop: 48, gap: 12, paddingHorizontal: 32 },
  feedbackText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  manualLink: { fontSize: 14, fontWeight: '600' },
  manualEntryRow: { marginTop: 8 },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toggleLabel: { fontSize: 13, fontWeight: '500' },

  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionHeaderText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },

  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 44,
  },
  resultBody: { flex: 1 },
  resultNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  resultName: { fontSize: 14, fontWeight: '600' },
  resultSubtitle: { fontSize: 11, marginTop: 1, fontStyle: 'italic' },
  resultBrand: { fontSize: 12, marginTop: 1 },
  resultMacros: { fontSize: 12, marginTop: 3 },
  resultRight: { alignItems: 'flex-end', marginLeft: 12 },
  resultCal: { fontSize: 16, fontWeight: '700' },
  resultCalUnit: { fontSize: 11 },
  removeFavBtn: { padding: 8, marginLeft: 4, minHeight: 44, justifyContent: 'center' },
  barcodeBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', minHeight: 44 },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    gap: 3,
  },
  badgeUSDA: { backgroundColor: Colors.nutrition },
  badgeOFF: {},
  badgeTextUSDA: { fontSize: 10, fontWeight: '700', color: 'white' },
  badgeTextOFF: { fontSize: 10, fontWeight: '600', color: 'white' },
});
