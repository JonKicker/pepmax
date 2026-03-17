import { Timestamp } from 'firebase/firestore';

export type Goal = 'peptides' | 'nutrition' | 'training' | 'cardio';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type Units = 'imperial' | 'metric';
export type Sex = 'male' | 'female';

export type MacroTargets = {
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export type UserProfile = {
  // Quiz answers
  goals: Goal[];
  experienceLevel: ExperienceLevel;
  units: Units;

  // Body stats — always stored in metric internally
  heightCm: number;
  weightKg: number;
  age: number;
  sex: Sex;

  // Calculated nutrition targets
  tdee: number;
  calorieTarget: number;
  macros: MacroTargets;

  // Meta
  quizCompletedAt: Timestamp;
  updatedAt: Timestamp;
};
