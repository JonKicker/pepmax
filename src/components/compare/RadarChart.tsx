/**
 * RadarChart — SVG radar chart for comparing two users' normalized fitness scores.
 *
 * Renders a pentagon (up to 5 axes) with:
 *   - Concentric grid polygons at 20% intervals
 *   - Two filled polygons (user vs opponent)
 *   - Axis labels with current score in parens
 *   - Animated entry (400ms ease-out)
 *   - Legend below the SVG
 *
 * Exported pure functions (filterAxes, getVertexPosition, buildPolygonPoints)
 * are tested directly in src/__tests__/radarChart.test.ts.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polygon, Line, Text as SvgText, G } from 'react-native-svg';
import { useTheme } from '../../hooks/useTheme';
import type { CompareScores } from '../../types/compare';

// ─── Axis configuration ───────────────────────────────────────────────────────

type AxisConfig = {
  key: keyof CompareScores;
  label: string;
};

const AXIS_CONFIG: AxisConfig[] = [
  { key: 'strengthScore',        label: 'Strength'    },
  { key: 'cardioScore',          label: 'Cardio'      },
  { key: 'nutritionConsistency', label: 'Nutrition'   },
  { key: 'overallConsistency',   label: 'Consistency' },
  { key: 'xpPercentile',         label: 'XP'          },
];

// ─── Pure utility functions (exported for tests) ──────────────────────────────

/**
 * Returns only axes where NEITHER user has a -1 sentinel value.
 * An axis with -1 on either side is excluded from the radar.
 *
 * A meaningful polygon requires at least 3 axes. If fewer than 3 axes
 * have data on both sides, an empty array is returned so the component
 * renders an empty state instead of a degenerate 1- or 2-vertex shape.
 */
export function filterAxes(
  userScores: CompareScores,
  opponentScores: CompareScores,
): AxisConfig[] {
  const valid = AXIS_CONFIG.filter(
    (axis) =>
      (userScores[axis.key] as number) !== -1 &&
      (opponentScores[axis.key] as number) !== -1,
  );
  // Fewer than 3 axes cannot form a polygon — treat as no data
  return valid.length >= 3 ? valid : [];
}

/**
 * Returns the {x, y} canvas position for a single radar vertex.
 *
 * @param score      0–100 value for this axis (clamped to [0, 100])
 * @param axisIndex  0-based index of the axis in the filtered set
 * @param totalAxes  total number of active axes
 * @param maxRadius  radius of the outermost grid ring, in SVG user units
 * @param centerX    x-coordinate of the radar center
 * @param centerY    y-coordinate of the radar center
 */
export function getVertexPosition(
  score: number,
  axisIndex: number,
  totalAxes: number,
  maxRadius: number,
  centerX: number,
  centerY: number,
): { x: number; y: number } {
  // Guard: degenerate polygon — return center point
  if (totalAxes <= 0) {
    return { x: centerX, y: centerY };
  }
  // Clamp score to valid range so out-of-bounds values don't produce
  // incorrect geometry (e.g. scores > 100 would exceed the outer ring)
  const clamped = Math.max(0, Math.min(100, score));
  const angleStep = (2 * Math.PI) / totalAxes;
  // Start from top (- PI/2) so axis-0 points straight up
  const angle = angleStep * axisIndex - Math.PI / 2;
  const radius = (clamped / 100) * maxRadius;
  return {
    x: centerX + radius * Math.cos(angle),
    y: centerY + radius * Math.sin(angle),
  };
}

/**
 * Builds the SVG `points` attribute string for a polygon that connects
 * all vertices derived from `scores` on the given `axes`.
 *
 * @returns e.g. "150,50 220,160 80,160" (space-separated x,y pairs)
 */
export function buildPolygonPoints(
  scores: CompareScores,
  axes: AxisConfig[],
  maxRadius: number,
  centerX: number,
  centerY: number,
): string {
  return axes
    .map((axis, i) => {
      const score = scores[axis.key] as number;
      const { x, y } = getVertexPosition(score, i, axes.length, maxRadius, centerX, centerY);
      return `${x},${y}`;
    })
    .join(' ');
}

// ─── Component props ──────────────────────────────────────────────────────────

type RadarChartProps = {
  userScores: CompareScores;
  opponentScores: CompareScores;
  userName: string;
  opponentName: string;
  size?: number;
};

// ─── Grid polygon helper ──────────────────────────────────────────────────────

/** Builds grid polygon points at a given fraction (0–1) of maxRadius. */
function buildGridPoints(
  fraction: number,
  axes: AxisConfig[],
  maxRadius: number,
  centerX: number,
  centerY: number,
): string {
  return axes
    .map((_, i) => {
      const angleStep = (2 * Math.PI) / axes.length;
      const angle = angleStep * i - Math.PI / 2;
      const r = fraction * maxRadius;
      return `${centerX + r * Math.cos(angle)},${centerY + r * Math.sin(angle)}`;
    })
    .join(' ');
}

// ─── Accessibility helper ────────────────────────────────────────────────────

/** Builds a descriptive accessibility label from axes and scores. */
export function buildRadarA11yLabel(
  axes: AxisConfig[],
  userScores: CompareScores,
  opponentScores: CompareScores,
): string {
  if (axes.length === 0) {
    return 'Radar chart unavailable, no shared score data';
  }
  const parts = axes.map((axis) => {
    const userVal = Math.round(userScores[axis.key] as number);
    const oppVal = Math.round(opponentScores[axis.key] as number);
    return `${axis.label}: You ${userVal}, Opponent ${oppVal}`;
  });
  return parts.join('. ');
}

// ─── Main component ───────────────────────────────────────────────────────────

const GRID_FRACTIONS = [0.2, 0.4, 0.6, 0.8, 1.0];
const LABEL_OFFSET = 18; // pixels beyond the outer ring

function RadarChartInner({
  userScores,
  opponentScores,
  userName,
  opponentName,
  size = 300,
}: RadarChartProps) {
  const { dark } = useTheme();

  // Animation progress 0 → 1
  const [progress, setProgress] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const DURATION_MS = 400;

  // NOTE (v1 accepted behavior): the animation re-triggers whenever
  // `userScores` or `opponentScores` change object reference, even if the
  // numeric values are identical. The parent component should memoize these
  // objects (e.g. with useMemo) if unnecessary re-animations are unwanted.
  useEffect(() => {
    startTimeRef.current = null;
    setProgress(0);

    function tick(now: number) {
      if (startTimeRef.current === null) {
        startTimeRef.current = now;
      }
      const elapsed = now - startTimeRef.current;
      const t = Math.min(elapsed / DURATION_MS, 1);
      // Cubic ease-out
      const eased = 1 - Math.pow(1 - t, 3);
      setProgress(eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [userScores, opponentScores]);

  const axes = filterAxes(userScores, opponentScores);

  // Colors
  const gridColor = dark ? '#374151' : '#E5E7EB';
  const labelColor = dark ? '#9CA3AF' : '#6B7280';
  const userFill = '#7C3AED';
  const opponentFill = '#2563EB';

  // Geometry
  const padding = 44; // room for labels around the outer ring
  const svgWidth = size;
  const svgHeight = size;
  const centerX = svgWidth / 2;
  const centerY = svgHeight / 2;
  const maxRadius = (Math.min(svgWidth, svgHeight) / 2) - padding;

  // Empty state: no axes have data
  if (axes.length === 0) {
    return (
      <View style={[styles.emptyContainer, { width: size, height: size }]}>
        <Text style={[styles.emptyText, { color: labelColor }]}>
          No shared score data available
        </Text>
      </View>
    );
  }

  // Animated polygon points (scores scaled by progress for ease-in reveal)
  function animatedPolygonPoints(scores: CompareScores): string {
    return axes
      .map((axis, i) => {
        const rawScore = scores[axis.key] as number;
        const animatedScore = rawScore * progress;
        const { x, y } = getVertexPosition(animatedScore, i, axes.length, maxRadius, centerX, centerY);
        return `${x},${y}`;
      })
      .join(' ');
  }

  // Label positions at 100% radius + LABEL_OFFSET
  function getLabelPosition(axisIndex: number): { x: number; y: number } {
    const angleStep = (2 * Math.PI) / axes.length;
    const angle = angleStep * axisIndex - Math.PI / 2;
    return {
      x: centerX + (maxRadius + LABEL_OFFSET) * Math.cos(angle),
      y: centerY + (maxRadius + LABEL_OFFSET) * Math.sin(angle),
    };
  }

  // Outer-ring vertex positions (for axis lines)
  function getOuterVertex(axisIndex: number): { x: number; y: number } {
    const angleStep = (2 * Math.PI) / axes.length;
    const angle = angleStep * axisIndex - Math.PI / 2;
    return {
      x: centerX + maxRadius * Math.cos(angle),
      y: centerY + maxRadius * Math.sin(angle),
    };
  }

  const a11yLabel = buildRadarA11yLabel(axes, userScores, opponentScores);

  return (
    <View
      style={styles.wrapper}
      accessible={true}
      accessibilityRole="image"
      accessibilityLabel={a11yLabel}
    >
      <Svg width={svgWidth} height={svgHeight}>
        <G>
          {/* ── Concentric grid polygons ── */}
          {GRID_FRACTIONS.map((frac) => (
            <Polygon
              key={`grid-${frac}`}
              points={buildGridPoints(frac, axes, maxRadius, centerX, centerY)}
              fill="none"
              stroke={gridColor}
              strokeWidth={1}
            />
          ))}

          {/* ── Axis lines from center to outer vertex ── */}
          {axes.map((_, i) => {
            const outer = getOuterVertex(i);
            return (
              <Line
                key={`axis-${i}`}
                x1={centerX}
                y1={centerY}
                x2={outer.x}
                y2={outer.y}
                stroke={gridColor}
                strokeWidth={1}
              />
            );
          })}

          {/* ── Opponent polygon ── */}
          <Polygon
            points={animatedPolygonPoints(opponentScores)}
            fill={opponentFill}
            fillOpacity={0.2}
            stroke={opponentFill}
            strokeOpacity={0.8}
            strokeWidth={2}
          />

          {/* ── User polygon (rendered on top) ── */}
          <Polygon
            points={animatedPolygonPoints(userScores)}
            fill={userFill}
            fillOpacity={0.2}
            stroke={userFill}
            strokeOpacity={0.8}
            strokeWidth={2}
          />

          {/* ── Axis labels with score in parens ── */}
          {axes.map((axis, i) => {
            const { x, y } = getLabelPosition(i);
            const userScore = userScores[axis.key] as number;
            const labelText = `${axis.label} (${Math.round(userScore)})`;
            // Anchor based on horizontal position relative to center
            const dx = x - centerX;
            const anchor = dx > 5 ? 'start' : dx < -5 ? 'end' : 'middle';
            // Vertical offset: if label is above center, shift up
            const dy = y < centerY - 5 ? -4 : y > centerY + 5 ? 12 : 4;
            return (
              <SvgText
                key={`label-${axis.key}`}
                x={x}
                y={y + dy}
                fontSize={11}
                fill={labelColor}
                textAnchor={anchor}
              >
                {labelText}
              </SvgText>
            );
          })}
        </G>
      </Svg>

      {/* ── Legend ── */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: userFill }]} />
          <Text style={[styles.legendLabel, { color: labelColor }]}>{userName}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: opponentFill }]} />
          <Text style={[styles.legendLabel, { color: labelColor }]}>{opponentName}</Text>
        </View>
      </View>
    </View>
  );
}

const RadarChart = React.memo(RadarChartInner);
export default RadarChart;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  legend: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
});
