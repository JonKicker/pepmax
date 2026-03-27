/**
 * Celebration system types.
 * Used by celebrationPresets, CelebrationOverlay, and useCelebration.
 */

export type CelebrationTier = 'micro' | 'medium' | 'major' | 'legendary';

export type HapticPattern = 'tap' | 'success' | 'heavy' | 'doubleHeavy';

export type ParticleConfig = {
  /** Unique index */
  index: number;
  /** Angle in degrees (deterministic: i * 360/count) */
  angle: number;
  /** Travel distance in px */
  distance: number;
  /** Particle color */
  color: string;
  /** Particle size in px */
  size: number;
  /** Launch delay in ms */
  delay: number;
};

export type CelebrationConfig = {
  /** Visual intensity tier */
  tier: CelebrationTier;
  /** Total duration of celebration in ms */
  duration: number;
  /** Higher priority plays first when queue has multiple items */
  priority: number;
  /** Haptic pattern to fire */
  hapticPattern: HapticPattern;
  /** Number of particles to render (0 = no particle system) */
  particleCount: number;
  /** Optional title text */
  title?: string;
  /** Optional subtitle text */
  subtitle?: string;
  /** Optional icon name (Ionicons) */
  icon?: string;
  /** Optional accent color override */
  accentColor?: string;
};

export type CelebrationQueueItem = {
  id: string;
  config: CelebrationConfig;
  /** Timestamp when added (used for drop-oldest) */
  addedAt: number;
};
