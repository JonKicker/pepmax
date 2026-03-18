import { Timestamp } from 'firebase/firestore';

export type ActivityType = 'run' | 'cycle' | 'walk' | 'swim';

export type DistanceUnit = 'mi' | 'km';

export type PoolLength = '25m' | '50m' | '25yd' | '50yd' | 'custom';

export type AudioCueFrequency = '0.5mi' | '1mi' | '5min' | '10min';

export type AudioCueContent = 'distance' | 'pace' | 'time';

export type GoalType = 'distance' | 'time' | 'pace' | 'none';

export type SessionGoal = {
  type: GoalType;
  value: number; // meters for distance, seconds for time, seconds-per-km for pace
};

export type CardioSettings = {
  audioCuesEnabled: boolean;
  audioCueFrequency: AudioCueFrequency;
  audioCueContent: AudioCueContent[];
  distanceUnit: DistanceUnit;
  autoPauseRun: boolean;
  autoPauseCycle: boolean;
  // Heart rate
  maxHeartRate?: number;
  hrMonitorId?: string;
  hrMonitorName?: string;
};

export type RoutePoint = {
  latitude: number;
  longitude: number;
  altitude: number | null;
  timestamp: number; // ms since epoch
  speed: number | null; // m/s
  accuracy: number | null; // meters
};

export type Split = {
  splitNumber: number;
  distance: number; // meters
  time: number; // seconds (active only, excluding paused)
  pace: number; // seconds per km
  elevationChange: number; // meters
};

export type CardioSessionStatus = 'active' | 'paused' | 'completed' | 'abandoned';

export type CardioSession = {
  id: string;
  activityType: ActivityType;
  startedAt: Timestamp;
  endedAt: Timestamp | null;
  status: CardioSessionStatus;
  route: RoutePoint[];
  distance: number; // total meters
  duration: number; // total active seconds (excludes paused time)
  totalPausedTime: number; // seconds
  averagePace: number; // seconds per km
  splits: Split[];
  calories: number;
  elevationGain: number;
  elevationLoss: number;
  goals: SessionGoal | null;
  indoorMode: boolean;
  notes: string;
  // Swim-specific
  lapCount: number | null;
  poolLength: PoolLength | null;
  poolLengthCustomM: number | null;
  // Heart rate (optional — only set when HR monitor was used or manually entered)
  avgHeartRate?: number;
  maxHeartRate?: number;
  heartRateData?: HeartRatePoint[];
  timeInZones?: TimeInZone[];
  // Meta
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

// ─── Heart Rate ───────────────────────────────────────────────────────────────

export type HeartRatePoint = {
  timestamp: number; // ms since epoch
  bpm: number;
};

export type HeartRateZone = {
  zone: 1 | 2 | 3 | 4 | 5;
  name: string;
  minPct: number;
  maxPct: number;
  color: string;
};

export type TimeInZone = {
  zone: number;
  name: string;
  seconds: number;
  color: string;
};

export type CardioSessionInput = Omit<CardioSession, 'id' | 'createdAt' | 'updatedAt'>;

export type CardioPRMetric = 'fastestPace' | 'fastestSplit' | 'longestDistance' | 'longestDuration' | 'mostCalories' | 'mostElevation';

export type CardioPR = {
  metric: CardioPRMetric;
  activityType: ActivityType;
  value: number;
  sessionId: string;
  achievedAt: Timestamp;
  previousValue?: number;
};

export type DateRange = 'week' | 'month' | '3months' | 'all';

export type HistoryFilter = {
  activityType?: ActivityType;
  dateRange?: DateRange;
  minDistanceM?: number;
  maxDistanceM?: number;
};

// For the activity cards "last session" display
export type LastSessionSummary = {
  activityType: ActivityType;
  distance: number;
  duration: number;
  date: string;
};
