import type { ActivityType } from '../types/cardio';

export type ActivityMeta = {
  type: ActivityType;
  label: string;
  icon: string; // Ionicons name
  met: number;
  maxSpeedMs: number;
  gpsRelevant: boolean;
  paceRelevant: boolean;
  indoorDefault: boolean;
};

export const ACTIVITY_REGISTRY: ActivityMeta[] = [
  {
    type: 'run',
    label: 'Run',
    icon: 'walk',
    met: 9.8,
    maxSpeedMs: 12,
    gpsRelevant: true,
    paceRelevant: true,
    indoorDefault: false,
  },
  {
    type: 'cycle',
    label: 'Cycle',
    icon: 'bicycle',
    met: 7.5,
    maxSpeedMs: 22,
    gpsRelevant: true,
    paceRelevant: true,
    indoorDefault: false,
  },
  {
    type: 'walk',
    label: 'Walk',
    icon: 'footsteps',
    met: 3.5,
    maxSpeedMs: 4,
    gpsRelevant: true,
    paceRelevant: true,
    indoorDefault: false,
  },
  {
    type: 'swim',
    label: 'Swim',
    icon: 'water',
    met: 6.0,
    maxSpeedMs: 3,
    gpsRelevant: false,
    paceRelevant: false,
    indoorDefault: true,
  },
  {
    type: 'hike',
    label: 'Hike',
    icon: 'trail-sign',
    met: 5.3,
    maxSpeedMs: 3,
    gpsRelevant: true,
    paceRelevant: true,
    indoorDefault: false,
  },
  {
    type: 'hiit',
    label: 'HIIT',
    icon: 'flash',
    met: 10.0,
    maxSpeedMs: 8,
    gpsRelevant: false,
    paceRelevant: false,
    indoorDefault: true,
  },
  {
    type: 'rowing',
    label: 'Rowing',
    icon: 'boat',
    met: 7.0,
    maxSpeedMs: 6,
    gpsRelevant: false,
    paceRelevant: false,
    indoorDefault: true,
  },
  {
    type: 'yoga',
    label: 'Yoga',
    icon: 'body',
    met: 2.5,
    maxSpeedMs: 1,
    gpsRelevant: false,
    paceRelevant: false,
    indoorDefault: true,
  },
  {
    type: 'elliptical',
    label: 'Elliptical',
    icon: 'reload',
    met: 5.0,
    maxSpeedMs: 5,
    gpsRelevant: false,
    paceRelevant: false,
    indoorDefault: true,
  },
  {
    type: 'stairclimber',
    label: 'Stair Climber',
    icon: 'layers',
    met: 6.0,
    maxSpeedMs: 2,
    gpsRelevant: false,
    paceRelevant: false,
    indoorDefault: true,
  },
  {
    type: 'custom',
    label: 'Custom',
    icon: 'ellipsis-horizontal',
    met: 5.0,
    maxSpeedMs: 10,
    gpsRelevant: false,
    paceRelevant: false,
    indoorDefault: false,
  },
];

/** Lookup by activity type — O(1) via Map built once */
const registryMap = new Map<ActivityType, ActivityMeta>(
  ACTIVITY_REGISTRY.map((a) => [a.type, a]),
);

export function getActivityMeta(type: ActivityType): ActivityMeta {
  const meta = registryMap.get(type);
  if (!meta) {
    // Fallback for unknown types — should never happen after type expansion
    return {
      type,
      label: type,
      icon: 'ellipsis-horizontal',
      met: 5.0,
      maxSpeedMs: 10,
      gpsRelevant: false,
      paceRelevant: false,
      indoorDefault: false,
    };
  }
  return meta;
}
