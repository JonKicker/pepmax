/**
 * Share Preview screen — lets the user toggle modules before sharing
 * their Compare card.
 *
 * Route params (all strings — Expo Router limitation):
 *   myName, opponentName, opponentAvatar (optional)
 *   myScoresJson, opponentScoresJson — JSON-stringified CompareScores
 *   units — 'metric' | 'imperial' (default 'metric')
 *
 * Analytics:
 *   COMPARE_CARD_CUSTOMIZED — fired on any toggle change
 *   COMPARE_CARD_SHARED     — fired on successful share
 */
import React, { useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import ViewShot from 'react-native-view-shot';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../../src/hooks/useTheme';
import { analytics, AnalyticsEvent } from '../../../src/services/analytics';
import { captureAndShare } from '../../../src/services/cardGenerator';
import { ShareCardGenerator } from '../../../src/components/compare/ShareCardGenerator';
import { STAT_DEFINITIONS } from '../../../src/utils/shareCardStats';
import type { CompareCardData } from '../../../src/types/shareCard';
import type { CompareScores } from '../../../src/types/compare';
import type { Units } from '../../../src/types/profile';

// ─── Sentinel fallback for malformed JSON ─────────────────────────────────────

/**
 * Used as the fallback when JSON.parse fails on route params.
 * Every numeric field is -1 so all sentinel checks (`!== -1`) correctly
 * treat the value as unavailable and no stats will render.
 */
const SENTINEL_SCORES: CompareScores = {
  estimatedOneRepMax: -1,
  weeklyVolume: -1,
  weeklyDistance: -1,
  avgPace: -1,
  avgDailyCalories: -1,
  avgRecoveryScore: -1,
  bodyWeightTrend: -1,
  activePeptideCount: -1,
  strengthScore: -1,
  cardioScore: -1,
  nutritionConsistency: -1,
  overallConsistency: -1,
  xpPercentile: -1,
  computedAt: null as any, // eslint-disable-line @typescript-eslint/no-explicit-any
  updatedAt: null as any,  // eslint-disable-line @typescript-eslint/no-explicit-any
};

// ─── Module display labels ────────────────────────────────────────────────────

const MODULE_LABELS: Record<string, string> = {
  gym: 'Gym',
  cardio: 'Cardio',
  nutrition: 'Nutrition',
  recovery: 'Recovery',
  body: 'Body',
  peptides: 'Peptides',
  crossModule: 'Cross-Module',
};

// All module keys in display order
const ALL_MODULES = ['gym', 'cardio', 'nutrition', 'recovery', 'body', 'peptides', 'crossModule'];

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function SharePreviewScreen() {
  const { myName, opponentName, opponentAvatar, myScoresJson, opponentScoresJson, units: unitsParam } =
    useLocalSearchParams<{
      myName: string;
      opponentName: string;
      opponentAvatar?: string;
      myScoresJson: string;
      opponentScoresJson: string;
      units?: string;
    }>();

  const units: Units = (unitsParam === 'imperial' || unitsParam === 'metric') ? unitsParam : 'metric';

  const router = useRouter();
  const { colors } = useTheme();
  const viewShotRef = useRef<ViewShot>(null);
  const [sharing, setSharing] = useState(false);

  // Parse scores from JSON route params
  const myScores = useMemo<CompareScores>(() => {
    try {
      return JSON.parse(myScoresJson ?? '{}') as CompareScores;
    } catch {
      return SENTINEL_SCORES;
    }
  }, [myScoresJson]);

  const opponentScores = useMemo<CompareScores>(() => {
    try {
      return JSON.parse(opponentScoresJson ?? '{}') as CompareScores;
    } catch {
      return SENTINEL_SCORES;
    }
  }, [opponentScoresJson]);

  // Determine which modules have at least one stat with both users non-sentinel
  const availableModules = useMemo(() => {
    return ALL_MODULES.filter((mod) =>
      STAT_DEFINITIONS.some((def) => {
        if (def.module !== mod) return false;
        const myVal = (myScores as Record<string, unknown>)[def.field] as number | undefined;
        const oppVal = (opponentScores as Record<string, unknown>)[def.field] as number | undefined;
        return myVal !== undefined && myVal !== -1 && oppVal !== undefined && oppVal !== -1;
      }),
    );
  }, [myScores, opponentScores]);

  // Toggle state — all available modules ON by default, except peptides (sensitive data)
  const [moduleToggles, setModuleToggles] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const mod of availableModules) {
      initial[mod] = mod !== 'peptides';
    }
    return initial;
  });

  const visibleModules = useMemo(
    () => availableModules.filter((mod) => moduleToggles[mod]),
    [availableModules, moduleToggles],
  );

  // Build card data from current toggle state
  const cardData: CompareCardData = useMemo(
    () => ({
      type: 'compare',
      myName: myName ?? 'You',
      opponentName: opponentName ?? 'Opponent',
      opponentAvatar: opponentAvatar ?? undefined,
      myScores,
      opponentScores,
      visibleModules,
      units,
    }),
    [myName, opponentName, opponentAvatar, myScores, opponentScores, visibleModules, units],
  );

  // Toggle handler
  function handleToggle(mod: string, value: boolean) {
    setModuleToggles((prev) => ({ ...prev, [mod]: value }));
    analytics.track(AnalyticsEvent.COMPARE_CARD_CUSTOMIZED, {
      module: mod,
      enabled: value,
    });
  }

  // Share flow
  async function handleShare() {
    if (sharing) return; // double-tap guard
    setSharing(true);
    try {
      const result = await captureAndShare(
        viewShotRef as React.RefObject<{ capture: () => Promise<string> }>,
        cardData,
      );
      if (result.error) {
        Alert.alert('Could not share', 'Please try again.');
        return;
      }
      analytics.track(AnalyticsEvent.COMPARE_CARD_SHARED, {
        visibleModuleCount: visibleModules.length,
      });
      router.back();
    } finally {
      setSharing(false);
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Card preview (scaled) ── */}
        <View style={styles.previewContainer}>
          <View style={styles.scaledCardWrapper}>
            <ShareCardGenerator data={cardData} />
          </View>
        </View>

        {/* ── Customize section ── */}
        {availableModules.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
              CUSTOMIZE
            </Text>
            {availableModules.map((mod, idx) => (
              <View
                key={mod}
                style={[
                  styles.toggleRow,
                  idx < availableModules.length - 1 && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>
                  {MODULE_LABELS[mod] ?? mod}
                </Text>
                <Switch
                  value={moduleToggles[mod] ?? false}
                  onValueChange={(val) => handleToggle(mod, val)}
                  trackColor={{ false: colors.border, true: '#7C3AED' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            ))}
          </View>
        )}

        {/* ── Bottom buttons ── */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.shareButton}
            onPress={handleShare}
            disabled={sharing}
            activeOpacity={0.7}
          >
            {sharing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.shareButtonText}>Share</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: colors.textSecondary }]}
            onPress={() => router.back()}
            disabled={sharing}
            activeOpacity={0.7}
          >
            <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Off-screen ViewShot (height:0 overflow:hidden pattern) ── */}
      <View style={styles.offScreenWrapper}>
        <ViewShot
          ref={viewShotRef}
          options={{ format: 'png', quality: 1, width: 1080, height: 1920 }}
        >
          <ShareCardGenerator data={cardData} />
        </ViewShot>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

// Card is 360x640; preview scale = 0.55
const CARD_W = 360;
const CARD_H = 640;
const SCALE = 0.55;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    alignItems: 'center',
  },

  // Preview: the scaled card wrapper dimensions must accommodate the
  // transformed size so it doesn't clip or leave a gap.
  previewContainer: {
    width: CARD_W * SCALE,
    height: CARD_H * SCALE,
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 8,
  },
  scaledCardWrapper: {
    transform: [{ scale: SCALE }],
    width: CARD_W,
    height: CARD_H,
  },

  // Customize section
  section: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '500',
  },

  // Buttons
  buttonRow: {
    width: '100%',
    gap: 12,
  },
  shareButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },

  // Off-screen ViewShot
  offScreenWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 0,
    overflow: 'hidden',
  },
});
