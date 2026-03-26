import type { MuscleGroup } from './exercise';
import type { InjectionSite } from './peptide';
import type { SiteStats } from '../utils/siteRotation';

// ─── Layer Types ────────────────────────────────────────────────────────────

export type BodyHubLayer = 'muscles' | 'injections' | 'measurements' | 'cardio';
export type BodyView = 'front' | 'back';

// ─── Layer Colors ───────────────────────────────────────────────────────────

export const LAYER_COLORS: Record<BodyHubLayer, string> = {
  muscles: '#E8793A',
  injections: '#7B68EE',
  measurements: '#2D9F6F',
  cardio: '#3A7BD5',
};

export const LAYER_ICONS: Record<BodyHubLayer, string> = {
  muscles: 'barbell-outline',
  injections: 'eyedrop-outline',
  measurements: 'resize-outline',
  cardio: 'heart-outline',
};

export const LAYER_LABELS: Record<BodyHubLayer, string> = {
  muscles: 'Muscles',
  injections: 'Inject',
  measurements: 'Measure',
  cardio: 'Cardio',
};

// ─── Muscle Layer Types ─────────────────────────────────────────────────────

export type MuscleRegionData = {
  muscle: MuscleGroup;
  regionId: string;
  lastTrained: Date | null;
  daysSinceTraining: number | null;
  weeklySets: number;
  weeklyVolume: number;
  topExercises: { name: string; bestWeight: number; weightUnit: string }[];
  oneRmHistory: { date: string; value: number }[];
};

export type MuscleColorResult = {
  fill: string;
  fillOpacity: number;
};

// ─── Injection Layer Types ──────────────────────────────────────────────────

export type InjectionRegionData = {
  site: InjectionSite;
  stats: SiteStats;
  isSuggested: boolean;
};

// ─── Measurement Layer Types ────────────────────────────────────────────────

export type MeasurementField =
  | 'neck'
  | 'shoulders'
  | 'chest'
  | 'waist'
  | 'hips'
  | 'leftBicep'
  | 'rightBicep'
  | 'leftThigh'
  | 'rightThigh'
  | 'leftCalf'
  | 'rightCalf';

export type MeasurementPointData = {
  field: MeasurementField;
  label: string;
  latestValue: number | null;
  unit: 'cm' | 'in';
  trend: 'up' | 'down' | 'flat' | 'none';
  history: { date: string; value: number }[];
};

export type MeasurementPoint = {
  field: MeasurementField;
  label: string;
  x: number;
  y: number;
};

// ─── Cardio Layer Types ─────────────────────────────────────────────────────

export type CardioOrganType = 'heart' | 'lungs' | 'legs';

export type HeartData = {
  restingBpm: number | null;
  bpmHistory: { date: string; value: number }[];
  hrZones: { zone: number; label: string; minutes: number; color: string }[];
  vo2max: number | null;
  lastSession: { type: string; duration: number; distance: number; date: string } | null;
};

export type LungData = {
  weeklyCardioMinutes: number;
  weeklyDistance: number;
  lastWeekMinutes: number;
  lastWeekDistance: number;
  effortScore: number | null;
};

export type LegData = {
  weeklyMileage: number;
  activityBreakdown: { type: string; miles: number }[];
  averagePaceTrend: { week: string; pace: number }[];
  weeklyCalories: number;
  gymLegSets: number;
  crossModuleWarning: boolean;
};

// ─── Sheet Types ────────────────────────────────────────────────────────────

export type BodyHubSheetContent =
  | { type: 'muscle'; data: MuscleRegionData }
  | { type: 'injection'; data: InjectionRegionData }
  | { type: 'measurement'; data: MeasurementPointData }
  | { type: 'heart'; data: HeartData }
  | { type: 'lungs'; data: LungData }
  | { type: 'legs'; data: LegData };

// ─── FAB Config ─────────────────────────────────────────────────────────────

export const FAB_CONFIG: Record<BodyHubLayer, { label: string; icon: string; route: string }> = {
  muscles: { label: 'Start Workout', icon: 'barbell-outline', route: '/(tabs)/training' },
  injections: { label: 'Log Injection', icon: 'eyedrop-outline', route: '/(tabs)/peptides/log-dose' },
  measurements: { label: 'Log Measurements', icon: 'resize-outline', route: '/(tabs)/training/log-measurement' },
  cardio: { label: 'Start Cardio', icon: 'heart-outline', route: '/(tabs)/cardio/start-session' },
};
