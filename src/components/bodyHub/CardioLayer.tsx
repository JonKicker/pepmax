/**
 * Cardio layer overlay — renders organ shapes (heart, lungs) and leg regions
 * on the Body Hub SVG for the cardio layer.
 *
 * Rendered as children inside BodyHubSVG's <Svg> — returns <G> elements only.
 * Organs are ONLY rendered when view === 'front' (Ray note #9).
 * Heart has a pulsing opacity animation that is cancelled on unmount (Ray note #7).
 * Lung opacity scales with effortScore (Ray notes #3 / #5 handled in hook).
 * Transparent Rect hit areas expand tap targets behind each organ (Ray note #6).
 */
import React, { useEffect } from 'react';
import { G, Path, Rect } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { ORGAN_PATHS } from '../../constants/bodyHubPaths';
import { LAYER_COLORS } from '../../types/bodyHub';
import type { BodyView, LungData } from '../../types/bodyHub';
import { CARDIO_REGION_IDS } from '../../hooks/useBodyHubCardio';

// ─── Animated Path ───────────────────────────────────────────────────────────

const AnimatedPath = Animated.createAnimatedComponent(Path);

// ─── Types ───────────────────────────────────────────────────────────────────

type Props = {
  view: BodyView;
  lungData: LungData | null;
  selectedRegion: string | null;
  onOrganPress: (regionId: string) => void;
  /**
   * Accessibility: callback returning a human-readable label for an organ region.
   * NOTE: accessibilityLabel on SVG <G> is best-effort (iOS-only in rn-svg v15).
   */
  getOrganLabel?: (organId: string) => string;
};

// ─── Component ───────────────────────────────────────────────────────────────

const CARDIO_BLUE_LIGHT = '#6BA3E8';
const ORGAN_STROKE_SELECTED = '#FFFFFF';

export default function CardioLayer({ view, lungData, selectedRegion, onOrganPress, getOrganLabel }: Props) {
  // Pulsing opacity for heart
  const heartOpacity = useSharedValue(0.75);

  useEffect(() => {
    heartOpacity.value = withRepeat(
      withSequence(
        withTiming(1.0, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.6, { duration: 700, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    return () => {
      // Cancel animation on unmount to avoid Reanimated warnings (Ray note #7)
      cancelAnimation(heartOpacity);
    };
  }, [heartOpacity]);

  const heartAnimProps = useAnimatedProps(() => ({
    fillOpacity: heartOpacity.value,
  }));

  // Lung opacity scales with effortScore (0–100 → fillOpacity 0.3–0.8)
  const lungFillOpacity = (() => {
    if (!lungData || lungData.effortScore === null) return 0.35;
    return 0.3 + (lungData.effortScore / 100) * 0.5;
  })();

  // Only render organs on front view (Ray note #9)
  if (view !== 'front') return <G />;

  const heartSelected = selectedRegion === CARDIO_REGION_IDS.heart;
  const leftLungSelected = selectedRegion === CARDIO_REGION_IDS.leftLung;
  const rightLungSelected = selectedRegion === CARDIO_REGION_IDS.rightLung;

  const heart = ORGAN_PATHS.heart;
  const leftLung = ORGAN_PATHS.leftLung;
  const rightLung = ORGAN_PATHS.rightLung;

  const leftLungLabel = getOrganLabel ? getOrganLabel(CARDIO_REGION_IDS.leftLung) : 'Left lung';
  const rightLungLabel = getOrganLabel ? getOrganLabel(CARDIO_REGION_IDS.rightLung) : 'Right lung';
  const heartLabel = getOrganLabel ? getOrganLabel(CARDIO_REGION_IDS.heart) : 'Heart';

  return (
    <G>
      {/* ── Left Lung ──────────────────────────────────────────────────── */}
      {/* NOTE: accessible/accessibilityLabel on <G> is best-effort (iOS-only in rn-svg v15) */}
      <G
        onPress={() => onOrganPress(CARDIO_REGION_IDS.leftLung)}
        accessible={true}
        accessibilityLabel={leftLungLabel}
        accessibilityRole="button"
      >
        {/* Transparent hit area — larger tap target (Ray note #6) */}
        <Rect
          x={leftLung.position.x - 16}
          y={leftLung.position.y - 42}
          width={36}
          height={90}
          fill="transparent"
        />
        <Path
          d={leftLung.main}
          fill={LAYER_COLORS.cardio}
          fillOpacity={lungFillOpacity}
          stroke={leftLungSelected ? ORGAN_STROKE_SELECTED : CARDIO_BLUE_LIGHT}
          strokeWidth={leftLungSelected ? 2 : 0.8}
          strokeLinejoin="round"
        />
      </G>

      {/* ── Right Lung ─────────────────────────────────────────────────── */}
      <G
        onPress={() => onOrganPress(CARDIO_REGION_IDS.rightLung)}
        accessible={true}
        accessibilityLabel={rightLungLabel}
        accessibilityRole="button"
      >
        <Rect
          x={rightLung.position.x - 8}
          y={rightLung.position.y - 42}
          width={36}
          height={90}
          fill="transparent"
        />
        <Path
          d={rightLung.main}
          fill={LAYER_COLORS.cardio}
          fillOpacity={lungFillOpacity}
          stroke={rightLungSelected ? ORGAN_STROKE_SELECTED : CARDIO_BLUE_LIGHT}
          strokeWidth={rightLungSelected ? 2 : 0.8}
          strokeLinejoin="round"
        />
      </G>

      {/* ── Heart (rendered above lungs) ───────────────────────────────── */}
      <G
        onPress={() => onOrganPress(CARDIO_REGION_IDS.heart)}
        accessible={true}
        accessibilityLabel={heartLabel}
        accessibilityRole="button"
      >
        {/* Transparent hit area */}
        <Rect
          x={heart.position.x - heart.size.width / 2 - 6}
          y={heart.position.y - heart.size.height / 2 - 6}
          width={heart.size.width + 12}
          height={heart.size.height + 12}
          fill="transparent"
        />

        {/* Aorta arch */}
        <Path
          d={heart.aorta}
          fill="none"
          stroke={CARDIO_BLUE_LIGHT}
          strokeWidth={2.5}
          strokeLinecap="round"
        />

        {/* Heart body — animated pulse */}
        <AnimatedPath
          d={heart.main}
          fill={LAYER_COLORS.cardio}
          animatedProps={heartAnimProps}
          stroke={heartSelected ? ORGAN_STROKE_SELECTED : CARDIO_BLUE_LIGHT}
          strokeWidth={heartSelected ? 2 : 1}
          strokeLinejoin="round"
        />
      </G>
    </G>
  );
}
