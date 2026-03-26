/**
 * Injection layer overlay — renders colored ellipse zones on the body SVG.
 * Includes a pulsing glow animation on the suggested next injection site.
 *
 * Rendered as children of BodyHubSVG (inside the parent <Svg>).
 */
import React, { useEffect } from 'react';
import { Ellipse, G, Text as SvgText } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../../hooks/useTheme';
import { Colors } from '../../constants/theme';
import {
  INJECTION_FRONT_ZONES,
  INJECTION_BACK_ZONES,
} from '../../constants/bodyHubPaths';
import { BODY_MAP_ZONES } from '../../utils/siteRotation';
import type { SiteStats } from '../../utils/siteRotation';

const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

type Props = {
  view: 'front' | 'back';
  getColorForZone: (zoneId: string) => { fill: string; fillOpacity: number };
  suggestedZoneId: string | null;
  selectedZone: string | null;
  onZonePress: (zoneId: string) => void;
  /**
   * Accessibility: callback returning a human-readable label for a zone.
   * NOTE: accessibilityLabel on SVG <G> is best-effort (iOS-only in rn-svg v15).
   */
  getZoneLabel?: (zoneId: string) => string;
};

export default function InjectionLayer({
  view,
  getColorForZone,
  suggestedZoneId,
  selectedZone,
  onZonePress,
  getZoneLabel,
}: Props) {
  const { colors } = useTheme();
  const zones = view === 'front' ? INJECTION_FRONT_ZONES : INJECTION_BACK_ZONES;

  // Pulsing glow for suggested site
  const glowOpacity = useSharedValue(0.1);

  useEffect(() => {
    if (suggestedZoneId) {
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.1, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    } else {
      glowOpacity.value = 0;
    }
  }, [suggestedZoneId, glowOpacity]);

  const glowAnimProps = useAnimatedProps(() => ({
    fillOpacity: glowOpacity.value,
  }));

  return (
    <G>
      {Object.entries(zones).map(([zoneId, geo]) => {
        const color = getColorForZone(zoneId);
        const isSelected = selectedZone === zoneId;
        const isSuggested = suggestedZoneId === zoneId;

        // Find label from BODY_MAP_ZONES
        const zoneInfo = BODY_MAP_ZONES.find((z) => z.id === zoneId);
        const label = zoneInfo?.label.replace('Left ', 'L ').replace('Right ', 'R ') ?? '';

        const zoneLabel = getZoneLabel ? getZoneLabel(zoneId) : (zoneInfo?.label ?? zoneId);

        return (
          // NOTE: accessible/accessibilityLabel on <G> is best-effort (iOS-only in rn-svg v15)
          <G
            key={zoneId}
            onPress={() => onZonePress(zoneId)}
            accessible={true}
            accessibilityLabel={zoneLabel}
            accessibilityRole="button"
          >
            {/* Glow ring for suggested site */}
            {isSuggested && (
              <AnimatedEllipse
                cx={geo.cx}
                cy={geo.cy}
                rx={geo.rx + 4}
                ry={geo.ry + 4}
                fill={color.fill}
                animatedProps={glowAnimProps}
              />
            )}

            {/* Zone ellipse */}
            <Ellipse
              cx={geo.cx}
              cy={geo.cy}
              rx={geo.rx}
              ry={geo.ry}
              fill={color.fill}
              fillOpacity={color.fillOpacity}
              stroke={isSelected ? Colors.peptide : 'transparent'}
              strokeWidth={isSelected ? 2.5 : 0}
            />

            {/* Zone label */}
            <SvgText
              x={geo.cx}
              y={geo.cy + geo.ry + 12}
              fontSize={8}
              fill={colors.textSecondary}
              textAnchor="middle"
              pointerEvents="none"
            >
              {label}
            </SvgText>
          </G>
        );
      })}
    </G>
  );
}
