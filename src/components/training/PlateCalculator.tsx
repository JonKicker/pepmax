/**
 * PlateCalculator.tsx
 *
 * Renders an SVG barbell diagram showing which plates are loaded per side,
 * plus a text summary. Uses react-native-svg (already installed).
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Line, Text as SvgText, G } from 'react-native-svg';
import { useTheme } from '../../hooks/useTheme';
import { Colors } from '../../constants/theme';
import { computePlates } from '../../utils/plateCalculator';
import type { WeightUnit, BarType, PlateSet } from '../../types/warmUp';

// ─── Palette — plate colour by weight (lbs / kg mapped visually) ─────────────

const PLATE_COLORS: Record<number, string> = {
  // lbs
  45:   '#E53935', // red
  35:   '#1E88E5', // blue
  25:   '#FDD835', // yellow
  10:   '#43A047', // green
  5:    '#FFFFFF', // white
  2.5:  '#757575', // grey
  // kg-specific (some overlap is fine — colour is decorative)
  20:   '#E53935',
  15:   '#1E88E5',
  // 10, 5 already covered
  1.25: '#BDBDBD',
};

function plateColor(weight: number): string {
  return PLATE_COLORS[weight] ?? '#9C27B0';
}

// ─── SVG constants ────────────────────────────────────────────────────────────

const SVG_WIDTH  = 320;
const SVG_HEIGHT = 80;
const BAR_Y      = SVG_HEIGHT / 2;
const BAR_HEIGHT = 10;
const COLLAR_W   = 12;
const COLLAR_H   = 24;
const SLEEVE_Y   = BAR_Y - COLLAR_H / 2;
const CENTER_X   = SVG_WIDTH / 2;
// Half bar (collar to center, each side)
const HALF_BAR   = 100;

// Plate rendering constants
const MIN_PLATE_H  = 24;
const MAX_PLATE_H  = 60;
const BASE_PLATE_W = 12;
const PLATE_GAP    = 2;

// Maximum available width per side for plates (from collar outward)
const MAX_SLEEVE_PX = HALF_BAR - COLLAR_W; // 88 px

/**
 * Calculates the effective plate width so all plates fit within the sleeve.
 * If plates would overflow, we scale PLATE_W down proportionally.
 */
function effectivePlateWidth(totalPlateCount: number): number {
  if (totalPlateCount === 0) return BASE_PLATE_W;
  const needed = totalPlateCount * (BASE_PLATE_W + PLATE_GAP) - PLATE_GAP;
  if (needed <= MAX_SLEEVE_PX) return BASE_PLATE_W;
  // Scale down so everything fits; keep a minimum of 4px so plates stay visible
  return Math.max(4, Math.floor((MAX_SLEEVE_PX + PLATE_GAP) / totalPlateCount) - PLATE_GAP);
}

function plateHeight(weight: number, maxWeight: number): number {
  const ratio = weight / maxWeight;
  return MIN_PLATE_H + (MAX_PLATE_H - MIN_PLATE_H) * ratio;
}

interface BarProps {
  platesPerSide: PlateSet[];
  barColor: string;
  textColor: string;
}

function BarbellDiagram({ platesPerSide, barColor, textColor }: BarProps) {
  const maxWeight = platesPerSide.length > 0 ? platesPerSide[0].weight : 1;

  // Build plate slices for right side (from collar outward)
  // Each PlateSet has `count` plates of `weight`
  const slices: Array<{ weight: number; h: number; color: string }> = [];
  for (const ps of platesPerSide) {
    for (let i = 0; i < ps.count; i++) {
      slices.push({
        weight: ps.weight,
        h: plateHeight(ps.weight, maxWeight),
        color: plateColor(ps.weight),
      });
    }
  }

  // Scale plate width so all plates fit within the available sleeve
  const PLATE_W = effectivePlateWidth(slices.length);

  // Right side: start just outside the right collar
  const rightCollarX = CENTER_X + HALF_BAR;
  let rightX = rightCollarX + COLLAR_W;

  // Left side: mirror (plates go outward to the left)
  const leftCollarX  = CENTER_X - HALF_BAR - COLLAR_W;
  let leftX = leftCollarX;

  const rightPlates: React.ReactElement[] = [];
  const leftPlates:  React.ReactElement[] = [];

  slices.forEach((s, i) => {
    const plateY = BAR_Y - s.h / 2;

    // Right
    rightPlates.push(
      <Rect
        key={`r${i}`}
        x={rightX}
        y={plateY}
        width={PLATE_W}
        height={s.h}
        fill={s.color}
        stroke={barColor}
        strokeWidth={0.5}
        rx={2}
      />
    );
    rightX += PLATE_W + PLATE_GAP;

    // Left (mirror: plates stack leftward)
    leftX -= PLATE_W + PLATE_GAP;
    leftPlates.push(
      <Rect
        key={`l${i}`}
        x={leftX + PLATE_GAP}
        y={plateY}
        width={PLATE_W}
        height={s.h}
        fill={s.color}
        stroke={barColor}
        strokeWidth={0.5}
        rx={2}
      />
    );
  });

  return (
    <Svg width={SVG_WIDTH} height={SVG_HEIGHT}>
      {/* Bar shaft */}
      <Rect
        x={CENTER_X - HALF_BAR - COLLAR_W}
        y={BAR_Y - BAR_HEIGHT / 2}
        width={(HALF_BAR + COLLAR_W) * 2}
        height={BAR_HEIGHT}
        fill={barColor}
        rx={3}
      />

      {/* Left collar */}
      <Rect
        x={CENTER_X - HALF_BAR - COLLAR_W}
        y={SLEEVE_Y}
        width={COLLAR_W}
        height={COLLAR_H}
        fill={barColor}
        rx={2}
      />

      {/* Right collar */}
      <Rect
        x={CENTER_X + HALF_BAR}
        y={SLEEVE_Y}
        width={COLLAR_W}
        height={COLLAR_H}
        fill={barColor}
        rx={2}
      />

      {/* Plates */}
      <G>{leftPlates}</G>
      <G>{rightPlates}</G>

      {/* "per side" label in center */}
      <SvgText
        x={CENTER_X}
        y={BAR_Y + 1}
        textAnchor="middle"
        alignmentBaseline="middle"
        fontSize={9}
        fontWeight="700"
        fill="white"
      >
        per side
      </SvgText>
    </Svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface PlateCalculatorProps {
  totalWeight: number;
  unit: WeightUnit;
  barType: BarType;
}

export function PlateCalculator({ totalWeight, unit, barType }: PlateCalculatorProps) {
  const { colors, dark } = useTheme();
  const result = computePlates(totalWeight, unit, barType);

  if (result.platesPerSide.length === 0 && result.requested <= result.barWeight) {
    // Nothing to show — just bar weight or invalid
    return null;
  }

  const barColor = dark ? '#9E9E9E' : '#616161';

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.heading, { color: Colors.gym }]}>Plate Loading</Text>

      {/* SVG barbell */}
      <View style={styles.svgWrapper}>
        <BarbellDiagram
          platesPerSide={result.platesPerSide}
          barColor={barColor}
          textColor={colors.textPrimary}
        />
      </View>

      {/* Plate list */}
      {result.platesPerSide.length > 0 ? (
        <View style={styles.plateList}>
          {result.platesPerSide.map((ps) => (
            <View key={ps.weight} style={styles.plateRow}>
              <View style={[styles.colorDot, { backgroundColor: plateColor(ps.weight) }]} />
              <Text style={[styles.plateText, { color: colors.textPrimary }]}>
                {ps.weight} {unit} × {ps.count} per side
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={[styles.barOnly, { color: colors.textSecondary }]}>
          Bar only ({result.barWeight} {unit})
        </Text>
      )}

      {/* Weight summary */}
      <View style={[styles.summaryRow, { borderColor: colors.border }]}>
        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
          Bar: {result.barWeight} {unit}
        </Text>
        {result.isExact ? (
          <Text style={[styles.summaryTotal, { color: colors.textPrimary }]}>
            Total: {result.totalAchievable} {unit}
          </Text>
        ) : (
          <Text style={[styles.summaryApprox, { color: Colors.warning }]}>
            Closest: {result.totalAchievable} {unit} (requested {result.requested} {unit})
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 10,
    borderWidth: 1,
    marginVertical: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  heading: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  svgWrapper: {
    alignItems: 'center',
    marginVertical: 4,
    overflow: 'hidden',
  },
  plateList: {
    marginTop: 6,
    gap: 4,
  },
  plateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  plateText: {
    fontSize: 13,
    fontWeight: '500',
  },
  barOnly: {
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexWrap: 'wrap',
    gap: 4,
  },
  summaryLabel: {
    fontSize: 12,
  },
  summaryTotal: {
    fontSize: 13,
    fontWeight: '700',
  },
  summaryApprox: {
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
});
