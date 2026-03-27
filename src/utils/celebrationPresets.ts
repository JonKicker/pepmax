/**
 * celebrationPresets — factory functions for each celebration tier.
 * All presets return a CelebrationConfig. No randomness — deterministic output.
 */
import type { CelebrationConfig, CelebrationTier } from '../types/celebration';

// ─── Particle count per tier ────────────────────────────────────────────────
export function getParticleCountForTier(tier: CelebrationTier): number {
  switch (tier) {
    case 'micro':     return 0;
    case 'medium':    return 20;
    case 'major':     return 32;
    case 'legendary': return 40;
  }
}

// ─── Presets ─────────────────────────────────────────────────────────────────

/** Tiny inline feedback — scale flash only, no particles */
export function micro(overrides: Partial<CelebrationConfig> = {}): CelebrationConfig {
  return {
    tier: 'micro',
    duration: 300,
    priority: 1,
    hapticPattern: 'tap',
    particleCount: 0,
    ...overrides,
  };
}

/** Daily quest completion */
export function dailyQuest(overrides: Partial<CelebrationConfig> = {}): CelebrationConfig {
  return {
    tier: 'medium',
    duration: 2000,
    priority: 3,
    hapticPattern: 'success',
    particleCount: 20,
    title: 'Quest Complete!',
    icon: 'checkmark-circle',
    ...overrides,
  };
}

/** Head-to-head duel victory */
export function duelWin(overrides: Partial<CelebrationConfig> = {}): CelebrationConfig {
  return {
    tier: 'medium',
    duration: 2500,
    priority: 4,
    hapticPattern: 'success',
    particleCount: 20,
    title: 'Duel Won!',
    icon: 'shield-checkmark',
    ...overrides,
  };
}

/** Rank promotion */
export function rankUp(overrides: Partial<CelebrationConfig> = {}): CelebrationConfig {
  return {
    tier: 'major',
    duration: 3000,
    priority: 5,
    hapticPattern: 'heavy',
    particleCount: 32,
    title: 'Rank Up!',
    icon: 'arrow-up-circle',
    ...overrides,
  };
}

/** Season reward unlocked */
export function seasonReward(overrides: Partial<CelebrationConfig> = {}): CelebrationConfig {
  return {
    tier: 'major',
    duration: 3000,
    priority: 5,
    hapticPattern: 'heavy',
    particleCount: 32,
    title: 'Season Reward!',
    icon: 'gift',
    ...overrides,
  };
}

/** Elite achievement unlocked */
export function elite(overrides: Partial<CelebrationConfig> = {}): CelebrationConfig {
  return {
    tier: 'legendary',
    duration: 3500,
    priority: 5,
    hapticPattern: 'doubleHeavy',
    particleCount: 40,
    title: 'Elite Achievement!',
    icon: 'trophy',
    ...overrides,
  };
}

/** Perfect week streak */
export function perfectWeek(overrides: Partial<CelebrationConfig> = {}): CelebrationConfig {
  return {
    tier: 'legendary',
    duration: 3500,
    priority: 5,
    hapticPattern: 'doubleHeavy',
    particleCount: 40,
    title: 'Perfect Week!',
    icon: 'star',
    ...overrides,
  };
}
