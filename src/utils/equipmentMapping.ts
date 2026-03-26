import type { Exercise, Equipment } from '../types/exercise';
import type { ProfileEquipment } from '../types/equipmentProfile';

// Maps each Exercise.equipment value to the ProfileEquipment items that satisfy it.
// Empty array = always available (Bodyweight, None).
// Otherwise: exercise is available if the profile contains ANY ONE of the listed items.
const EQUIPMENT_REQUIREMENTS: Record<Equipment, ProfileEquipment[]> = {
  Bodyweight: [],
  None: [],
  Barbell: ['Barbell'],
  Dumbbell: ['Dumbbells'],
  'Cable Machine': ['Cable Machine'],
  'Smith Machine': ['Smith Machine'],
  Machine: ['Lat Pulldown', 'Leg Press', 'Leg Curl/Extension', 'Chest Fly Machine', 'Rowing Machine'],
  Kettlebell: ['Kettlebells'],
  'Resistance Band': ['Resistance Bands'],
  'Pull-up Bar': ['Pull-up Bar'],
  Bench: ['Flat Bench', 'Adjustable Bench'],
  'EZ Bar': ['Barbell'],
};

export function isExerciseAvailable(
  exercise: Exercise,
  profileEquipment: ProfileEquipment[]
): boolean {
  const required = EQUIPMENT_REQUIREMENTS[exercise.equipment];
  if (required.length === 0) return true;
  return required.some((item) => profileEquipment.includes(item));
}

export function findAlternatives(
  exercise: Exercise,
  allExercises: Exercise[],
  profileEquipment: ProfileEquipment[],
  limit = 3
): Exercise[] {
  const targetMuscle = exercise.primaryMuscles[0];

  const candidates = allExercises.filter(
    (e) =>
      e.id !== exercise.id &&
      e.primaryMuscles[0] === targetMuscle &&
      isExerciseAvailable(e, profileEquipment)
  );

  const scored = candidates.map((e) => {
    let score = 0;
    if (e.category === exercise.category) score += 2;
    for (const muscle of e.secondaryMuscles) {
      if (exercise.secondaryMuscles.includes(muscle)) score += 1;
    }
    return { exercise: e, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.exercise);
}
