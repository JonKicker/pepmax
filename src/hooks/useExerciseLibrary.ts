import { useState, useEffect, useMemo, useCallback } from 'react';
import { Exercise, MuscleGroup, ExerciseCategory } from '../types/exercise';
import {
  getAllExercises,
  applyFilters,
  getCustomExercises,
  deleteCustomExercise,
} from '../services/exerciseService';

export function useExerciseLibrary() {
  const [customExercises, setCustomExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscles, setSelectedMuscles] = useState<MuscleGroup[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<ExerciseCategory[]>([]);

  const allExercises = useMemo(
    () => getAllExercises(customExercises),
    [customExercises],
  );

  const filteredExercises = useMemo(
    () => applyFilters(allExercises, searchQuery, selectedMuscles, selectedCategories),
    [allExercises, searchQuery, selectedMuscles, selectedCategories],
  );

  const loadCustomExercises = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await getCustomExercises();
    if (result.error) {
      setError(result.error.message);
    } else {
      setCustomExercises(result.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadCustomExercises();
  }, [loadCustomExercises]);

  const toggleMuscle = useCallback((muscle: MuscleGroup) => {
    setSelectedMuscles((prev) =>
      prev.includes(muscle) ? prev.filter((m) => m !== muscle) : [...prev, muscle],
    );
  }, []);

  const toggleCategory = useCallback((category: ExerciseCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
    );
  }, []);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedMuscles([]);
    setSelectedCategories([]);
  }, []);

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    selectedMuscles.length > 0 ||
    selectedCategories.length > 0;

  const removeCustomExercise = useCallback(async (id: string) => {
    const result = await deleteCustomExercise(id);
    if (!result.error) {
      setCustomExercises((prev) => prev.filter((e) => e.id !== id));
    }
    return result;
  }, []);

  return {
    allExercises,
    filteredExercises,
    customExercises,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    selectedMuscles,
    selectedCategories,
    toggleMuscle,
    toggleCategory,
    clearFilters,
    hasActiveFilters,
    reload: loadCustomExercises,
    removeCustomExercise,
  };
}
