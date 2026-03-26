import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path, G, Defs, RadialGradient, Stop } from 'react-native-svg';
import { useTheme } from '../../hooks/useTheme';
import {
  getBodyPaths,
  MUSCLE_DETAIL_LINES,
} from '../../constants/bodyHubPaths';
import type { BodyHubLayer, BodyView } from '../../types/bodyHub';

// ─── Types ──────────────────────────────────────────────────────────────────

type RegionColors = Record<string, { fill: string; fillOpacity: number }>;

type Props = {
  view: BodyView;
  activeLayer: BodyHubLayer;
  regionColors: RegionColors;
  onRegionPress: (regionId: string) => void;
  selectedRegion: string | null;
  children?: React.ReactNode; // Layer-specific overlays (organs, measurements)
  /**
   * Accessibility: callback returning a human-readable label for a muscle region.
   * NOTE: accessibilityLabel on SVG <G> elements is best-effort — works on iOS in
   * most cases but is not guaranteed on Android with react-native-svg v15.
   */
  getRegionLabel?: (regionId: string) => string;
  /** User sex — selects the correct body model silhouette and muscle paths. Defaults to 'male'. */
  sex?: 'male' | 'female';
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function BodyHubSVG({
  view,
  activeLayer,
  regionColors,
  onRegionPress,
  selectedRegion,
  children,
  getRegionLabel,
  sex = 'male',
}: Props) {
  const { colors, dark } = useTheme();

  const bodyPaths = getBodyPaths(sex);
  const outlinePath = view === 'front' ? bodyPaths.frontOutline : bodyPaths.backOutline;
  const musclePaths = view === 'front' ? bodyPaths.frontMuscles : bodyPaths.backMuscles;

  // Only show muscle/cardio region paths for muscles and cardio layers
  const showRegionPaths = activeLayer === 'muscles' || activeLayer === 'cardio';

  return (
    <View style={styles.container}>
      <Svg viewBox="0 0 300 600" width="100%" height="100%" style={styles.svg}>
        {/* Gradient definitions for highlighted regions */}
        {showRegionPaths && (
          <Defs>
            {Object.entries(musclePaths).map(([regionId]) => {
              const color = regionColors[regionId];
              if (!color || color.fillOpacity < 0.1) return null;
              return (
                <RadialGradient
                  key={`grad-${regionId}`}
                  id={`grad-${regionId}`}
                  cx="50%"
                  cy="50%"
                  r="65%"
                >
                  <Stop offset="0%" stopColor={color.fill} stopOpacity={color.fillOpacity} />
                  <Stop offset="100%" stopColor={color.fill} stopOpacity={color.fillOpacity * 0.3} />
                </RadialGradient>
              );
            })}
          </Defs>
        )}

        {/* Layer 1: Body outline silhouette — always visible */}
        <Path
          d={outlinePath}
          fill={colors.surface}
          stroke={dark ? '#AAAAAA' : '#555555'}
          strokeWidth={1.2}
          strokeLinejoin="round"
        />

        {/* Layer 2: Muscle definition lines — subtle anatomy detail */}
        <G opacity={0.2}>
          {MUSCLE_DETAIL_LINES
            .filter(line =>
              (line.sex === sex || line.sex === 'both') &&
              (line.view === view || line.view === 'both')
            )
            .map((line, i) => (
              <Path
                key={`detail-${i}`}
                d={line.d}
                fill="none"
                stroke={dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.35)'}
                strokeWidth={0.6}
                strokeLinecap="round"
              />
            ))}
        </G>

        {/* Layer 3: Region fills (muscle/cardio colors) */}
        {showRegionPaths && (
          <G>
            {Object.entries(musclePaths).map(([regionId, pathData]) => {
              const color = regionColors[regionId];
              if (!color) return null;

              const isSelected = selectedRegion === regionId;
              const isHighlighted = color.fillOpacity >= 0.1;
              const regionLabel = getRegionLabel ? getRegionLabel(regionId) : regionId;

              return (
                // NOTE: accessible/accessibilityLabel on <G> is best-effort (iOS-only in rn-svg v15)
                <G
                  key={regionId}
                  onPress={() => onRegionPress(regionId)}
                  accessible={true}
                  accessibilityLabel={regionLabel}
                  accessibilityRole="button"
                >
                  <Path
                    d={pathData}
                    fill={isHighlighted ? `url(#grad-${regionId})` : '#2a3a4a'}
                    fillOpacity={isHighlighted ? 1 : 0.4}
                    stroke={isSelected ? '#FFFFFF' : 'transparent'}
                    strokeWidth={isSelected ? 1.5 : 0}
                    strokeLinejoin="round"
                  />
                </G>
              );
            })}
          </G>
        )}

        {/* Layer 4-6: Layer-specific overlays (organs, measurements, injection zones) */}
        {children}
      </Svg>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    maxHeight: '100%',
  },
});
