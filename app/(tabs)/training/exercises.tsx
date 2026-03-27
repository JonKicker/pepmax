import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import { useExerciseLibrary } from '../../../src/hooks/useExerciseLibrary';
import { useExercisePicker } from '../../../src/contexts/ExercisePickerContext';
import type { Exercise, MuscleGroup, ExerciseCategory } from '../../../src/types/exercise';
import ExerciseThumbnail from '../../../src/components/training/ExerciseThumbnail';
import { GlassBackground } from '../../../src/components/GlassBackground';

const MUSCLE_GROUPS: MuscleGroup[] = [
  'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Forearms',
  'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Core', 'Full Body',
];

const CATEGORIES: ExerciseCategory[] = [
  'Compound', 'Isolation', 'Bodyweight', 'Machine', 'Cable', 'Cardio',
];

const CATEGORY_COLORS: Record<ExerciseCategory, string> = {
  Compound: Colors.gym,
  Isolation: Colors.accent,
  Bodyweight: Colors.nutrition,
  Machine: Colors.warning,
  Cable: Colors.teal,
  Cardio: Colors.cardio,
};

function ExerciseCard({
  exercise,
  colors,
  onPress,
  onLongPress,
  isPicked,
}: {
  exercise: Exercise;
  colors: any;
  onPress: () => void;
  onLongPress?: () => void;
  isPicked?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        isPicked && { opacity: 0.6 },
      ]}
    >
      <ExerciseThumbnail exerciseId={exercise.id} size={52} />
      <View style={[styles.cardContent, { marginLeft: 12 }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardName, { color: colors.textPrimary }]} numberOfLines={1}>
            {exercise.name}
          </Text>
          {isPicked && (
            <Ionicons name="checkmark-circle" size={20} color={Colors.gym} />
          )}
        </View>
        <View style={styles.cardBadgeRow}>
          <View style={[styles.categoryBadge, { backgroundColor: CATEGORY_COLORS[exercise.category] + '20' }]}>
            <Text style={[styles.categoryText, { color: CATEGORY_COLORS[exercise.category] }]}>
              {exercise.category}
            </Text>
          </View>
          {exercise.isCustom && (
            <View style={[styles.categoryBadge, { backgroundColor: Colors.gym + '20', marginLeft: 6 }]}>
              <Text style={[styles.categoryText, { color: Colors.gym }]}>Custom</Text>
            </View>
          )}
        </View>
        <Text style={[styles.cardMuscles, { color: colors.textSecondary }]} numberOfLines={1}>
          {exercise.primaryMuscles.join(', ')} · {exercise.equipment}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

export default function ExercisesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const isPickerMode = params.mode === 'picker';
  const picker = useExercisePicker();

  const {
    filteredExercises,
    loading,
    searchQuery,
    setSearchQuery,
    selectedMuscles,
    selectedCategories,
    toggleMuscle,
    toggleCategory,
    clearFilters,
    hasActiveFilters,
    removeCustomExercise,
  } = useExerciseLibrary();

  const handlePress = useCallback(
    (exercise: Exercise) => {
      if (isPickerMode && picker.onExercisePicked) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        picker.onExercisePicked(exercise);
        router.back();
      } else {
        router.push({
          pathname: '/(tabs)/training/exercise-detail',
          params: { exerciseId: exercise.id, isCustom: exercise.isCustom ? '1' : '0' },
        });
      }
    },
    [isPickerMode, picker, router],
  );

  const handleDelete = useCallback(
    (exercise: Exercise) => {
      Alert.alert('Delete custom exercise?', `Remove "${exercise.name}" permanently?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await removeCustomExercise(exercise.id);
          },
        },
      ]);
    },
    [removeCustomExercise],
  );

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={Colors.gym} size="large" />
      </View>
    );
  }

  return (
    <GlassBackground>
    <View style={styles.container}>
      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.textPrimary }]}
          placeholder="Search exercises..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter chips */}
      <View style={styles.chipRow}>
        {MUSCLE_GROUPS.map((m) => {
          const active = selectedMuscles.includes(m);
          return (
            <TouchableOpacity
              key={m}
              onPress={() => toggleMuscle(m)}
              style={[
                styles.chip,
                { borderColor: active ? Colors.gym : colors.border },
                active && { backgroundColor: Colors.gym + '20' },
              ]}
            >
              <Text style={[styles.chipText, { color: active ? Colors.gym : colors.textSecondary }]}>
                {m}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.chipRow}>
        {CATEGORIES.map((c) => {
          const active = selectedCategories.includes(c);
          return (
            <TouchableOpacity
              key={c}
              onPress={() => toggleCategory(c)}
              style={[
                styles.chip,
                { borderColor: active ? CATEGORY_COLORS[c] : colors.border },
                active && { backgroundColor: CATEGORY_COLORS[c] + '20' },
              ]}
            >
              <Text style={[styles.chipText, { color: active ? CATEGORY_COLORS[c] : colors.textSecondary }]}>
                {c}
              </Text>
            </TouchableOpacity>
          );
        })}
        {hasActiveFilters && (
          <TouchableOpacity onPress={clearFilters} style={[styles.chip, { borderColor: Colors.error }]}>
            <Text style={[styles.chipText, { color: Colors.error }]}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Results count */}
      <Text style={[styles.resultCount, { color: colors.textSecondary }]}>
        {filteredExercises.length} exercise{filteredExercises.length !== 1 ? 's' : ''}
      </Text>

      {/* Exercise list */}
      <FlatList
        data={filteredExercises}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <ExerciseCard
            exercise={item}
            colors={colors}
            onPress={() => handlePress(item)}
            onLongPress={item.isCustom && !isPickerMode ? () => handleDelete(item) : undefined}
            isPicked={isPickerMode && picker.pickedIds?.has(item.id)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No exercises found
            </Text>
          </View>
        }
      />

      {/* FAB - Add Custom Exercise (not in picker mode) */}
      {!isPickerMode && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: Colors.gym }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push('/(tabs)/training/exercise-form');
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={30} color="white" />
        </TouchableOpacity>
      )}
    </View>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15 },
  chipRow: { paddingHorizontal: 16, paddingVertical: 6, gap: 8, flexDirection: 'row', flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontWeight: '600' },
  resultCount: { paddingHorizontal: 16, paddingVertical: 4, fontSize: 13 },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  cardContent: { flex: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardName: { fontSize: 16, fontWeight: '700', flex: 1 },
  cardBadgeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  categoryBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  categoryText: { fontSize: 11, fontWeight: '700' },
  cardMuscles: { fontSize: 13, marginTop: 4 },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, marginTop: 12 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
});
