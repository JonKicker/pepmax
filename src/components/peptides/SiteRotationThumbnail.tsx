import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import Svg, { Path, Ellipse, G } from 'react-native-svg';
import { useTheme } from '../../hooks/useTheme';
import { Colors } from '../../constants/theme';
import { getDoses } from '../../services/peptideService';
import {
  SiteStats,
  computeSiteStats,
  getSiteColor,
  getStatsForSite,
  SITE_STATUS_COLORS,
  BODY_MAP_ZONES,
} from '../../utils/siteRotation';

// Front-only zone positions scaled for a small thumbnail (viewBox 0 0 80 130)
const THUMBNAIL_ZONES = [
  { id: 'frontLeftDelt',   cx: 19, cy: 40, r: 6 },
  { id: 'frontRightDelt',  cx: 61, cy: 40, r: 6 },
  { id: 'frontLeftAbs',    cx: 29, cy: 68, r: 7 },
  { id: 'frontRightAbs',   cx: 51, cy: 68, r: 7 },
  { id: 'frontLeftThigh',  cx: 28, cy: 98, r: 6 },
  { id: 'frontRightThigh', cx: 52, cy: 98, r: 6 },
];

const THUMBNAIL_BODY_PATH = `
  M 40 4 C 34 4 30 8 30 14 C 30 20 34 24 40 24 C 46 24 50 20 50 14 C 50 8 46 4 40 4 Z
  M 40 24 C 36 25 32 27 28 30 L 20 33 C 17 34 15 37 15 40 L 15 70 L 17 70 L 17 80 L 18 80 L 18 70 L 62 70 L 62 80 L 63 80 L 63 70 L 65 70 L 65 40 C 65 37 63 34 60 33 L 52 30 C 48 27 44 25 40 24 Z
  M 20 80 L 20 115 L 30 115 L 30 97 L 50 97 L 50 115 L 60 115 L 60 80 Z
`;

type Props = {
  onPress: () => void;
};

export default function SiteRotationThumbnail({ onPress }: Props) {
  const { colors } = useTheme();
  const [siteStats, setSiteStats] = useState<SiteStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const result = await getDoses();
      if (result.data) {
        setSiteStats(computeSiteStats(result.data));
      }
      setLoading(false);
    })();
  }, []);

  const frontZones = BODY_MAP_ZONES.filter((z) => z.view === 'front');

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={Colors.peptide} size="small" />
      ) : (
        <Svg viewBox="0 0 80 130" width={60} height={90}>
          <Path
            d={THUMBNAIL_BODY_PATH}
            fill={colors.surface}
            stroke={colors.border}
            strokeWidth={1}
          />
          {THUMBNAIL_ZONES.map((geo) => {
            const zone = frontZones.find((z) => z.id === geo.id);
            if (!zone) return null;
            const stats = getStatsForSite(siteStats, zone.injectionSite);
            const fillColor = stats
              ? getSiteColor(stats.lastUsed, stats.status)
              : SITE_STATUS_COLORS.never;
            return (
              <G key={geo.id}>
                <Ellipse
                  cx={geo.cx}
                  cy={geo.cy}
                  rx={geo.r}
                  ry={geo.r}
                  fill={fillColor}
                  fillOpacity={0.85}
                />
              </G>
            );
          })}
        </Svg>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 68,
    height: 100,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
