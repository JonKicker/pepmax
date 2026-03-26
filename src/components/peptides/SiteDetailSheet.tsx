import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { Colors } from '../../constants/theme';
import {
  BodyMapZone,
  SiteStats,
  SITE_STATUS_COLORS,
  daysSince,
} from '../../utils/siteRotation';
import { InjectionSite } from '../../types/peptide';

const SHEET_HEIGHT = 240;

type Props = {
  zone: BodyMapZone | null;
  stats: SiteStats | null;
  onSelect: (site: InjectionSite) => void;
  onClose: () => void;
};

const STATUS_LABELS: Record<string, string> = {
  ready: 'Ready',
  recent: 'Recent',
  needsRest: 'Needs Rest',
  never: 'Never Used',
};

export default function SiteDetailSheet({ zone, stats, onSelect, onClose }: Props) {
  const { colors } = useTheme();
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  // Freeze the last non-null zone/stats so content stays visible during the slide-out animation
  const lastZoneRef = useRef<BodyMapZone | null>(null);
  const lastStatsRef = useRef<SiteStats | null>(null);
  if (zone !== null) {
    lastZoneRef.current = zone;
    lastStatsRef.current = stats;
  }

  const isVisible = zone !== null;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: isVisible ? 0 : SHEET_HEIGHT,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start();
  }, [isVisible, translateY]);

  // Use frozen content during close animation; fallback gracefully on first render
  const displayZone = lastZoneRef.current;
  const displayStats = lastStatsRef.current;

  if (!displayZone) return null;

  const statusKey = displayStats?.lastUsed ? displayStats.status : 'never';
  const statusColor = SITE_STATUS_COLORS[statusKey];
  const statusLabel = STATUS_LABELS[statusKey] ?? 'Unknown';

  const lastUsedText = (() => {
    if (!displayStats?.lastUsed) return 'Never used';
    const days = daysSince(displayStats.lastUsed) ?? 0;
    const dateStr = displayStats.lastUsed.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    return `${dateStr} (${days} day${days !== 1 ? 's' : ''} ago)`;
  })();

  const handleSelect = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelect(displayZone.injectionSite);
  };

  return (
    <>
      {/* Invisible backdrop — only interactive when sheet is visible */}
      {isVisible && (
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
      )}

      <Animated.View
        style={[
          styles.sheet,
          { backgroundColor: colors.surface, transform: [{ translateY }] },
        ]}
      >
        {/* Drag handle */}
        <View style={[styles.handle, { backgroundColor: colors.border }]} />

        {/* Site name + status badge */}
        <View style={styles.header}>
          <Text style={[styles.siteName, { color: colors.textPrimary }]}>
            {displayZone.label}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>

        {/* Stats rows */}
        <View style={styles.statsBlock}>
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Last used</Text>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{lastUsedText}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total injections</Text>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {displayStats?.useCount ?? 0}
            </Text>
          </View>
        </View>

        {/* Select button */}
        <TouchableOpacity
          style={[styles.selectBtn, { backgroundColor: Colors.peptide }]}
          onPress={handleSelect}
          activeOpacity={0.7}
        >
          <Text style={styles.selectBtnText}>Select This Site</Text>
        </TouchableOpacity>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  siteName: {
    fontSize: 18,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
  },
  statsBlock: {
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  statLabel: {
    fontSize: 14,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '500',
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  selectBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  selectBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
