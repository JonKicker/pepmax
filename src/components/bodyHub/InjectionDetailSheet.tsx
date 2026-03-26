/**
 * Bottom sheet content for a tapped injection zone.
 * Shows: site name, status badge, last used, total injections, last compound, action button.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { LAYER_COLORS } from '../../types/bodyHub';
import { SITE_STATUS_COLORS, daysSince, type SiteStats } from '../../utils/siteRotation';

type Props = {
  stats: SiteStats | null;
  zoneName: string;
  onClose: () => void;
};

const STATUS_LABELS: Record<string, string> = {
  ready: 'Ready',
  recent: 'Recent',
  needsRest: 'Needs Rest',
};

export default function InjectionDetailSheet({ stats, zoneName, onClose }: Props) {
  const { colors } = useTheme();
  const router = useRouter();

  if (!stats && !zoneName) return null;

  const statusKey = stats?.lastUsed ? stats.status : 'never';
  const statusColor = SITE_STATUS_COLORS[statusKey] ?? '#D1D5DB';
  const statusLabel = STATUS_LABELS[statusKey] ?? 'Never Used';

  const lastUsedText = (() => {
    if (!stats?.lastUsed) return 'Never used';
    const days = daysSince(stats.lastUsed) ?? 0;
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  })();

  const handleSelect = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onClose();
    router.push('/(tabs)/peptides/log-dose' as any);
  };

  const layerColor = LAYER_COLORS.injections;

  return (
    <View>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.siteName, { color: colors.textPrimary }]}>{zoneName}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsBlock}>
        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Last used</Text>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>{lastUsedText}</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total injections</Text>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {stats?.useCount ?? 0}
          </Text>
        </View>
      </View>

      {/* Action Button */}
      <TouchableOpacity
        style={[styles.actionBtn, { backgroundColor: layerColor }]}
        onPress={handleSelect}
        activeOpacity={0.7}
      >
        <Ionicons name="eyedrop-outline" size={18} color="#FFFFFF" />
        <Text style={styles.actionBtnText}>Log Injection Here</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  siteName: {
    fontSize: 20,
    fontWeight: '700',
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
    marginBottom: 20,
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
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
