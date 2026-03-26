import React from 'react';
import Svg, { Path, Ellipse, G, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../../hooks/useTheme';
import { Colors } from '../../constants/theme';
import {
  BodyMapZone,
  SiteStats,
  BODY_MAP_ZONES,
  getSiteColor,
  getStatsForSite,
  SITE_STATUS_COLORS,
} from '../../utils/siteRotation';
// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  view: 'front' | 'back';
  siteStats: SiteStats[];
  selectedZone: string | null;
  onZonePress: (zone: BodyMapZone) => void;
};

// ─── Zone geometry ────────────────────────────────────────────────────────────
// ViewBox: 0 0 200 420 — portrait body proportions
// Coordinates are centered on x=100

type ZoneGeometry = {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
};

const FRONT_ZONE_GEOMETRY: Partial<Record<string, ZoneGeometry>> = {
  frontLeftDelt:   { cx: 62,  cy: 130, rx: 16, ry: 14 },
  frontRightDelt:  { cx: 138, cy: 130, rx: 16, ry: 14 },
  frontLeftAbs:    { cx: 83,  cy: 215, rx: 17, ry: 20 },
  frontRightAbs:   { cx: 117, cy: 215, rx: 17, ry: 20 },
  frontLeftThigh:  { cx: 82,  cy: 305, rx: 16, ry: 22 },
  frontRightThigh: { cx: 118, cy: 305, rx: 16, ry: 22 },
};

const BACK_ZONE_GEOMETRY: Partial<Record<string, ZoneGeometry>> = {
  backLeftGlute:   { cx: 83,  cy: 230, rx: 22, ry: 22 },
  backRightGlute:  { cx: 117, cy: 230, rx: 22, ry: 22 },
  backLeftThigh:   { cx: 82,  cy: 310, rx: 16, ry: 22 },
  backRightThigh:  { cx: 118, cy: 310, rx: 16, ry: 22 },
};

// ─── Body outline paths ───────────────────────────────────────────────────────
// Simplified gender-neutral body silhouette paths for front and back views.
// Each path is a rough anatomical outline — head, neck, torso, arms, legs.

const BODY_FRONT_PATH = `
  M 100 20
  C 87 20 80 28 80 38
  C 80 48 87 56 100 56
  C 113 56 120 48 120 38
  C 120 28 113 20 100 20 Z

  M 100 56
  C 92 58 84 62 78 70
  L 62 75
  C 56 77 52 82 52 88
  L 52 155
  C 52 161 56 165 60 165
  L 65 165
  L 65 200
  C 65 204 68 207 72 207
  L 74 207
  L 74 165
  L 126 165
  L 126 207
  L 128 207
  C 132 207 135 204 135 200
  L 135 165
  L 140 165
  C 144 165 148 161 148 155
  L 148 88
  C 148 82 144 77 138 75
  L 122 70
  C 116 62 108 58 100 56 Z

  M 78 207
  C 76 207 73 209 72 212
  L 72 340
  C 72 344 74 347 78 347
  L 92 347
  C 96 347 98 344 98 340
  L 98 280
  L 102 280
  L 102 340
  C 102 344 104 347 108 347
  L 122 347
  C 126 347 128 344 128 340
  L 128 212
  C 127 209 124 207 122 207
  L 78 207 Z
`;

const BODY_BACK_PATH = `
  M 100 20
  C 87 20 80 28 80 38
  C 80 48 87 56 100 56
  C 113 56 120 48 120 38
  C 120 28 113 20 100 20 Z

  M 100 56
  C 92 58 84 62 78 70
  L 62 75
  C 56 77 52 82 52 88
  L 52 155
  C 52 161 56 165 60 165
  L 65 165
  L 65 200
  C 65 204 68 207 72 207
  L 74 207
  L 74 165
  L 126 165
  L 126 207
  L 128 207
  C 132 207 135 204 135 200
  L 135 165
  L 140 165
  C 144 165 148 161 148 155
  L 148 88
  C 148 82 144 77 138 75
  L 122 70
  C 116 62 108 58 100 56 Z

  M 78 207
  C 76 207 73 209 72 212
  L 72 340
  C 72 344 74 347 78 347
  L 92 347
  C 96 347 98 344 98 340
  L 98 280
  L 102 280
  L 102 340
  C 102 344 104 347 108 347
  L 122 347
  C 126 347 128 344 128 340
  L 128 212
  C 127 209 124 207 122 207
  L 78 207 Z
`;

// ─── Component ────────────────────────────────────────────────────────────────

export default function BodyMapSVG({ view, siteStats, selectedZone, onZonePress }: Props) {
  const { colors } = useTheme();

  const zones = BODY_MAP_ZONES.filter((z) => z.view === view);
  const geometryMap = view === 'front' ? FRONT_ZONE_GEOMETRY : BACK_ZONE_GEOMETRY;
  const bodyPath = view === 'front' ? BODY_FRONT_PATH : BODY_BACK_PATH;

  return (
    <Svg viewBox="0 0 200 380" width="100%" height="100%">
      {/* Body outline — stroke only */}
      <Path
        d={bodyPath}
        fill={colors.surface}
        stroke={colors.border}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />

      {/* Injection zones */}
      {zones.map((zone) => {
        const geo = geometryMap[zone.id];
        if (!geo) return null;

        const stats = getStatsForSite(siteStats, zone.injectionSite);
        const fillColor = stats
          ? getSiteColor(stats.lastUsed, stats.status)
          : SITE_STATUS_COLORS.never;
        const isSelected = selectedZone === zone.id;

        return (
          <G key={zone.id} onPress={() => onZonePress(zone)}>
            <Ellipse
              cx={geo.cx}
              cy={geo.cy}
              rx={geo.rx}
              ry={geo.ry}
              fill={fillColor}
              fillOpacity={0.75}
              stroke={isSelected ? Colors.peptide : 'transparent'}
              strokeWidth={isSelected ? 2.5 : 0}
            />
          </G>
        );
      })}

      {/* Zone labels */}
      {zones.map((zone) => {
        const geo = geometryMap[zone.id];
        if (!geo) return null;

        // Short label for the tiny SVG space
        const shortLabel = zone.label
          .replace('Left ', 'L ')
          .replace('Right ', 'R ');

        return (
          <SvgText
            key={`label-${zone.id}`}
            x={geo.cx}
            y={geo.cy + geo.ry + 11}
            fontSize={7.5}
            fill={colors.textSecondary}
            textAnchor="middle"
            pointerEvents="none"
          >
            {shortLabel}
          </SvgText>
        );
      })}
    </Svg>
  );
}
