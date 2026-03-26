/**
 * Body Hub — interactive visual human model connecting all four modules.
 *
 * 4 switchable overlay layers: Muscles, Injections, Measurements, Cardio.
 * Users tap body regions to see data from each module.
 *
 * Phase 2: When a Body Model snapshot exists for today, muscle regions use
 * score-based colors (green = recovered, amber = recovering, red = fatigued).
 * Synergy badge appears in the header when snapshot is available.
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import { GlassBackground } from '../../../src/components/GlassBackground';
import { useAuth } from '../../../src/contexts/AuthContext';
import BodyHubSVG from '../../../src/components/bodyHub/BodyHubSVG';
import BodyHubSheet from '../../../src/components/bodyHub/BodyHubSheet';
import MuscleDetailSheet from '../../../src/components/bodyHub/MuscleDetailSheet';
import InjectionLayer from '../../../src/components/bodyHub/InjectionLayer';
import InjectionDetailSheet from '../../../src/components/bodyHub/InjectionDetailSheet';
import MeasurementLayer from '../../../src/components/bodyHub/MeasurementLayer';
import MeasurementDetailSheet from '../../../src/components/bodyHub/MeasurementDetailSheet';
import CardioLayer from '../../../src/components/bodyHub/CardioLayer';
import HeartDetailSheet from '../../../src/components/bodyHub/HeartDetailSheet';
import LungDetailSheet from '../../../src/components/bodyHub/LungDetailSheet';
import LegDetailSheet from '../../../src/components/bodyHub/LegDetailSheet';
import { useBodyHubMuscles } from '../../../src/hooks/useBodyHubMuscles';
import { useBodyHubInjections } from '../../../src/hooks/useBodyHubInjections';
import { useBodyHubMeasurements } from '../../../src/hooks/useBodyHubMeasurements';
import { useBodyHubCardio, CARDIO_REGION_IDS } from '../../../src/hooks/useBodyHubCardio';
import { BODY_MAP_ZONES } from '../../../src/utils/siteRotation';
import {
  getZoneScoreForRegion,
  getZoneNamesForRegion,
} from '../../../src/utils/bodyHubScoreMapping';
import {
  CARDIO_FRONT_LEG_REGIONS,
  CARDIO_BACK_LEG_REGIONS,
} from '../../../src/constants/bodyHubPaths';
import {
  LAYER_COLORS,
  LAYER_ICONS,
  LAYER_LABELS,
  FAB_CONFIG,
} from '../../../src/types/bodyHub';
import type { BodyHubLayer, BodyView } from '../../../src/types/bodyHub';
import { analytics, AnalyticsEvent } from '../../../src/services/analytics';

// ─── Constants ──────────────────────────────────────────────────────────────

const LAYERS: BodyHubLayer[] = ['muscles', 'injections', 'measurements', 'cardio'];

/**
 * Empty state config per layer — icon, message, CTA label, and route.
 * Routes follow Ray's approved plan (note #5).
 */
const EMPTY_STATE_CONFIG: Record<BodyHubLayer, { icon: string; message: string; cta: string; route: string }> = {
  muscles: { icon: 'barbell-outline', message: 'No workouts logged yet', cta: 'Start a Workout', route: '/(tabs)/training' },
  injections: { icon: 'eyedrop-outline', message: 'No injections logged yet', cta: 'Log a Dose', route: '/(tabs)/peptides/log-dose' },
  measurements: { icon: 'resize-outline', message: 'No measurements logged yet', cta: 'Log Measurements', route: '/(tabs)/training/log-measurement' },
  cardio: { icon: 'heart-outline', message: 'No cardio sessions yet', cta: 'Start Cardio', route: '/(tabs)/cardio/start-session' },
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function BodyHubScreen() {
  const { colors, dark } = useTheme();
  const { userProfile } = useAuth();
  const router = useRouter();
  const { height: windowHeight } = useWindowDimensions();
  const bodyMaxHeight = windowHeight * 0.55;

  const [activeLayer, setActiveLayer] = useState<BodyHubLayer>('muscles');
  const [view, setView] = useState<BodyView>('front');
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  // ─── Analytics: BODY_HUB_VIEWED ─────────────────────────────────────────
  // useRef guard ensures the event fires only once per mount, not on every
  // focus (e.g. returning from a drill-down screen).
  const hasViewedRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (hasViewedRef.current) return;
      hasViewedRef.current = true;
      analytics.track(AnalyticsEvent.BODY_HUB_VIEWED);
    }, [])
  );

  // ─── Analytics: BODY_HUB_SHEET_OPENED ───────────────────────────────────
  // NOTE: This intentionally double-fires alongside BODY_HUB_REGION_TAPPED on
  // a single tap. REGION_TAPPED records the tap intent; SHEET_OPENED confirms
  // the sheet actually opened (selectedRegion state was set and is non-null).
  // Guard `if (!selectedRegion) return` prevents firing on sheet close (when
  // selectedRegion becomes null).
  useEffect(() => {
    if (!selectedRegion) return;
    analytics.track(AnalyticsEvent.BODY_HUB_SHEET_OPENED, {
      regionId: selectedRegion,
      layer: activeLayer,
    });
  }, [selectedRegion]); // eslint-disable-line react-hooks/exhaustive-deps
  // activeLayer intentionally omitted — we want the value captured at open time.

  // Layer cross-fade
  const layerOpacity = useSharedValue(1);
  const layerAnimStyle = useAnimatedStyle(() => ({
    opacity: layerOpacity.value,
  }));

  // Front/back flip
  const flipRotation = useSharedValue(0);
  const flipAnimStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 800 }, { rotateY: `${flipRotation.value}deg` }],
  }));

  // Loading pulse: body dims to 0.3–0.6 opacity while data is fetching
  const loadingPulse = useSharedValue(1);
  const loadingPulseStyle = useAnimatedStyle(() => ({
    opacity: loadingPulse.value,
  }));

  const handleLayerChange = useCallback(
    (layer: BodyHubLayer) => {
      if (layer === activeLayer) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedRegion(null);

      // analytics.track is called here on the JS thread, BEFORE withTiming.
      // Reanimated worklets run on the UI thread and cannot call JS functions
      // directly — placing the call here (not inside the animation callback)
      // keeps it safely on the JS thread.
      analytics.track(AnalyticsEvent.BODY_HUB_LAYER_SWITCHED, { layer, view });

      // Cross-fade: fade out → switch state on completion → fade in
      layerOpacity.value = withTiming(
        0,
        { duration: 150, easing: Easing.out(Easing.ease) },
        (finished) => {
          if (finished) {
            runOnJS(setActiveLayer)(layer);
            layerOpacity.value = withTiming(1, {
              duration: 150,
              easing: Easing.in(Easing.ease),
            });
          }
        }
      );
    },
    [activeLayer, layerOpacity]
  );

  const handleViewToggle = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedRegion(null);

    const nextView = view === 'front' ? 'back' : 'front';
    analytics.track(AnalyticsEvent.BODY_HUB_VIEW_TOGGLED, { view: nextView, layer: activeLayer });

    // Flip to 90° (hidden), switch view state, then flip back to 0°
    flipRotation.value = withTiming(
      90,
      { duration: 200, easing: Easing.in(Easing.ease) },
      (finished) => {
        if (finished) {
          runOnJS(setView)(nextView);
          flipRotation.value = withTiming(0, {
            duration: 200,
            easing: Easing.out(Easing.ease),
          });
        }
      }
    );
  }, [view, flipRotation]);

  const handleRegionPress = useCallback((regionId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // For cardio layer: all leg region taps consolidate to 'legs'
    let resolvedId = regionId;
    if (activeLayer === 'cardio') {
      const allLegRegions: readonly string[] = [
        ...CARDIO_FRONT_LEG_REGIONS,
        ...CARDIO_BACK_LEG_REGIONS,
      ];
      if (allLegRegions.includes(regionId)) {
        resolvedId = CARDIO_REGION_IDS.legs;
      }
    }

    analytics.track(AnalyticsEvent.BODY_HUB_REGION_TAPPED, {
      regionId: resolvedId,
      layer: activeLayer,
      view,
    });

    setSelectedRegion((prev) => (prev === resolvedId ? null : resolvedId));
  }, [activeLayer, view]);

  const handleFabPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const config = FAB_CONFIG[activeLayer];
    analytics.track(AnalyticsEvent.BODY_HUB_FAB_PRESSED, {
      layer: activeLayer,
      route: config.route ?? '',
    });
    if (config.route) {
      router.push(config.route as any);
    }
  }, [activeLayer, router]);

  // ─── Data Hooks (per-layer, lazy — only active layer fetches) ──────────────
  const muscles = useBodyHubMuscles(view, activeLayer === 'muscles');
  const injections = useBodyHubInjections(view, activeLayer === 'injections');
  const measurements = useBodyHubMeasurements(view, activeLayer === 'measurements');
  const cardio = useBodyHubCardio(view, activeLayer === 'cardio');

  /**
   * Returns { loading, error, refresh, isEmpty } for the currently active layer.
   *
   * ASSUMPTION: Reads from the hook matching current activeLayer at render time.
   * The refresh() it returns is the current layer's refresh function — this works
   * naturally via closure since the hook references are stable per render.
   *
   * isEmpty is ONLY true when loading===false AND error===null (Ray note #4 — empty
   * flash guard). Never show empty state during loading.
   */
  const getActiveLayerState = useCallback(() => {
    const hooks = { muscles, injections, measurements, cardio };
    const hook = hooks[activeLayer];

    // Layer-specific empty checks (ONLY when !loading && !error — empty flash guard)
    let isEmpty = false;
    if (!hook.loading && !hook.error) {
      switch (activeLayer) {
        case 'muscles':
          isEmpty = muscles.muscleStats.size === 0;
          break;
        case 'injections':
          isEmpty = injections.siteStats.length === 0;
          break;
        case 'measurements':
          isEmpty =
            measurements.points.length === 0 ||
            measurements.points.every((p) => p.latestValue === null);
          break;
        case 'cardio':
          isEmpty =
            cardio.heartData === null &&
            cardio.lungData === null &&
            cardio.legData === null;
          break;
      }
    }

    return { loading: hook.loading, error: hook.error, refresh: hook.refresh, isEmpty };
  }, [activeLayer, muscles, injections, measurements, cardio]);

  const activeLayerState = getActiveLayerState();

  // Start/stop the loading pulse animation when loading state changes
  React.useEffect(() => {
    if (activeLayerState.loading) {
      loadingPulse.value = withRepeat(
        withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      loadingPulse.value = withTiming(1, { duration: 200 });
    }
  }, [activeLayerState.loading, loadingPulse]);

  const layerColor = LAYER_COLORS[activeLayer];

  // ─── Accessibility label builders for SVG layers ──────────────────────────
  // NOTE: These callbacks are passed to SVG components. accessibilityLabel on
  // <G> elements is best-effort — works on iOS in most cases with rn-svg v15,
  // not guaranteed on Android. Props are added pragmatically (Ray note #2).

  const getRegionLabel = useCallback(
    (regionId: string): string => {
      if (activeLayer !== 'muscles') return regionId;
      const stats = muscles.getStatsForRegion(regionId);
      if (!stats) return regionId;
      const days = stats.daysSinceTraining;
      const daysText = days !== null ? `, trained ${days} day${days === 1 ? '' : 's'} ago` : ', never trained';
      return `${regionId}${daysText}`;
    },
    [activeLayer, muscles]
  );

  const getZoneLabel = useCallback(
    (zoneId: string): string => {
      const stats = injections.getStatsForZone(zoneId);
      const zoneInfo = BODY_MAP_ZONES.find((z) => z.id === zoneId);
      const name = zoneInfo?.label ?? zoneId;
      if (!stats) return name;
      const days = stats.daysSinceUse;
      const daysText = days !== null ? `, ${days} day${days === 1 ? '' : 's'} since last injection` : ', never injected';
      return `${name}${daysText}`;
    },
    [injections]
  );

  const getOrganLabel = useCallback(
    (organId: string): string => {
      if (organId === 'heart') {
        const bpm = cardio.heartData?.restingBpm;
        return bpm !== null && bpm !== undefined ? `Heart, resting HR ${bpm} bpm` : 'Heart';
      }
      if (organId === 'leftLung' || organId === 'rightLung') {
        const effort = cardio.lungData?.effortScore;
        const side = organId === 'leftLung' ? 'Left lung' : 'Right lung';
        return effort !== null && effort !== undefined ? `${side}, effort score ${effort}` : side;
      }
      return organId;
    },
    [cardio]
  );

  // Score data — available when Body Model snapshot exists for today
  const hasScoreData = !!muscles.bodyModelSnapshot;
  const snapshot = muscles.bodyModelSnapshot;

  // Build region colors from active layer's data
  const regionColors = (() => {
    if (activeLayer === 'muscles') return muscles.regionColors;
    if (activeLayer === 'cardio') return cardio.regionColors;
    return {};
  })();

  // Find suggested injection zone ID
  const suggestedInjectionZoneId = injections.suggestedSite
    ? BODY_MAP_ZONES.find((z) => z.injectionSite === injections.suggestedSite!.site && z.view === view)?.id ?? null
    : null;

  // Compute score data for the selected region (muscle layer, score mode)
  const selectedRegionScoreData = (() => {
    if (!selectedRegion || !snapshot || activeLayer !== 'muscles') return null;
    const score = getZoneScoreForRegion(selectedRegion, snapshot.muscles);
    if (score === null) return null;
    const zones = getZoneNamesForRegion(selectedRegion);
    const breakdown = zones.map((z) => ({
      zone: z.zone,
      label: z.label,
      score: snapshot.muscles[z.zone],
    }));
    return { score, breakdown };
  })();

  return (
    <GlassBackground>
    <SafeAreaView style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Body Hub</Text>

        {/* Synergy Badge — visible only on muscles layer when snapshot available (Ray note #5) */}
        {hasScoreData && activeLayer === 'muscles' && snapshot ? (
          <TouchableOpacity
            style={styles.synergyBadge}
            hitSlop={8}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Synergy score ${Math.round(snapshot.synergyScore)}`}
          >
            <View
              style={[
                styles.synergyDot,
                { backgroundColor: synergyDotColor(snapshot.synergyScore) },
              ]}
            />
            <Text style={[styles.synergyScore, { color: colors.textPrimary }]}>
              {Math.round(snapshot.synergyScore)}
            </Text>
          </TouchableOpacity>
        ) : (
          // Spacer keeps title centered when badge is absent
          <View style={{ width: 44 }} />
        )}
      </View>

      {/* Layer Tabs */}
      <View style={[styles.tabRow, { borderColor: colors.border }]} accessibilityRole="tablist">
        {LAYERS.map((layer) => {
          const isActive = layer === activeLayer;
          const color = LAYER_COLORS[layer];
          return (
            <TouchableOpacity
              key={layer}
              style={[
                styles.tab,
                isActive && { backgroundColor: color + '1A', borderBottomColor: color, borderBottomWidth: 3 },
              ]}
              onPress={() => handleLayerChange(layer)}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={LAYER_LABELS[layer]}
            >
              <Ionicons
                name={LAYER_ICONS[layer] as any}
                size={18}
                color={isActive ? color : colors.textSecondary}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: isActive ? color : colors.textSecondary },
                  isActive && styles.tabLabelActive,
                ]}
              >
                {LAYER_LABELS[layer]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Front/Back Toggle */}
      <View style={styles.toggleRow}>
        <View style={[styles.togglePill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.toggleSide, view === 'front' && { backgroundColor: layerColor }]}
            onPress={() => view !== 'front' && handleViewToggle()}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ checked: view === 'front' }}
            accessibilityLabel="Front view"
          >
            <Text style={[styles.toggleText, { color: view === 'front' ? '#FFFFFF' : colors.textSecondary }]}>
              Front
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleSide, view === 'back' && { backgroundColor: layerColor }]}
            onPress={() => view !== 'back' && handleViewToggle()}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ checked: view === 'back' }}
            accessibilityLabel="Back view"
          >
            <Text style={[styles.toggleText, { color: view === 'back' ? '#FFFFFF' : colors.textSecondary }]}>
              Back
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Error banner — shown between toggle and body when active layer has an error */}
      {activeLayerState.error !== null && (
        <View style={[styles.errorBanner, { backgroundColor: colors.surface }]}>
          <Ionicons name="alert-circle-outline" size={18} color={Colors.error} style={styles.errorIcon} />
          <Text style={[styles.errorText, { color: colors.textPrimary }]} numberOfLines={2}>
            {activeLayerState.error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { borderColor: Colors.error }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              activeLayerState.refresh();
            }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Retry loading data"
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Body SVG — wrapped in loading pulse animation */}
      <Animated.View style={[styles.bodyContainer, { maxHeight: bodyMaxHeight }, flipAnimStyle]}>
        {/* Loading pulse wrapper dims the body while data is fetching */}
        <Animated.View style={[styles.bodyInner, layerAnimStyle, loadingPulseStyle]}>
          <BodyHubSVG
            view={view}
            activeLayer={activeLayer}
            regionColors={regionColors}
            onRegionPress={handleRegionPress}
            selectedRegion={selectedRegion}
            getRegionLabel={getRegionLabel}
            sex={userProfile?.sex ?? 'male'}
          >
            {/* Injection zones overlay — hidden during loading to avoid stale renders */}
            {activeLayer === 'injections' && !activeLayerState.loading && (
              <InjectionLayer
                view={view}
                getColorForZone={injections.getColorForZone}
                suggestedZoneId={suggestedInjectionZoneId}
                selectedZone={selectedRegion}
                onZonePress={handleRegionPress}
                getZoneLabel={getZoneLabel}
              />
            )}

            {/* Measurement points overlay — hidden during loading */}
            {activeLayer === 'measurements' && !activeLayerState.loading && (
              <MeasurementLayer
                points={measurements.points}
                selectedPoint={selectedRegion}
                onPointPress={handleRegionPress}
              />
            )}

            {/* Cardio organ overlay — hidden during loading */}
            {activeLayer === 'cardio' && !activeLayerState.loading && (
              <CardioLayer
                view={view}
                lungData={cardio.lungData}
                selectedRegion={selectedRegion}
                onOrganPress={handleRegionPress}
                getOrganLabel={getOrganLabel}
              />
            )}
          </BodyHubSVG>
        </Animated.View>

        {/* Empty state overlay — centered over the (dimmed) body SVG */}
        {activeLayerState.isEmpty && !activeLayerState.loading && activeLayerState.error === null && (
          <View style={styles.emptyStateOverlay} pointerEvents="box-none">
            <View style={[styles.emptyStateCard, { backgroundColor: colors.surface }]}>
              <Ionicons
                name={EMPTY_STATE_CONFIG[activeLayer].icon as any}
                size={40}
                color={layerColor}
              />
              <Text style={[styles.emptyStateMessage, { color: colors.textPrimary }]}>
                {EMPTY_STATE_CONFIG[activeLayer].message}
              </Text>
              <TouchableOpacity
                style={[styles.emptyStateCta, { backgroundColor: layerColor }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(EMPTY_STATE_CONFIG[activeLayer].route as any);
                }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={EMPTY_STATE_CONFIG[activeLayer].cta}
              >
                <Text style={styles.emptyStateCtaText}>{EMPTY_STATE_CONFIG[activeLayer].cta}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Animated.View>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: layerColor }]}
        onPress={handleFabPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={FAB_CONFIG[activeLayer].label}
      >
        <Ionicons name={FAB_CONFIG[activeLayer].icon as any} size={22} color="#FFFFFF" />
        <Text style={styles.fabLabel}>{FAB_CONFIG[activeLayer].label}</Text>
      </TouchableOpacity>

      {/* Bottom Sheet — muscle layer */}
      {activeLayer === 'muscles' && (
        <BodyHubSheet
          visible={selectedRegion !== null}
          onClose={() => setSelectedRegion(null)}
          height={hasScoreData ? 420 : 320}
        >
          <MuscleDetailSheet
            stats={selectedRegion ? muscles.getStatsForRegion(selectedRegion) : null}
            onClose={() => setSelectedRegion(null)}
            zoneScore={selectedRegionScoreData?.score ?? null}
            zoneBreakdown={selectedRegionScoreData?.breakdown ?? null}
          />
        </BodyHubSheet>
      )}

      {/* Bottom Sheet — injection layer */}
      {activeLayer === 'injections' && (
        <BodyHubSheet
          visible={selectedRegion !== null}
          onClose={() => setSelectedRegion(null)}
          height={240}
        >
          <InjectionDetailSheet
            stats={selectedRegion ? injections.getStatsForZone(selectedRegion) : null}
            zoneName={BODY_MAP_ZONES.find((z) => z.id === selectedRegion)?.label ?? ''}
            onClose={() => setSelectedRegion(null)}
          />
        </BodyHubSheet>
      )}

      {/* Bottom Sheet — measurement layer */}
      {activeLayer === 'measurements' && (
        <BodyHubSheet
          visible={selectedRegion !== null}
          onClose={() => setSelectedRegion(null)}
          height={360}
        >
          <MeasurementDetailSheet
            data={selectedRegion ? measurements.getPointData(selectedRegion as any) : null}
            onClose={() => setSelectedRegion(null)}
            onLogAll={() => router.push('/(tabs)/dashboard/body-tracking' as any)}
          />
        </BodyHubSheet>
      )}

      {/* Bottom Sheet — cardio: heart */}
      {activeLayer === 'cardio' && selectedRegion === 'heart' && (
        <BodyHubSheet
          visible={selectedRegion === 'heart'}
          onClose={() => setSelectedRegion(null)}
          height={320}
        >
          <HeartDetailSheet
            data={cardio.heartData}
            onClose={() => setSelectedRegion(null)}
          />
        </BodyHubSheet>
      )}

      {/* Bottom Sheet — cardio: lungs */}
      {activeLayer === 'cardio' && (selectedRegion === 'leftLung' || selectedRegion === 'rightLung') && (
        <BodyHubSheet
          visible={selectedRegion === 'leftLung' || selectedRegion === 'rightLung'}
          onClose={() => setSelectedRegion(null)}
          height={280}
        >
          <LungDetailSheet
            data={cardio.lungData}
            onClose={() => setSelectedRegion(null)}
          />
        </BodyHubSheet>
      )}

      {/* Bottom Sheet — cardio: legs */}
      {activeLayer === 'cardio' && selectedRegion === 'legs' && (
        <BodyHubSheet
          visible={selectedRegion === 'legs'}
          onClose={() => setSelectedRegion(null)}
          height={320}
        >
          <LegDetailSheet
            data={cardio.legData}
            onClose={() => setSelectedRegion(null)}
          />
        </BodyHubSheet>
      )}
    </SafeAreaView>
    </GlassBackground>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns a color for the synergy score dot matching score thresholds. */
function synergyDotColor(score: number): string {
  if (score >= 80) return Colors.nutrition;
  if (score >= 50) return Colors.warning;
  return Colors.error;
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },

  // Synergy badge — color dot + score text, min 44px touch area (Ray note #5)
  synergyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'flex-end',
  },
  synergyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  synergyScore: {
    fontSize: 16,
    fontWeight: '700',
  },

  // Layer Tabs
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginHorizontal: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  tabLabelActive: {
    fontWeight: '700',
  },

  // Front/Back Toggle
  toggleRow: {
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  togglePill: {
    flexDirection: 'row',
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  toggleSide: {
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 20,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Body SVG container
  bodyContainer: {
    flex: 1,
    marginHorizontal: 24,
    marginBottom: 8,
  },
  bodyInner: {
    flex: 1,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
  fabLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // Error banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EF444433',
    gap: 8,
  },
  errorIcon: {
    flexShrink: 0,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  retryButton: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  retryText: {
    color: Colors.error,
    fontSize: 13,
    fontWeight: '600',
  },

  // Empty state overlay — absolute, centered over the body SVG
  emptyStateOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateCard: {
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 28,
    paddingVertical: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    maxWidth: 260,
  },
  emptyStateMessage: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyStateCta: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 4,
  },
  emptyStateCtaText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
