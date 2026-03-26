import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { Colors } from '../../constants/theme';
import { getDoses } from '../../services/peptideService';
import {
  SiteStats,
  BodyMapZone,
  computeSiteStats,
  suggestNextSite,
  SITE_STATUS_COLORS,
} from '../../utils/siteRotation';
import { InjectionSite } from '../../types/peptide';
import BodyMapSVG from './BodyMapSVG';
import SiteDetailSheet from './SiteDetailSheet';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSiteSelected: (site: InjectionSite) => void;
  currentSite?: InjectionSite | null;
};

export default function InjectionSiteMap({ visible, onClose, onSiteSelected, currentSite }: Props) {
  const { colors } = useTheme();
  const [view, setView] = useState<'front' | 'back'>('front');
  const [siteStats, setSiteStats] = useState<SiteStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedZone, setSelectedZone] = useState<BodyMapZone | null>(null);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getDoses();
      if (result.data) {
        setSiteStats(computeSiteStats(result.data));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      setSelectedZone(null);
      loadStats();
    }
  }, [visible, loadStats]);

  const suggestion = siteStats.length > 0 ? suggestNextSite(siteStats) : null;

  const handleZonePress = (zone: BodyMapZone) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedZone(zone);
  };

  const handleSiteSelected = (site: InjectionSite) => {
    setSelectedZone(null);
    onSiteSelected(site);
    onClose();
  };

  const handleSuggestionSelect = () => {
    if (!suggestion) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSiteSelected(suggestion.site);
    onClose();
  };

  const selectedStats = selectedZone
    ? siteStats.find((s) => s.site === selectedZone.injectionSite) ?? null
    : null;

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Injection Site Map</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={Colors.peptide} size="large" />
            </View>
          ) : (
            <>
              {/* Suggestion banner */}
              {suggestion && (
                <View style={[styles.suggestionBanner, { backgroundColor: Colors.peptide + '12', borderColor: Colors.peptide + '30' }]}>
                  <View style={styles.suggestionLeft}>
                    <Ionicons name="checkmark-circle-outline" size={18} color={Colors.peptide} />
                    <View style={styles.suggestionText}>
                      <Text style={[styles.suggestionLabel, { color: colors.textSecondary }]}>Suggested</Text>
                      <Text style={[styles.suggestionSite, { color: colors.textPrimary }]}>
                        {suggestion.label}
                        {suggestion.daysSinceUse !== null
                          ? ` · rested ${suggestion.daysSinceUse} day${suggestion.daysSinceUse !== 1 ? 's' : ''}`
                          : ' · never used'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[styles.useBtn, { backgroundColor: Colors.peptide }]}
                    onPress={handleSuggestionSelect}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.useBtnText}>Use</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Front / Back toggle */}
              <View style={[styles.toggle, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {(['front', 'back'] as const).map((v) => (
                  <TouchableOpacity
                    key={v}
                    style={[
                      styles.toggleBtn,
                      v === view && { backgroundColor: Colors.peptide },
                    ]}
                    onPress={() => {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setView(v);
                      setSelectedZone(null);
                    }}
                  >
                    <Text
                      style={[
                        styles.toggleBtnText,
                        { color: v === view ? 'white' : colors.textSecondary },
                      ]}
                    >
                      {v === 'front' ? 'Front' : 'Back'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Legend */}
              <View style={styles.legend}>
                {[
                  { key: 'never', label: 'Never used' },
                  { key: 'ready', label: 'Ready (7+ days)' },
                  { key: 'recent', label: 'Recent (3-6 days)' },
                  { key: 'needsRest', label: 'Rest (0-2 days)' },
                ].map(({ key, label }) => (
                  <View key={key} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: SITE_STATUS_COLORS[key as keyof typeof SITE_STATUS_COLORS] }]} />
                    <Text style={[styles.legendText, { color: colors.textSecondary }]}>{label}</Text>
                  </View>
                ))}
              </View>

              {/* SVG Body Map */}
              <View style={styles.svgContainer}>
                <BodyMapSVG
                  view={view}
                  siteStats={siteStats}
                  selectedZone={selectedZone?.id ?? null}
                  onZonePress={handleZonePress}
                />
              </View>
            </>
          )}

          {/* Site detail sheet — overlays the bottom of the modal */}
          <SiteDetailSheet
            zone={selectedZone}
            stats={selectedStats}
            onSelect={handleSiteSelected}
            onClose={() => setSelectedZone(null)}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    flex: 1,
    marginTop: 60,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  suggestionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  suggestionText: {
    flex: 1,
  },
  suggestionLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  suggestionSite: {
    fontSize: 14,
    fontWeight: '500',
  },
  useBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    marginLeft: 12,
  },
  useBtnText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  toggle: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    padding: 3,
    alignSelf: 'center',
    width: 200,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 16,
    marginTop: 12,
    gap: 8,
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
  },
  svgContainer: {
    flex: 1,
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 0,
  },
});
