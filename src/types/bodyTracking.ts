import { Timestamp } from 'firebase/firestore';

// ─── Weight ─────────────────────────────────────────────────────────────────

export type BodyWeightEntry = {
  id: string;
  weight: number; // always stored in kg
  displayUnit: 'kg' | 'lbs';
  date: string; // YYYY-MM-DD (document ID)
  note?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

/** Input for creating/updating a weight entry. Server-managed fields stripped. */
export type BodyWeightInput = {
  weight: number; // kg
  displayUnit: 'kg' | 'lbs';
  date: string; // YYYY-MM-DD
  note?: string;
};

export type WeightStats = {
  starting: number; // first entry in range (kg)
  current: number; // most recent entry (kg)
  change: number; // current - starting (kg)
  average: number; // mean of all entries (kg)
  lowest: number; // min in range (kg)
  highest: number; // max in range (kg)
};

export type TimeRange = '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL';

// ─── Progress Photos ────────────────────────────────────────────────────────

export type PhotoPose = 'front' | 'side' | 'back';

export type PoseUrls = {
  fullUrl: string;
  thumbUrl: string;
};

export type ProgressPhotoEntry = {
  id: string;
  date: string; // YYYY-MM-DD (document ID)
  poses: Partial<Record<PhotoPose, PoseUrls>>;
  weight?: number; // snapshot in kg from that date
  note?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

/** Input for creating a progress photo entry. */
export type ProgressPhotoInput = {
  date: string;
  poses: Partial<Record<PhotoPose, PoseUrls>>;
  weight?: number;
  note?: string;
};

/** A single captured photo before upload. */
export type CapturedPhoto = {
  pose: PhotoPose;
  uri: string; // local file URI
};
