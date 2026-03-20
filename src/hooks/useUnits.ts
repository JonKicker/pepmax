/**
 * useUnits — centralized unit conversion hook.
 *
 * Reads units preference from the user profile (imperial/metric).
 * Defaults to imperial when profile is not yet loaded.
 *
 * All display-layer unit logic should go through this hook.
 * Consolidates conversions previously duplicated in profile/index.tsx and
 * nutrition/settings.tsx.
 */
import { useAuth } from '../contexts/AuthContext';

// Conversion constants
const KG_TO_LBS = 2.20462;
const CM_PER_INCH = 2.54;
const KM_TO_MI = 0.621371;

export type UnitsHook = {
  isImperial: boolean;
  weightLabel: string;
  heightLabel: string;
  distanceLabel: string;
  lengthLabel: 'in' | 'cm';
  formatWeight: (kg: number) => string;
  formatHeight: (cm: number) => string;
  formatDistance: (km: number) => string;
  formatLength: (cm: number) => string;
  convertWeightToDisplay: (kg: number) => number;
  convertWeightToKg: (displayValue: number) => number;
  convertHeightToCm: (feet: number, inches: number) => number;
  convertLengthToDisplay: (cm: number) => number;
  convertLengthToCm: (displayValue: number) => number;
};

export function useUnits(): UnitsHook {
  const { userProfile } = useAuth();
  const isImperial = userProfile?.units !== 'metric'; // defaults to imperial

  function formatWeight(kg: number): string {
    if (isImperial) return `${(kg * KG_TO_LBS).toFixed(1)} lbs`;
    return `${kg.toFixed(1)} kg`;
  }

  function formatHeight(cm: number): string {
    if (isImperial) {
      const totalInches = cm / CM_PER_INCH;
      const feet = Math.floor(totalInches / 12);
      const inches = Math.round(totalInches % 12);
      return `${feet}'${inches}"`;
    }
    return `${Math.round(cm)} cm`;
  }

  function formatDistance(km: number): string {
    if (isImperial) return `${(km * KM_TO_MI).toFixed(2)} mi`;
    return `${km.toFixed(2)} km`;
  }

  // Returns the weight value in display units (no label)
  function convertWeightToDisplay(kg: number): number {
    return isImperial
      ? parseFloat((kg * KG_TO_LBS).toFixed(1))
      : parseFloat(kg.toFixed(1));
  }

  // Converts a display-unit value back to kg for storage
  function convertWeightToKg(displayValue: number): number {
    return isImperial ? displayValue / KG_TO_LBS : displayValue;
  }

  // Converts feet + inches to cm for storage
  function convertHeightToCm(feet: number, inches: number): number {
    return (feet * 12 + inches) * CM_PER_INCH;
  }

  // Returns length value in display units (no label)
  function convertLengthToDisplay(cm: number): number {
    return isImperial
      ? parseFloat((cm / CM_PER_INCH).toFixed(1))
      : parseFloat(cm.toFixed(1));
  }

  // Converts display-unit length value back to cm for storage
  function convertLengthToCm(displayValue: number): number {
    return isImperial ? displayValue * CM_PER_INCH : displayValue;
  }

  function formatLength(cm: number): string {
    if (isImperial) return `${(cm / CM_PER_INCH).toFixed(1)} in`;
    return `${cm.toFixed(1)} cm`;
  }

  return {
    isImperial,
    weightLabel: isImperial ? 'lbs' : 'kg',
    heightLabel: isImperial ? 'ft/in' : 'cm',
    distanceLabel: isImperial ? 'mi' : 'km',
    lengthLabel: isImperial ? 'in' : 'cm',
    formatWeight,
    formatHeight,
    formatDistance,
    formatLength,
    convertWeightToDisplay,
    convertWeightToKg,
    convertHeightToCm,
    convertLengthToDisplay,
    convertLengthToCm,
  };
}
