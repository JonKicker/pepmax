/**
 * Measurement layer overlay — renders labeled measurement point circles
 * with values and trend arrows on the body SVG.
 *
 * Rendered as children of BodyHubSVG (inside the parent <Svg>).
 */
import React from 'react';
import { Circle, G, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../../hooks/useTheme';
import { MEASUREMENT_POINTS } from '../../constants/bodyHubPaths';
import { LAYER_COLORS } from '../../types/bodyHub';
import type { MeasurementPointData, MeasurementField } from '../../types/bodyHub';

type Props = {
  points: MeasurementPointData[];
  selectedPoint: string | null;
  onPointPress: (field: string) => void;
};

const TREND_ARROWS: Record<string, string> = {
  up: '↑',
  down: '↓',
  flat: '→',
  none: '',
};

const TREND_COLORS: Record<string, string> = {
  up: '#22C55E',
  down: '#EF4444',
  flat: '#9CA3AF',
  none: '#9CA3AF',
};

export default function MeasurementLayer({ points, selectedPoint, onPointPress }: Props) {
  const { colors, dark } = useTheme();
  const layerColor = LAYER_COLORS.measurements;

  return (
    <G>
      {MEASUREMENT_POINTS.map((mp) => {
        const data = points.find((p) => p.field === mp.field);
        const isSelected = selectedPoint === mp.field;
        const hasValue = data?.latestValue != null;

        const valueText = hasValue
          ? `${data!.latestValue!.toFixed(1)}`
          : '—';
        const trendArrow = data ? TREND_ARROWS[data.trend] : '';
        const trendColor = data ? TREND_COLORS[data.trend] : '#9CA3AF';

        // Build accessibility label from available data
        const trendText = data?.trend && data.trend !== 'none' ? `, trend ${data.trend}` : '';
        const valueA11y = hasValue
          ? `${mp.label}: ${data!.latestValue!.toFixed(1)} ${data!.unit}${trendText}`
          : `${mp.label}: no data`;

        return (
          // NOTE: accessible/accessibilityLabel on <G> is best-effort (iOS-only in rn-svg v15)
          <G
            key={mp.field}
            onPress={() => onPointPress(mp.field)}
            accessible={true}
            accessibilityLabel={valueA11y}
            accessibilityRole="button"
          >
            {/* Outer ring when selected */}
            {isSelected && (
              <Circle
                cx={mp.x}
                cy={mp.y}
                r={12}
                fill="transparent"
                stroke={layerColor}
                strokeWidth={1.5}
              />
            )}

            {/* Measurement dot */}
            <Circle
              cx={mp.x}
              cy={mp.y}
              r={hasValue ? 7 : 5}
              fill={hasValue ? layerColor : (dark ? '#555' : '#CCC')}
              fillOpacity={hasValue ? 0.85 : 0.5}
            />

            {/* Value label */}
            <SvgText
              x={mp.x + 14}
              y={mp.y - 4}
              fontSize={7}
              fontWeight="600"
              fill={colors.textPrimary}
              pointerEvents="none"
            >
              {valueText}
            </SvgText>

            {/* Trend arrow */}
            {trendArrow !== '' && (
              <SvgText
                x={mp.x + 14}
                y={mp.y + 7}
                fontSize={8}
                fontWeight="700"
                fill={trendColor}
                pointerEvents="none"
              >
                {trendArrow}
              </SvgText>
            )}

            {/* Field label (below dot) */}
            <SvgText
              x={mp.x}
              y={mp.y + 18}
              fontSize={6}
              fill={colors.textSecondary}
              textAnchor="middle"
              pointerEvents="none"
            >
              {mp.label}
            </SvgText>
          </G>
        );
      })}
    </G>
  );
}
