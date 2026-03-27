/**
 * BodyHubHeroCard — inline body hub mini-widget for the dashboard.
 *
 * Displays a layer tab strip (Muscles / Inject / Measure / Cardio), a stat chip
 * row specific to the active layer, and the body SVG — all visible without tapping.
 * Tapping anywhere still navigates to the full Body Hub screen.
 */
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import BodyHubSVG from '../bodyHub/BodyHubSVG';
import { MuscleHeatMapControls } from './MuscleHeatMapControls';
import {
  getBodyPaths,
} from '../../constants/bodyHubPaths';
import { getRegionIdsForMuscle } from '../../utils/muscleMapping';
import { Colors } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import {
  LAYER_COLORS,
  LAYER_ICONS,
  LAYER_LABELS,
} from '../../types/bodyHub';
import type { BodyHubLayer, BodyView, MuscleColorResult, HeatMapMode, ImbalanceResult, VolumeSummary } from '../../types/bodyHub';
import { analytics, AnalyticsEvent } from '../../services/analytics';

// ─── Types ───────────────────────────────────────────────────────────────────

type Props = {
  onPress: () => void;
  // Muscle data
  muscleRegionColors?: Record<string, MuscleColorResult>;
  muscleRecovery?: number | null;
  // Heat map data
  heatMapRegionColors?: Record<string, MuscleColorResult>;
  imbalances?: ImbalanceResult[];
  volumeSummary?: VolumeSummary;
  // Injection data
  injectionSitesReady?: number | null;
  // Cardio data
  cardioRegionColors?: Record<string, MuscleColorResult>;
  restingHR?: number | null;
  effortScore?: number | null;
  /** User sex — selects the correct body model. Defaults to 'male'. */
  sex?: 'male' | 'female';
};

// ─── Constants ────────────────────────────────────────────────────────────────

const GRADIENT_COLORS_DARK: [string, string, string] = ['#1a1a2e', '#0d1b2a', '#1a1a2e'];

const LAYERS: BodyHubLayer[] = ['muscles', 'injections', 'measurements', 'cardio'];

// ─── Resting fallback colors ──────────────────────────────────────────────────

function buildRestingColors(
  paths: Record<string, string>,
): Record<string, { fill: string; fillOpacity: number }> {
  const result: Record<string, { fill: string; fillOpacity: number }> = {};
  for (const key of Object.keys(paths)) {
    result[key] = { fill: '#2a3a4a', fillOpacity: 0.4 };
  }
  return result;
}

// ─── Stat chip helpers ────────────────────────────────────────────────────────

function recoveryColor(score: number, successColor: string): string {
  if (score >= 75) return successColor;
  if (score >= 40) return Colors.gold;
  return Colors.error;
}

function effortColor(score: number, successColor: string): string {
  if (score >= 80) return successColor;
  if (score >= 40) return Colors.gold;
  return Colors.error;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function BodyHubHeroCard({
  onPress,
  muscleRegionColors,
  muscleRecovery,
  heatMapRegionColors,
  imbalances,
  volumeSummary,
  injectionSitesReady,
  cardioRegionColors,
  restingHR,
  effortScore,
  sex = 'male',
}: Props) {
  const { colors } = useTheme();
  const [activeLayer, setActiveLayer] = useState<BodyHubLayer>('muscles');
  const [heatMapMode, setHeatMapMode] = useState<HeatMapMode>('volume');
  // Hero card is front-only — dashboard hooks supply front-view data only.
  // Full front/back toggle available on the Body Hub detail screen.
  const view: BodyView = 'front';

  // Ref guard: fire BODY_HUB_IMBALANCE_VIEWED only once per mount when imbalance regions are present.
  const imbalanceViewedFiredRef = useRef(false);

  // ── Resting colors — built from the sex-specific muscle path keys ─────────
  const bodyPaths = getBodyPaths(sex);
  const frontResting = buildRestingColors(bodyPaths.frontMuscles);

  // ── Region colors: pick source based on active layer ──────────────────────
  const fallbackColors = frontResting;

  let layerRegionColors: Record<string, MuscleColorResult> | undefined;
  if (activeLayer === 'muscles') {
    // Use volume heat map colors when mode is 'volume' and data is available
    layerRegionColors =
      heatMapMode === 'volume' && heatMapRegionColors
        ? heatMapRegionColors
        : muscleRegionColors;
  } else if (activeLayer === 'cardio') {
    layerRegionColors = cardioRegionColors;
  }
  // injections & measurements use resting fallback

  // Spread-merge: fallback ensures all keys get resting gray; prop overlays live colors.
  const regionColors: Record<string, MuscleColorResult> = layerRegionColors
    ? { ...fallbackColors, ...layerRegionColors }
    : fallbackColors;

  // Build imbalance region set from imbalance results (used by BodyHubSVG overlay)
  const imbalanceRegions = (() => {
    if (!imbalances || imbalances.length === 0) return undefined;
    const set = new Set<string>();
    for (const imbalance of imbalances) {
      const regionIds = getRegionIdsForMuscle(imbalance.weak);
      for (const regionId of regionIds) {
        set.add(regionId);
      }
    }
    return set.size > 0 ? set : undefined;
  })();

  // Fire BODY_HUB_IMBALANCE_VIEWED once per mount when imbalance regions are non-empty.
  useEffect(() => {
    if (!imbalanceViewedFiredRef.current && imbalanceRegions && imbalanceRegions.size > 0) {
      analytics.track(AnalyticsEvent.BODY_HUB_IMBALANCE_VIEWED, {
        imbalance_count: imbalanceRegions.size,
      });
      imbalanceViewedFiredRef.current = true;
    }
  }, [imbalanceRegions]);

  // Default VolumeSummary for when the prop is not yet loaded
  const activeSummary: VolumeSummary = volumeSummary ?? {
    totalSets: 0,
    totalVolume: 0,
    imbalanceCount: 0,
  };

  // ── Stats for active layer ────────────────────────────────────────────────

  const renderStats = () => {
    if (activeLayer === 'muscles' && muscleRecovery != null) {
      const color = recoveryColor(muscleRecovery, colors.success);
      return (
        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <Ionicons name="fitness-outline" size={13} color={color} />
            <Text style={[styles.statValue, { color }]}>{Math.round(muscleRecovery)}</Text>
            <Text style={styles.statLabel}>recovery</Text>
          </View>
        </View>
      );
    }

    if (activeLayer === 'injections' && injectionSitesReady != null) {
      return (
        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <Ionicons name="checkmark-circle-outline" size={13} color={Colors.peptide} />
            <Text style={[styles.statValue, { color: Colors.peptide }]}>{injectionSitesReady}</Text>
            <Text style={styles.statLabel}>sites ready</Text>
          </View>
        </View>
      );
    }

    if (activeLayer === 'cardio') {
      const hasHR = restingHR != null;
      const hasEffort = effortScore != null;
      if (!hasHR && !hasEffort) return null;
      return (
        <View style={styles.statsRow}>
          {hasHR && (
            <View style={styles.statChip}>
              <Ionicons name="heart-outline" size={13} color={Colors.error} />
              <Text style={styles.statValue}>{Math.round(restingHR!)}</Text>
              <Text style={styles.statLabel}>bpm</Text>
            </View>
          )}
          {hasEffort && (
            <View style={styles.statChip}>
              <Ionicons name="pulse-outline" size={13} color={effortColor(effortScore!, colors.success)} />
              <Text style={[styles.statValue, { color: effortColor(effortScore!, colors.success) }]}>
                {Math.round(effortScore!)}
              </Text>
              <Text style={styles.statLabel}>effort</Text>
            </View>
          )}
        </View>
      );
    }

    return null;
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={styles.wrapper}
      accessibilityRole="button"
      accessibilityLabel="Body Hub — tap to open full view"
    >
      <LinearGradient
        colors={GRADIENT_COLORS_DARK}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradient}
      >
        {/* Interactive controls — onStartShouldSetResponder prevents taps from
            bubbling to the outer navigation TouchableOpacity */}
        <View onStartShouldSetResponder={() => true}>
          {/* Header row */}
          <View style={styles.headerRow}>
            <Text style={styles.title}>Body Hub</Text>
          </View>

          {/* Layer tab strip */}
          <View style={styles.tabStrip}>
            {LAYERS.map((layer) => {
              const isActive = layer === activeLayer;
              const layerColor = LAYER_COLORS[layer];
              return (
                <TouchableOpacity
                  key={layer}
                  style={[
                    styles.tabPill,
                    isActive && { backgroundColor: 'rgba(255,255,255,0.15)' },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setActiveLayer(layer);
                  }}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={LAYER_LABELS[layer]}
                >
                  <Ionicons
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    name={LAYER_ICONS[layer] as any}
                    size={14}
                    color={isActive ? layerColor : 'rgba(255,255,255,0.35)'}
                  />
                  <Text
                    style={[
                      styles.tabLabel,
                      { color: isActive ? layerColor : 'rgba(255,255,255,0.35)' },
                    ]}
                  >
                    {LAYER_LABELS[layer]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Heat map controls — only shown when muscles layer is active */}
          {activeLayer === 'muscles' && (
            <MuscleHeatMapControls
              mode={heatMapMode}
              onToggleMode={() => {
                const newMode: HeatMapMode = heatMapMode === 'volume' ? 'recency' : 'volume';
                setHeatMapMode(newMode);
                analytics.track(AnalyticsEvent.BODY_HUB_HEATMAP_TOGGLED, { mode: newMode });
              }}
              volumeSummary={activeSummary}
              imbalanceCount={activeSummary.imbalanceCount}
            />
          )}
        </View>

        {/* Stats row — layer-specific, above the SVG */}
        {renderStats()}

        {/* SVG body map */}
        <View style={styles.svgContainer}>
          <BodyHubSVG
            view={view}
            activeLayer={activeLayer}
            regionColors={regionColors}
            onRegionPress={() => { /* no-op in preview */ }}
            selectedRegion={null}
            sex={sex}
            imbalanceRegions={activeLayer === 'muscles' ? imbalanceRegions : undefined}
          />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  gradient: {
    paddingTop: 14,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // ── Layer tabs ──────────────────────────────────────────────────────────────
  tabStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 4,
  },
  tabPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 10,
    minHeight: 44, // ensure >= 44pt touch target
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  // ── Stat chips ──────────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  statValue: {
    color: 'rgba(255,255,255,0.90)',
    fontSize: 12,
    fontWeight: '600',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.50)',
    fontSize: 11,
  },
  // ── SVG container ───────────────────────────────────────────────────────────
  svgContainer: {
    height: 320,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
  },
});
