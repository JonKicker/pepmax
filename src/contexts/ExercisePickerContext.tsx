import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Exercise } from '../types/exercise';

interface ExercisePickerState {
  onExercisePicked: ((exercise: Exercise) => void) | null;
  pickedIds: Set<string> | null;
  setPickerCallback: (cb: (exercise: Exercise) => void, ids?: Set<string>) => void;
  clearPicker: () => void;
}

const ExercisePickerContext = createContext<ExercisePickerState>({
  onExercisePicked: null,
  pickedIds: null,
  setPickerCallback: () => {},
  clearPicker: () => {},
});

export function ExercisePickerProvider({ children }: { children: React.ReactNode }) {
  const [onExercisePicked, setOnExercisePicked] = useState<((e: Exercise) => void) | null>(null);
  const [pickedIds, setPickedIds] = useState<Set<string> | null>(null);

  const setPickerCallback = useCallback(
    (cb: (exercise: Exercise) => void, ids?: Set<string>) => {
      // Wrap in arrow to avoid React treating cb as a state updater
      setOnExercisePicked(() => cb);
      setPickedIds(ids ?? null);
    },
    [],
  );

  const clearPicker = useCallback(() => {
    setOnExercisePicked(null);
    setPickedIds(null);
  }, []);

  return (
    <ExercisePickerContext.Provider value={{ onExercisePicked, pickedIds, setPickerCallback, clearPicker }}>
      {children}
    </ExercisePickerContext.Provider>
  );
}

export function useExercisePicker() {
  return useContext(ExercisePickerContext);
}
