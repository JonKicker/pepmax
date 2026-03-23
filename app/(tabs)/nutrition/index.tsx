import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Animated,
  PanResponder,
  RefreshControl,
  Modal,
} from 'react-native';
import { useRouter, useFocusEffect, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors, Theme } from '../../../src/constants/theme';
import { useAuth } from '../../../src/contexts/AuthContext';
import { getTodaysLog, deleteFood, getLogForDate, copyMealsFromDate } from '../../../src/services/nutritionService';
import { toLocalDateKey } from '../../../src/utils/nutrition';
import { DEFAULT_MEAL_SLOTS } from '../../../src/types/nutrition';
import type { FoodLogEntry, MealSlotConfig } from '../../../src/types/nutrition';
import ProBadge from '../../../src/components/premium/ProBadge';

// ─── Calorie Ring ─────────────────────────────────────────────────────────────

const RING_SIZE = 200;
const RING_THICKNESS = 18;
const HALF = RING_SIZE / 2;

function CalorieRing({
  consumed,
  target,
  colors,
}: {
  consumed: number;
  target: number;
  colors: Theme['colors'];
}) {
  const progress = target > 0 ? Math.min(consumed / target, 1.2) : 0;

  // Ring color based on proximity to target
  const ringColor =
    consumed > target
      ? Colors.error
      : target - consumed <= 100
      ? Colors.warning
      : Colors.nutrition;

  // Reanimated shared values for each half-circle
  const leftRotation = useSharedValue(180);
  const rightRotation = useSharedValue(180);
  const leftVisible = useSharedValue(0);

  React.useEffect(() => {
    const p = Math.min(progress, 1);
    // Right half rotates for first 50% of progress (0–180°)
    rightRotation.value = withTiming(180 + Math.min(p, 0.5) * 360, {
      duration: 900,
      easing: Easing.out(Easing.quad),
    });
    // Left half rotates for second 50% (180–360°)
    leftRotation.value = withTiming(180 + Math.max(0, p - 0.5) * 360, {
      duration: 900,
      easing: Easing.out(Easing.quad),
    });
    leftVisible.value = withTiming(p > 0.5 ? 1 : 0, { duration: 0 });
  }, [progress]);

  const rightStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rightRotation.value}deg` }],
  }));
  const leftStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${leftRotation.value}deg` }],
    opacity: leftVisible.value,
  }));

  return (
    <View style={styles.ringContainer}>
      {/* Track (background ring) */}
      <View
        style={[
          styles.ringTrack,
          { borderColor: colors.border, width: RING_SIZE, height: RING_SIZE, borderRadius: HALF },
        ]}
      />

      {/* Right half-circle clipper */}
      <View style={[styles.halfClip, styles.rightClip]}>
        <Reanimated.View
          style={[styles.halfCircle, styles.rightHalf, rightStyle, { borderColor: ringColor }]}
        />
      </View>

      {/* Left half-circle clipper */}
      <View style={[styles.halfClip, styles.leftClip]}>
        <Reanimated.View
          style={[styles.halfCircle, styles.leftHalf, leftStyle, { borderColor: ringColor }]}
        />
      </View>

      {/* Center text */}
      <View style={styles.ringCenter}>
        <Text style={[styles.ringConsumed, { color: colors.textPrimary }]}>
          {Math.round(consumed).toLocaleString()}
        </Text>
        <Text style={[styles.ringUnit, { color: colors.textSecondary }]}>kcal</Text>
        <View style={[styles.ringDivider, { backgroundColor: colors.border }]} />
        <Text style={[styles.ringTarget, { color: colors.textSecondary }]}>
          {Math.round(target).toLocaleString()} target
        </Text>
      </View>

      {/* Over-target indicator */}
      {consumed > target && (
        <View style={[styles.overBadge, { backgroundColor: Colors.error }]}>
          <Text style={styles.overBadgeText}>+{Math.round(consumed - target)} over</Text>
        </View>
      )}
    </View>
  );
}

// ─── Macro Bar ────────────────────────────────────────────────────────────────

function MacroBar({
  label,
  consumed,
  target,
  color,
  colors,
}: {
  label: string;
  consumed: number;
  target: number;
  color: string;
  colors: Theme['colors'];
}) {
  const progress = useSharedValue(0);
  const pct = target > 0 ? Math.min(consumed / target, 1) : 0;

  React.useEffect(() => {
    progress.value = withTiming(pct, { duration: 800, easing: Easing.out(Easing.quad) });
  }, [pct]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View style={styles.macroRow}>
      <View style={styles.macroLabelRow}>
        <Text style={[styles.macroLabel, { color: colors.textPrimary }]}>{label}</Text>
        <Text style={[styles.macroValue, { color: colors.textSecondary }]}>
          {Math.round(consumed)}g / {Math.round(target)}g
        </Text>
        <Text style={[styles.macroPct, { color }]}>{Math.round(pct * 100)}%</Text>
      </View>
      <View style={[styles.macroTrack, { backgroundColor: color + '22' }]}>
        <Reanimated.View style={[styles.macroFill, barStyle, { backgroundColor: color }]} />
      </View>
    </View>
  );
}

// ─── Swipeable Food Item ──────────────────────────────────────────────────────

const SWIPE_DELETE_WIDTH = 72;

function SwipeableFoodItem({
  entry,
  onDelete,
  colors,
}: {
  entry: FoodLogEntry;
  onDelete: (id: string, name: string) => void;
  colors: Theme['colors'];
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const isOpen = useRef(false);

  const close = useCallback(() => {
    isOpen.current = false;
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
  }, [translateX]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.5,
      onPanResponderMove: (_, { dx }) => {
        if (!isOpen.current) {
          if (dx < 0) translateX.setValue(Math.max(dx, -SWIPE_DELETE_WIDTH));
        } else {
          translateX.setValue(Math.min(0, dx - SWIPE_DELETE_WIDTH));
        }
      },
      onPanResponderRelease: (_, { dx, vx }) => {
        if (!isOpen.current && (dx < -SWIPE_DELETE_WIDTH / 2 || vx < -0.3)) {
          isOpen.current = true;
          Animated.spring(translateX, { toValue: -SWIPE_DELETE_WIDTH, useNativeDriver: true }).start();
        } else {
          isOpen.current = false;
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  return (
    <View style={styles.swipeWrapper}>
      <View style={[styles.swipeDeleteBg, { width: SWIPE_DELETE_WIDTH }]}>
        <TouchableOpacity
          style={styles.swipeDeleteBtn}
          onPress={() => { close(); onDelete(entry.id, entry.foodName); }}
        >
          <Ionicons name="trash-outline" size={18} color="white" />
        </TouchableOpacity>
      </View>
      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        <View style={[styles.foodItem, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={styles.foodItemBody}>
            <Text style={[styles.foodItemName, { color: colors.textPrimary }]} numberOfLines={1}>
              {entry.foodName}
            </Text>
            {!!entry.brand && (
              <Text style={[styles.foodItemBrand, { color: colors.textSecondary }]} numberOfLines={1}>
                {entry.brand}
              </Text>
            )}
            <Text style={[styles.foodItemServing, { color: colors.textSecondary }]}>
              {entry.servingSize} {entry.servingUnit}
            </Text>
          </View>
          <Text style={[styles.foodItemCal, { color: colors.textPrimary }]}>
            {Math.round(entry.calories)} kcal
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

// ─── Meal Section ─────────────────────────────────────────────────────────────

function MealSection({
  slotId,
  label,
  entries,
  onDelete,
  onAddFood,
  colors,
}: {
  slotId: string;
  label: string;
  entries: FoodLogEntry[];
  onDelete: (id: string, name: string) => void;
  onAddFood: (slotId: string) => void;
  colors: Theme['colors'];
}) {
  const [expanded, setExpanded] = useState(true);
  const totalCal = entries.reduce((s, e) => s + e.calories, 0);

  return (
    <View style={[styles.mealSection, { borderColor: colors.border }]}>
      {/* Header */}
      <TouchableOpacity
        style={[styles.mealHeader, { backgroundColor: colors.surface }]}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.7}
      >
        <Ionicons
          name={expanded ? 'chevron-down' : 'chevron-forward'}
          size={16}
          color={colors.textSecondary}
        />
        <Text style={[styles.mealTitle, { color: colors.textPrimary }]}>
          {label}
        </Text>
        <Text style={[styles.mealCal, { color: entries.length ? Colors.nutrition : colors.textSecondary }]}>
          {entries.length ? `${Math.round(totalCal)} kcal` : '—'}
        </Text>
      </TouchableOpacity>

      {/* Body */}
      {expanded && (
        <View style={[styles.mealBody, { backgroundColor: colors.background }]}>
          {entries.length === 0 ? (
            <Text style={[styles.mealEmpty, { color: colors.textSecondary }]}>
              Nothing logged yet
            </Text>
          ) : (
            entries.map((e) => (
              <SwipeableFoodItem key={e.id} entry={e} onDelete={onDelete} colors={colors} />
            ))
          )}
          {/* Add button (not shown in "Other" orphan section) */}
          {slotId !== '__other__' && (
            <TouchableOpacity
              style={[styles.addFoodBtn, { borderColor: Colors.nutrition }]}
              onPress={() => onAddFood(slotId)}
            >
              <Ionicons name="add" size={16} color={Colors.nutrition} />
              <Text style={[styles.addFoodBtnText, { color: Colors.nutrition }]}>Add Food</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Copy Meals Modal ─────────────────────────────────────────────────────────

function CopyMealsModal({
  visible,
  onDismiss,
  onCopied,
  colors,
  activeSlots,
}: {
  visible: boolean;
  onDismiss: () => void;
  onCopied: () => void;
  colors: Theme['colors'];
  activeSlots: MealSlotConfig[];
}) {
  const [loading, setLoading] = useState(false);
  const [copying, setCopying] = useState(false);
  const [entries, setEntries] = useState<FoodLogEntry[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());

  // Stable for the lifetime of the modal — "yesterday" relative to when the modal mounts.
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = toLocalDateKey(yesterday);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    setFetchError(null);
    getLogForDate(yesterdayKey).then((result) => {
      setLoading(false);
      if (result.error) {
        setFetchError('Failed to load yesterday\'s meals.');
        return;
      }
      const data = result.data ?? [];
      setEntries(data);
      // Pre-select all slots that have entries
      const slotIds = new Set(data.map((e) => e.mealSlot));
      setSelectedSlots(slotIds);
    });
  }, [visible, yesterdayKey]);

  const toggleSlot = (slotId: string) => {
    setSelectedSlots((prev) => {
      const next = new Set(prev);
      if (next.has(slotId)) next.delete(slotId);
      else next.add(slotId);
      return next;
    });
  };

  const handleCopy = async () => {
    if (selectedSlots.size === 0) return;
    setCopying(true);
    const todayKey = toLocalDateKey();
    const result = await copyMealsFromDate(yesterdayKey, todayKey, Array.from(selectedSlots));
    setCopying(false);
    if (result.error) {
      Alert.alert('Error', 'Failed to copy meals. Please try again.');
      return;
    }
    const total = entries.filter((e) => selectedSlots.has(e.mealSlot)).length;
    const copied = result.data ?? 0;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (copied < total) {
      Alert.alert('Partially copied', `Copied ${copied} of ${total} items.`);
    }
    onCopied();
  };

  // Group entries by slot for display
  const bySlot: Record<string, FoodLogEntry[]> = {};
  for (const e of entries) {
    if (!bySlot[e.mealSlot]) bySlot[e.mealSlot] = [];
    bySlot[e.mealSlot].push(e);
  }
  // Slots that have entries, ordered by activeSlots order then unknown slots at end
  const slotsWithEntries = [
    ...activeSlots.filter((s) => bySlot[s.id]),
    ...Object.keys(bySlot)
      .filter((id) => !activeSlots.some((s) => s.id === id))
      .map((id) => ({ id, label: id })),
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onDismiss}>
      <View style={copyStyles.backdrop}>
        <View style={[copyStyles.sheet, { backgroundColor: colors.surface }]}>
          {/* Handle */}
          <View style={[copyStyles.handle, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={[copyStyles.header, { borderBottomColor: colors.border }]}>
            <Text style={[copyStyles.headerTitle, { color: colors.textPrimary }]}>Copy Yesterday's Meals</Text>
            <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          {loading ? (
            <View style={copyStyles.feedback}>
              <ActivityIndicator color={Colors.nutrition} />
            </View>
          ) : fetchError ? (
            <View style={copyStyles.feedback}>
              <Text style={[copyStyles.feedbackText, { color: colors.textSecondary }]}>{fetchError}</Text>
            </View>
          ) : slotsWithEntries.length === 0 ? (
            <View style={copyStyles.feedback}>
              <Ionicons name="restaurant-outline" size={36} color={colors.textSecondary} style={{ opacity: 0.3 }} />
              <Text style={[copyStyles.feedbackText, { color: colors.textSecondary }]}>
                No meals logged yesterday.
              </Text>
            </View>
          ) : (
            <ScrollView style={copyStyles.list} keyboardShouldPersistTaps="handled">
              {slotsWithEntries.map((slot) => {
                const slotEntries = bySlot[slot.id] ?? [];
                const totalCal = slotEntries.reduce((sum, e) => sum + e.calories, 0);
                const checked = selectedSlots.has(slot.id);
                return (
                  <TouchableOpacity
                    key={slot.id}
                    style={[copyStyles.slotRow, { borderBottomColor: colors.border }]}
                    onPress={() => toggleSlot(slot.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={checked ? 'checkbox' : 'square-outline'}
                      size={22}
                      color={checked ? Colors.nutrition : colors.textSecondary}
                    />
                    <View style={copyStyles.slotInfo}>
                      <Text style={[copyStyles.slotLabel, { color: colors.textPrimary }]}>{slot.label}</Text>
                      <Text style={[copyStyles.slotSub, { color: colors.textSecondary }]}>
                        {slotEntries.length} item{slotEntries.length !== 1 ? 's' : ''} · {Math.round(totalCal)} kcal
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* Footer */}
          {slotsWithEntries.length > 0 && !fetchError && (
            <View style={[copyStyles.footer, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[
                  copyStyles.copyBtn,
                  { backgroundColor: selectedSlots.size === 0 ? colors.border : Colors.nutrition },
                ]}
                onPress={handleCopy}
                disabled={copying || selectedSlots.size === 0}
              >
                {copying ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={copyStyles.copyBtnText}>
                    Copy Selected{selectedSlots.size > 0 ? ` (${selectedSlots.size})` : ''}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function NutritionScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { userProfile } = useAuth();

  const [entries, setEntries] = useState<FoodLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showCopyModal, setShowCopyModal] = useState(false);

  const targets = {
    calories: userProfile?.calorieTarget ?? 2000,
    protein: userProfile?.macros?.proteinG ?? 150,
    carbs: userProfile?.macros?.carbsG ?? 200,
    fat: userProfile?.macros?.fatG ?? 65,
  };

  const load = async (refresh = false) => {
    if (refresh) setRefreshing(true);
    setLoadError(null);
    const result = await getTodaysLog();
    if (result.error) {
      console.error('[NutritionScreen] load error:', result.error);
      setLoadError('Failed to load today\'s log. Pull down to retry.');
    } else {
      setEntries(result.data ?? []);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const totals = entries.reduce(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      protein: acc.protein + e.protein,
      carbs: acc.carbs + e.carbs,
      fat: acc.fat + e.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  // Active meal slots from profile, falling back to the 4 defaults
  const activeSlots: MealSlotConfig[] = userProfile?.mealSlots ?? DEFAULT_MEAL_SLOTS;
  const activeSlotIds = new Set(activeSlots.map((s) => s.id));

  // Group entries: known slots → bySlot map; unrecognized slots → orphaned array
  // Orphaned entries arise when a user logged food to a slot that was later renamed
  // or deleted. They must still appear in the UI — never silently discarded.
  const bySlot: Record<string, FoodLogEntry[]> = {};
  const orphaned: FoodLogEntry[] = [];
  for (const entry of entries) {
    if (activeSlotIds.has(entry.mealSlot)) {
      if (!bySlot[entry.mealSlot]) bySlot[entry.mealSlot] = [];
      bySlot[entry.mealSlot].push(entry);
    } else {
      orphaned.push(entry);
    }
  }

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Remove food?', `Remove ${name} from today's log.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          const result = await deleteFood(id);
          if (result.error) {
            Alert.alert('Error', 'Could not remove food. Please try again.');
            return;
          }
          setEntries((prev) => prev.filter((e) => e.id !== id));
        },
      },
    ]);
  };

  const handleAddFood = (slotId: string) => {
    router.push({ pathname: '/(tabs)/nutrition/add-food', params: { mealSlot: slotId } });
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={Colors.nutrition} size="large" />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="cloud-offline-outline" size={48} color={colors.textSecondary} />
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>{loadError}</Text>
        <TouchableOpacity style={[styles.retryBtn, { backgroundColor: Colors.nutrition }]} onPress={() => load()}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <View style={styles.headerIcons}>
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/nutrition/history')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="calendar-outline" size={22} color={Colors.nutrition} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowCopyModal(true)}
                style={{ marginLeft: 14 }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="copy-outline" size={22} color={Colors.nutrition} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/nutrition/my-recipes')}
                style={{ marginLeft: 14 }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="book-outline" size={22} color={Colors.nutrition} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/nutrition/settings')}
                style={{ marginLeft: 14 }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="settings-outline" size={22} color={Colors.nutrition} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={Colors.nutrition} />
        }
      >
        {/* Date label */}
        <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>

        {/* Calorie ring */}
        <CalorieRing consumed={totals.calories} target={targets.calories} colors={colors} />

        {/* Macro bars */}
        <View style={[styles.macrosCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <MacroBar label="Protein" consumed={totals.protein} target={targets.protein} color="#4A90D9" colors={colors} />
          <MacroBar label="Carbs" consumed={totals.carbs} target={targets.carbs} color={Colors.warning} colors={colors} />
          <MacroBar label="Fat" consumed={totals.fat} target={targets.fat} color={Colors.error} colors={colors} />
        </View>

        {/* Micronutrients shortcut */}
        <TouchableOpacity
          style={[styles.microsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => router.push('/(tabs)/nutrition/micros')}
          activeOpacity={0.7}
        >
          <Ionicons name="flask-outline" size={20} color={Colors.nutrition} />
          <Text style={[styles.microsLabel, { color: colors.textPrimary }]}>Micronutrients</Text>
          <ProBadge style={{ marginLeft: 6 }} />
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>

        {/* Meal sections — dynamic slots from profile, with orphaned entry fallback */}
        <View style={styles.mealsContainer}>
          {activeSlots.map((slot) => (
            <MealSection
              key={slot.id}
              slotId={slot.id}
              label={slot.label}
              entries={bySlot[slot.id] ?? []}
              onDelete={handleDelete}
              onAddFood={handleAddFood}
              colors={colors}
            />
          ))}
          {orphaned.length > 0 && (
            <MealSection
              key="__other__"
              slotId="__other__"
              label="Other"
              entries={orphaned}
              onDelete={handleDelete}
              onAddFood={handleAddFood}
              colors={colors}
            />
          )}
        </View>
      </ScrollView>

      <CopyMealsModal
        visible={showCopyModal}
        onDismiss={() => setShowCopyModal(false)}
        onCopied={() => { setShowCopyModal(false); load(); }}
        colors={colors}
        activeSlots={activeSlots}
      />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  errorText: { fontSize: 15, textAlign: 'center', marginTop: 16, marginBottom: 24, lineHeight: 22 },
  retryBtn: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10 },
  retryBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },

  headerIcons: { flexDirection: 'row', alignItems: 'center', marginRight: 4 },

  scroll: { paddingBottom: 40 },
  dateLabel: { fontSize: 13, textAlign: 'center', marginTop: 14, marginBottom: 4 },

  // Calorie ring
  ringContainer: { width: RING_SIZE, height: RING_SIZE, alignSelf: 'center', marginVertical: 20 },
  ringTrack: { position: 'absolute', borderWidth: RING_THICKNESS, opacity: 0.15 },
  halfClip: { position: 'absolute', width: HALF, height: RING_SIZE, overflow: 'hidden' },
  rightClip: { left: HALF },
  leftClip: { left: 0 },
  halfCircle: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: HALF,
    borderWidth: RING_THICKNESS,
    borderColor: 'transparent',
  },
  rightHalf: { left: -HALF, borderLeftColor: 'transparent', borderBottomColor: 'transparent' },
  leftHalf: { left: 0, borderRightColor: 'transparent', borderTopColor: 'transparent' },
  ringCenter: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  ringConsumed: { fontSize: 38, fontWeight: '800', lineHeight: 42 },
  ringUnit: { fontSize: 13, marginTop: 2 },
  ringDivider: { width: 40, height: 1, marginVertical: 6 },
  ringTarget: { fontSize: 13 },
  overBadge: {
    position: 'absolute',
    bottom: -8,
    alignSelf: 'center',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  overBadgeText: { color: 'white', fontSize: 11, fontWeight: '700' },

  // Macro bars
  macrosCard: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 14,
    marginBottom: 12,
  },
  microsCard: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  microsLabel: { fontSize: 14, fontWeight: '600' },
  macroRow: { gap: 6 },
  macroLabelRow: { flexDirection: 'row', alignItems: 'center' },
  macroLabel: { fontSize: 13, fontWeight: '600', flex: 1 },
  macroValue: { fontSize: 12 },
  macroPct: { fontSize: 12, fontWeight: '700', marginLeft: 8, width: 36, textAlign: 'right' },
  macroTrack: { height: 7, borderRadius: 4, overflow: 'hidden' },
  macroFill: { height: '100%', borderRadius: 4 },

  // Meal sections
  mealsContainer: { gap: 10, paddingHorizontal: 16 },
  mealSection: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 8,
  },
  mealTitle: { fontSize: 15, fontWeight: '700', flex: 1 },
  mealCal: { fontSize: 13, fontWeight: '600' },
  mealBody: { paddingBottom: 8 },
  mealEmpty: { fontSize: 13, paddingHorizontal: 14, paddingVertical: 10, fontStyle: 'italic' },

  // Swipeable food item
  swipeWrapper: { overflow: 'hidden' },
  swipeDeleteBg: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeDeleteBtn: { padding: 16 },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  foodItemBody: { flex: 1 },
  foodItemName: { fontSize: 14, fontWeight: '600' },
  foodItemBrand: { fontSize: 12, marginTop: 1 },
  foodItemServing: { fontSize: 12, marginTop: 1 },
  foodItemCal: { fontSize: 14, fontWeight: '700', marginLeft: 8 },

  // Add food button
  addFoodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 14,
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  addFoodBtnText: { fontSize: 13, fontWeight: '600' },
});

const copyStyles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
    paddingBottom: 34,
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  feedback: { alignItems: 'center', paddingVertical: 40, gap: 12, paddingHorizontal: 32 },
  feedbackText: { fontSize: 14, textAlign: 'center' },
  list: { maxHeight: 360 },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  slotInfo: { flex: 1 },
  slotLabel: { fontSize: 15, fontWeight: '600' },
  slotSub: { fontSize: 12, marginTop: 2 },
  footer: { paddingHorizontal: 18, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth },
  copyBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  copyBtnText: { color: 'white', fontSize: 15, fontWeight: '700' },
});
