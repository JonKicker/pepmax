import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  Modal,
  Animated,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import { getRecipes, deleteRecipe, logRecipeAsFood } from '../../../src/services/recipeService';
import { MEAL_SLOTS, MEAL_SLOT_LABELS } from '../../../src/types/nutrition';
import { SERVING_FRACTIONS } from '../../../src/types/recipe';
import type { Recipe } from '../../../src/types/recipe';
import type { MealSlot } from '../../../src/types/nutrition';

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ visible }: { visible: boolean }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(opacity, { toValue: visible ? 1 : 0, duration: 220, useNativeDriver: true }).start();
  }, [visible, opacity]);
  return (
    <Animated.View style={[styles.toast, { opacity }]} pointerEvents="none">
      <Ionicons name="checkmark-circle" size={18} color="white" />
      <Text style={styles.toastText}>Recipe logged!</Text>
    </Animated.View>
  );
}

// ─── Log Recipe Modal ─────────────────────────────────────────────────────────

function LogRecipeModal({
  recipe,
  visible,
  onClose,
  onLogged,
  colors,
}: {
  recipe: Recipe;
  visible: boolean;
  onClose: () => void;
  onLogged: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const [mealSlot, setMealSlot] = useState<MealSlot>('breakfast');
  const [showSlotPicker, setShowSlotPicker] = useState(false);
  const [fraction, setFraction] = useState(1);
  const [customFraction, setCustomFraction] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [logging, setLogging] = useState(false);

  const effectiveFraction = useCustom
    ? parseFloat(customFraction) || 1
    : fraction;

  const ps = recipe.perServingNutrition;
  const f = effectiveFraction > 0 ? effectiveFraction : 1;
  const preview = {
    calories: Math.round(ps.calories * f),
    protein: Math.round(ps.protein * f * 10) / 10,
    carbs: Math.round(ps.carbs * f * 10) / 10,
    fat: Math.round(ps.fat * f * 10) / 10,
  };

  const handleLog = async () => {
    setLogging(true);
    const result = await logRecipeAsFood(recipe, mealSlot, f);
    setLogging(false);
    if (result.error) {
      Alert.alert('Error', 'Failed to log recipe. Please try again.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onLogged();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose} />
      <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
        <View style={styles.modalHandle} />

        <Text style={[styles.modalTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          Log: {recipe.name}
        </Text>
        <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
          {recipe.servings} serving{recipe.servings !== 1 ? 's' : ''} · {ps.calories} kcal/serving
        </Text>

        {/* Meal slot */}
        <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>MEAL</Text>
        <TouchableOpacity
          style={[styles.slotBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
          onPress={() => setShowSlotPicker((v) => !v)}
        >
          <Text style={[styles.slotBtnText, { color: colors.textPrimary }]}>{MEAL_SLOT_LABELS[mealSlot]}</Text>
          <Ionicons name={showSlotPicker ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textSecondary} />
        </TouchableOpacity>
        {showSlotPicker && (
          <View style={[styles.slotDropdown, { backgroundColor: colors.background, borderColor: colors.border }]}>
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

        {/* Fraction — only for batch cook recipes */}
        {recipe.isBatchCook && (
          <>
            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>PORTION</Text>
            <View style={styles.fractionsRow}>
              {SERVING_FRACTIONS.map((sf) => (
                <TouchableOpacity
                  key={sf.label}
                  style={[
                    styles.fractionBtn,
                    { borderColor: !useCustom && fraction === sf.value ? Colors.nutrition : colors.border },
                    !useCustom && fraction === sf.value && { backgroundColor: Colors.nutrition + '15' },
                  ]}
                  onPress={() => { setFraction(sf.value); setUseCustom(false); }}
                >
                  <Text style={[styles.fractionText, { color: !useCustom && fraction === sf.value ? Colors.nutrition : colors.textSecondary }]}>
                    {sf.label}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[
                  styles.fractionBtn,
                  { borderColor: useCustom ? Colors.nutrition : colors.border },
                  useCustom && { backgroundColor: Colors.nutrition + '15' },
                ]}
                onPress={() => setUseCustom(true)}
              >
                <Text style={[styles.fractionText, { color: useCustom ? Colors.nutrition : colors.textSecondary }]}>
                  Custom
                </Text>
              </TouchableOpacity>
            </View>
            {useCustom && (
              <TextInput
                style={[styles.customFractionInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                value={customFraction}
                onChangeText={setCustomFraction}
                placeholder="e.g. 0.75"
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
                returnKeyType="done"
                autoFocus
              />
            )}
          </>
        )}

        {/* Macro preview */}
        <View style={[styles.previewCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>You'll log:</Text>
          <Text style={[styles.previewValue, { color: Colors.nutrition }]}>
            {preview.calories} kcal · P {preview.protein}g · C {preview.carbs}g · F {preview.fat}g
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.logBtn, { backgroundColor: Colors.nutrition }]}
          onPress={handleLog}
          disabled={logging}
          activeOpacity={0.85}
        >
          {logging ? <ActivityIndicator color="white" /> : <Text style={styles.logBtnText}>Log Recipe</Text>}
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ─── Recipe Card ──────────────────────────────────────────────────────────────

function RecipeCard({
  recipe,
  onLog,
  onEdit,
  onDelete,
  colors,
}: {
  recipe: Recipe;
  onLog: () => void;
  onEdit: () => void;
  onDelete: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const ps = recipe.perServingNutrition;
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onEdit}
      activeOpacity={0.7}
    >
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <View style={styles.cardNameRow}>
            <Text style={[styles.cardName, { color: colors.textPrimary }]} numberOfLines={1}>
              {recipe.name}
            </Text>
            {recipe.isBatchCook && (
              <View style={[styles.batchBadge, { backgroundColor: Colors.nutrition + '20' }]}>
                <Text style={[styles.batchBadgeText, { color: Colors.nutrition }]}>Batch</Text>
              </View>
            )}
          </View>
          <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
            {recipe.servings} serving{recipe.servings !== 1 ? 's' : ''} · {recipe.ingredients.length} ingredient{recipe.ingredients.length !== 1 ? 's' : ''}
          </Text>
          <Text style={[styles.cardMacros, { color: colors.textSecondary }]}>
            {ps.calories} kcal · P {ps.protein}g · C {ps.carbs}g · F {ps.fat}g / serving
          </Text>
        </View>
        <TouchableOpacity onPress={onDelete} style={styles.deleteBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="trash-outline" size={18} color={Colors.error} />
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={[styles.logThisBtn, { backgroundColor: Colors.nutrition }]}
        onPress={onLog}
        activeOpacity={0.85}
      >
        <Ionicons name="add-circle-outline" size={16} color="white" />
        <Text style={styles.logThisText}>Log This</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function MyRecipesScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [logTarget, setLogTarget] = useState<Recipe | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const hasLoaded = useRef(false);

  const loadRecipes = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    setError(false);
    const r = await getRecipes();
    if (r.error) {
      setError(true);
    } else if (r.data) {
      setRecipes(r.data);
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!hasLoaded.current) {
        hasLoaded.current = true;
        loadRecipes(true);
      } else {
        // Silent background refresh on subsequent focuses
        loadRecipes(false);
      }
    }, [loadRecipes])
  );

  const filtered = searchQuery.trim()
    ? recipes.filter((r) => r.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : recipes;

  const handleDelete = (recipe: Recipe) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Delete Recipe',
      `Delete "${recipe.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteRecipe(recipe.id);
            if (result.error) {
              Alert.alert('Error', 'Failed to delete recipe. Please try again.');
              return;
            }
            setRecipes((prev) => prev.filter((r) => r.id !== recipe.id));
          },
        },
      ]
    );
  };

  const handleLogged = () => {
    setLogTarget(null);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 1800);
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={Colors.nutrition} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="cloud-offline-outline" size={40} color={colors.textSecondary} style={{ opacity: 0.4 }} />
        <Text style={[styles.emptyTitle, { color: colors.textPrimary, marginTop: 12 }]}>Couldn't load recipes</Text>
        <TouchableOpacity onPress={() => loadRecipes(true)} style={{ marginTop: 16 }}>
          <Text style={[styles.retryText, { color: Colors.nutrition }]}>Tap to retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search */}
      <View style={[styles.searchRow, { borderBottomColor: colors.border }]}>
        <Ionicons name="search" size={16} color={colors.textSecondary} style={{ marginLeft: 14 }} />
        <TextInput
          style={[styles.searchInput, { color: colors.textPrimary }]}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search recipes…"
          placeholderTextColor={colors.textSecondary}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <RecipeCard
            recipe={item}
            colors={colors}
            onLog={() => setLogTarget(item)}
            onEdit={() => router.push({ pathname: '/(tabs)/nutrition/create-recipe', params: { recipeId: item.id } })}
            onDelete={() => handleDelete(item)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="book-outline" size={48} color={colors.textSecondary} style={{ opacity: 0.3 }} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No recipes yet</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              Create your first recipe to log multi-ingredient meals quickly.
            </Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: Colors.nutrition }]}
        onPress={() => router.push('/(tabs)/nutrition/create-recipe')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>

      {logTarget && (
        <LogRecipeModal
          recipe={logTarget}
          visible
          onClose={() => setLogTarget(null)}
          onLogged={handleLogged}
          colors={colors}
        />
      )}

      <Toast visible={toastVisible} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1 },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingRight: 16,
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 13, paddingHorizontal: 10 },

  list: { padding: 16, gap: 12, paddingBottom: 100 },

  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  cardTop: { flexDirection: 'row', gap: 10 },
  cardNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  cardName: { fontSize: 16, fontWeight: '700' },
  batchBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  batchBadgeText: { fontSize: 11, fontWeight: '700' },
  cardSub: { fontSize: 12, marginTop: 3 },
  cardMacros: { fontSize: 12, marginTop: 3 },
  deleteBtn: { padding: 4 },

  logThisBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  logThisText: { color: 'white', fontSize: 14, fontWeight: '700' },

  empty: { alignItems: 'center', paddingTop: 80, gap: 12, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  retryText: { fontSize: 15, fontWeight: '600' },

  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    gap: 4,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#ccc', alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 2 },
  modalSub: { fontSize: 13, marginBottom: 8 },
  modalLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginTop: 16, marginBottom: 8 },

  slotBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13 },
  slotBtnText: { fontSize: 15, fontWeight: '600' },
  slotDropdown: { borderWidth: 1, borderRadius: 10, marginTop: 4, overflow: 'hidden' },
  slotItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  slotItemText: { fontSize: 15 },

  fractionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fractionBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  fractionText: { fontSize: 13, fontWeight: '600' },
  customFractionInput: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 16,
    fontWeight: '700',
  },

  previewCard: { marginTop: 16, borderWidth: 1, borderRadius: 10, padding: 12, gap: 4 },
  previewLabel: { fontSize: 12, fontWeight: '600' },
  previewValue: { fontSize: 14, fontWeight: '700' },

  logBtn: { marginTop: 16, paddingVertical: 15, borderRadius: 12, alignItems: 'center' },
  logBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },

  toast: { position: 'absolute', bottom: 48, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1a1a1a', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 6 },
  toastText: { color: 'white', fontWeight: '600', fontSize: 14 },
});
