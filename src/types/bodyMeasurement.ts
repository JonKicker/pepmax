import { Timestamp } from 'firebase/firestore';

export type CircumferenceMeasurements = {
  chest?: number;      // cm
  waist?: number;      // cm
  hips?: number;       // cm
  leftBicep?: number;  // cm
  rightBicep?: number; // cm
  leftThigh?: number;  // cm
  rightThigh?: number; // cm
  neck?: number;       // cm
  shoulders?: number;  // cm
};

export type BodyMeasurement = {
  id: string;
  date: string; // YYYY-MM-DD
  weight?: number; // kg
  weightUnit: 'kg' | 'lbs';
  bodyFatPercent?: number; // 0-100
  measurements: CircumferenceMeasurements;
  measurementUnit: 'cm' | 'in';
  photoUrl?: string;
  photoThumbUrl?: string;
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type BodyMeasurementInput = {
  date: string;
  weight?: number; // kg
  weightUnit: 'kg' | 'lbs';
  bodyFatPercent?: number;
  measurements: CircumferenceMeasurements;
  measurementUnit: 'cm' | 'in';
  photoUrl?: string;
  photoThumbUrl?: string;
  notes?: string;
};

export const CIRCUMFERENCE_FIELDS: { key: keyof CircumferenceMeasurements; label: string }[] = [
  { key: 'neck', label: 'Neck' },
  { key: 'shoulders', label: 'Shoulders' },
  { key: 'chest', label: 'Chest' },
  { key: 'waist', label: 'Waist' },
  { key: 'hips', label: 'Hips' },
  { key: 'leftBicep', label: 'Left Bicep' },
  { key: 'rightBicep', label: 'Right Bicep' },
  { key: 'leftThigh', label: 'Left Thigh' },
  { key: 'rightThigh', label: 'Right Thigh' },
];
