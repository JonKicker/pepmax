/**
 * Compare screen — side-by-side fitness comparison between two users.
 *
 * Route params: { opponentId: string, opponentName: string, opponentAvatar?: string }
 *
 * State machine:
 *   loading    → skeleton placeholder blocks with pulsing animation
 *   blocked    → centered message + back button
 *   unavailable → centered message + back button
 *   error      → error message + retry button
 *   ready      → full compare UI (VS header, radar, module sections, share)
 *
 * Analytics:
 *   COMPARE_VIEWED  — on mount
 *   COMPARE_SHARE_TAPPED — on share press
 */
import React, { useEffect, useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  InteractionManager,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useTheme } from '../../../src/hooks/useTheme';
import { GlassBackground } from '../../../src/components/GlassBackground';
import { analytics, AnalyticsEvent } from '../../../src/services/analytics';
import { fetchCompareData, OWN_SCORES_MISSING } from '../../../src/services/compareDataService';
import RadarChart, { filterAxes } from '../../../src/components/compare/RadarChart';
import CompareStatRow from '../../../src/components/compare/CompareStatRow';
import CompareModuleSection from '../../../src/components/compare/CompareModuleSection';
import {
  formatWeight,
  formatDistance,
  formatPace,
  formatStat,
} from '../../../src/utils/compareFormatters';
import type { CompareState, CompareScores } from '../../../src/types/compare';
import type { Units } from '../../../src/types/profile';
import { Colors } from '../../../src/constants/theme';
import * as Haptics from 'expo-haptics';

// ─── Module config ────────────────────────────────────────────────────────────

const MODULE_COLORS = {
  gym: Colors.gym,
  cardio: Colors.cardio,
  nutrition: Colors.nutrition,
  peptides: Colors.peptide,
  crossModule: '#6B7280',
} as const;

// ─── Winner helpers ───────────────────────────────────────────────────────────

/**
 * Returns true if leftVal > rightVal (higher is better), null for tie.
 * Returns null for sentinel -1 values.
 */
function winnerHigher(leftVal: number, rightVal: number): boolean | null {
  if (leftVal === -1 || rightVal === -1) return null;
  if (leftVal === rightVal) return null;
  return leftVal > rightVal;
}

/**
 * Returns true if leftVal < rightVal (LOWER is better, e.g. pace), null for tie.
 * Returns null for sentinel -1 values.
 */
function winnerLower(leftVal: number, rightVal: number): boolean | null {
  if (leftVal === -1 || rightVal === -1) return null;
  if (leftVal === rightVal) return null;
  return leftVal < rightVal;
}

// ─── Module visibility ────────────────────────────────────────────────────────

function isGymVisible(my: CompareScores, opp: CompareScores): boolean {
  return my.estimatedOneRepMax !== -1 && opp.estimatedOneRepMax !== -1
    && my.weeklyVolume !== -1 && opp.weeklyVolume !== -1;
}

function isCardioVisible(my: CompareScores, opp: CompareScores): boolean {
  return my.weeklyDistance !== -1 && opp.weeklyDistance !== -1
    && my.avgPace !== -1 && opp.avgPace !== -1;
}

function isNutritionVisible(my: CompareScores, opp: CompareScores): boolean {
  return my.avgDailyCalories !== -1 && opp.avgDailyCalories !== -1;
}

function isPeptidesVisible(my: CompareScores, opp: CompareScores): boolean {
  // Both users must have opted in (not -1 sentinel) AND have at least one active peptide
  return my.activePeptideCount !== -1 && opp.activePeptideCount !== -1;
}

// ─── Skeleton component ───────────────────────────────────────────────────────

function SkeletonBlock({ height, opacity, color }: { height: number; opacity: Animated.Value; color: string }) {
  return (
    <Animated.View
      style={[styles.skeletonBlock, { height, opacity, backgroundColor: color }]}
    />
  );
}

// ─── VS Header ────────────────────────────────────────────────────────────────

type VSHeaderProps = {
  myName: string;
  opponentName: string;
  colors: ReturnType<typeof useTheme>['colors'];
};

function VSHeader({ myName, opponentName, colors }: VSHeaderProps) {
  return (
    <View style={styles.vsHeader}>
      <View style={styles.vsAvatarBlock}>
        <View style={[styles.vsAvatar, { backgroundColor: Colors.social }]}>
          <Text style={styles.vsAvatarInitial}>
            {myName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={[styles.vsName, { color: colors.textPrimary }]} numberOfLines={1}>
          {myName}
        </Text>
      </View>

      <Text style={[styles.vsLabel, { color: colors.textSecondary }]}>VS</Text>

      <View style={styles.vsAvatarBlock}>
        <View style={[styles.vsAvatar, { backgroundColor: Colors.accent }]}>
          <Text style={styles.vsAvatarInitial}>
            {opponentName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={[styles.vsName, { color: colors.textPrimary }]} numberOfLines={1}>
          {opponentName}
        </Text>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function CompareScreen() {
  const { opponentId, opponentName, opponentAvatar } = useLocalSearchParams<{
    opponentId: string;
    opponentName: string;
    opponentAvatar?: string;
  }>();
  // TODO: Deep link validation — verify opponentId is a valid UID format
  // before fetching. Reject malformed IDs early to avoid unnecessary reads.
  const router = useRouter();
  const { userProfile, currentUser } = useAuth();
  const { colors } = useTheme();

  const [compareState, setCompareState] = React.useState<CompareState>({ status: 'loading' });
  const [modulesReady, setModulesReady] = useState(false);
  const pulseAnim = useRef(new Animated.Value(0.4)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);
  const shareBtnScale = useRef(new Animated.Value(1)).current;

  const units: Units = userProfile?.units ?? 'imperial';
  const myName = userProfile?.firstName ?? currentUser?.displayName ?? 'You';
  const opponentDisplayName = opponentName ?? 'Opponent';

  // (2c) Navigate to dashboard on logout
  useEffect(() => {
    if (!currentUser) {
      router.replace('/(tabs)/dashboard');
    }
  }, [currentUser, router]);

  // (3b) Lazy load module sections after interactions settle
  useEffect(() => {
    if (compareState.status !== 'ready') {
      setModulesReady(false);
      return;
    }
    const handle = InteractionManager.runAfterInteractions(() => {
      setModulesReady(true);
    });
    return () => handle.cancel();
  }, [compareState.status]);

  // Skeleton pulse animation
  useEffect(() => {
    if (compareState.status !== 'loading') {
      pulseLoop.current?.stop();
      return;
    }
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    pulseLoop.current.start();
    return () => pulseLoop.current?.stop();
  }, [compareState.status, pulseAnim]);

  // Load data
  const load = useCallback(async () => {
    if (!currentUser) return; // (2b) guard against race before auth resolves
    if (!opponentId) {
      setCompareState({ status: 'error', error: 'No opponent specified' });
      return;
    }
    // (2b) Self-compare guard
    if (opponentId === currentUser.uid) {
      setCompareState({ status: 'self' });
      return;
    }
    setCompareState({ status: 'loading' });
    const state = await fetchCompareData(opponentId);
    setCompareState(state);
  }, [opponentId, currentUser]);

  useEffect(() => {
    analytics.track(AnalyticsEvent.COMPARE_VIEWED, { opponentId: opponentId ?? '' });
    load();
  }, [load, opponentId]);

  // (4d) Share button scale animation
  function handleSharePressIn() {
    Animated.spring(shareBtnScale, { toValue: 0.95, useNativeDriver: true }).start();
  }
  function handleSharePressOut() {
    Animated.spring(shareBtnScale, { toValue: 1.0, useNativeDriver: true }).start();
  }

  // Share button handler
  function handleSharePress() {
    if (compareState.status !== 'ready') return;
    analytics.track(AnalyticsEvent.COMPARE_SHARE_TAPPED, { opponentId: opponentId ?? '' });
    router.push({
      pathname: '/(tabs)/compete/share-preview',
      params: {
        myName,
        opponentName: opponentDisplayName,
        opponentAvatar: opponentAvatar ?? '',
        myScoresJson: JSON.stringify(compareState.data.myScores),
        opponentScoresJson: JSON.stringify(compareState.data.opponentScores),
        units,
      },
    });
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (compareState.status === 'loading') {
    return (
      <GlassBackground>
      <View style={styles.container}>
        <View style={styles.skeletonWrapper}>
          <SkeletonBlock height={80} opacity={pulseAnim} color={colors.surface} />
          <SkeletonBlock height={300} opacity={pulseAnim} color={colors.surface} />
          <SkeletonBlock height={160} opacity={pulseAnim} color={colors.surface} />
        </View>
      </View>
      </GlassBackground>
    );
  }

  // ── Blocked state ──────────────────────────────────────────────────────────
  if (compareState.status === 'blocked') {
    return (
      <GlassBackground>
      <View style={[styles.container, styles.centered]}>
        <Ionicons name="ban-outline" size={48} color={colors.textSecondary} />
        <Text style={[styles.stateTitle, { color: colors.textPrimary }]}>
          Comparison Unavailable
        </Text>
        <Text style={[styles.stateMessage, { color: colors.textSecondary }]}>
          This comparison is not available right now.
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }} accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
      </GlassBackground>
    );
  }

  // ── Unavailable state ──────────────────────────────────────────────────────
  if (compareState.status === 'unavailable') {
    return (
      <GlassBackground>
      <View style={[styles.container, styles.centered]}>
        <Ionicons name="hourglass-outline" size={48} color={colors.textSecondary} />
        <Text style={[styles.stateTitle, { color: colors.textPrimary }]}>
          No Data Yet
        </Text>
        <Text style={[styles.stateMessage, { color: colors.textSecondary }]}>
          {opponentDisplayName} hasn't enabled Compare or their scores aren't ready yet.
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }} accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
      </GlassBackground>
    );
  }

  // ── Self-compare state ────────────────────────────────────────────────────
  if (compareState.status === 'self') {
    return (
      <GlassBackground>
      <View style={[styles.container, styles.centered]}>
        <Ionicons name="trophy-outline" size={48} color={Colors.gold} />
        <Text style={[styles.stateTitle, { color: colors.textPrimary }]}>
          You vs You?
        </Text>
        <Text style={[styles.stateMessage, { color: colors.textSecondary }]}>
          You always win! Try comparing with a friend instead.
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }} accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
      </GlassBackground>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (compareState.status === 'error') {
    // (1a) Empty state for new user whose scores haven't been computed yet
    if (compareState.error.startsWith(OWN_SCORES_MISSING)) {
      return (
        <GlassBackground>
      <View style={[styles.container, styles.centered]}>
          <Ionicons name="barbell-outline" size={48} color={colors.textSecondary} />
          <Text style={[styles.stateTitle, { color: colors.textPrimary }]}>
            Not Enough Data Yet
          </Text>
          <Text style={[styles.stateMessage, { color: colors.textSecondary }]}>
            Log some workouts, meals, or runs to see how you compare.
          </Text>
          <TouchableOpacity style={styles.backButton} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }} accessibilityRole="button" accessibilityLabel="Go back">
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </GlassBackground>
      );
    }
    return (
      <GlassBackground>
      <View style={[styles.container, styles.centered]}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
        <Text style={[styles.stateTitle, { color: colors.textPrimary }]}>
          Something Went Wrong
        </Text>
        <Text style={[styles.stateMessage, { color: colors.textSecondary }]}>
          {compareState.error}
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); load(); }} accessibilityRole="button" accessibilityLabel="Retry loading comparison">
          <Text style={styles.backButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
      </GlassBackground>
    );
  }

  // ── Ready state ────────────────────────────────────────────────────────────
  const { myScores, opponentScores } = compareState.data;

  const gymVisible = isGymVisible(myScores, opponentScores);
  const cardioVisible = isCardioVisible(myScores, opponentScores);
  const nutritionVisible = isNutritionVisible(myScores, opponentScores);
  const peptidesVisible = isPeptidesVisible(myScores, opponentScores);

  // (1c) No overlapping modules
  const noModuleOverlap = !gymVisible && !cardioVisible && !nutritionVisible && !peptidesVisible;

  // (4b) Staggered animation counter
  let statIndex = 0;

  return (
    <GlassBackground>
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* VS Header */}
        <VSHeader
          myName={myName}
          opponentName={opponentDisplayName}
          colors={colors}
        />

        {/* Radar Chart */}
        <View style={styles.radarWrapper}>
          <RadarChart
            userScores={myScores}
            opponentScores={opponentScores}
            userName={myName}
            opponentName={opponentDisplayName}
            size={300}
          />
        </View>

        {/* (1c) No module overlap banner */}
        {noModuleOverlap && (
          <View style={[styles.infoBanner, { backgroundColor: colors.surface }]}>
            <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.infoBannerText, { color: colors.textSecondary }]}>
              You and {opponentDisplayName} don't share enough module data for a detailed comparison. Here are the stats we can show.
            </Text>
          </View>
        )}

        {/* (3b) Lazy-loaded module sections */}
        {!modulesReady ? (
          <View style={styles.lazyPlaceholder}>
            <ActivityIndicator size="large" color={colors.textSecondary} />
          </View>
        ) : (
          <>
            {/* ── Gym module ── */}
            {gymVisible && (
              <CompareModuleSection
                title="Gym"
                accentColor={MODULE_COLORS.gym}
                icon="barbell-outline"
              >
                <CompareStatRow
                  label="Est. 1RM"
                  leftValue={formatStat(myScores.estimatedOneRepMax, (v) =>
                    formatWeight(v, units))}
                  rightValue={formatStat(opponentScores.estimatedOneRepMax, (v) =>
                    formatWeight(v, units))}
                  leftWins={winnerHigher(myScores.estimatedOneRepMax, opponentScores.estimatedOneRepMax)}
                  accentColor={MODULE_COLORS.gym}
                  animDelay={statIndex++ * 100}
                />
                <CompareStatRow
                  label="Vol/Week"
                  leftValue={formatStat(myScores.weeklyVolume, (v) => formatWeight(v, units))}
                  rightValue={formatStat(opponentScores.weeklyVolume, (v) => formatWeight(v, units))}
                  leftWins={winnerHigher(myScores.weeklyVolume, opponentScores.weeklyVolume)}
                  accentColor={MODULE_COLORS.gym}
                  animDelay={statIndex++ * 100}
                />
              </CompareModuleSection>
            )}

            {/* ── Cardio module ── */}
            {cardioVisible && (
              <CompareModuleSection
                title="Cardio"
                accentColor={MODULE_COLORS.cardio}
                icon="walk-outline"
              >
                <CompareStatRow
                  label="Dist/Week"
                  leftValue={formatStat(myScores.weeklyDistance, (v) => formatDistance(v, units))}
                  rightValue={formatStat(opponentScores.weeklyDistance, (v) =>
                    formatDistance(v, units))}
                  leftWins={winnerHigher(myScores.weeklyDistance, opponentScores.weeklyDistance)}
                  accentColor={MODULE_COLORS.cardio}
                  animDelay={statIndex++ * 100}
                />
                <CompareStatRow
                  label="Avg Pace"
                  leftValue={formatStat(myScores.avgPace, (v) => formatPace(v, units))}
                  rightValue={formatStat(opponentScores.avgPace, (v) => formatPace(v, units))}
                  leftWins={winnerLower(myScores.avgPace, opponentScores.avgPace)}
                  accentColor={MODULE_COLORS.cardio}
                  animDelay={statIndex++ * 100}
                />
              </CompareModuleSection>
            )}

            {/* ── Nutrition module ── */}
            {nutritionVisible && (
              <CompareModuleSection
                title="Nutrition"
                accentColor={MODULE_COLORS.nutrition}
                icon="restaurant-outline"
              >
                <CompareStatRow
                  label="Avg kcal"
                  leftValue={formatStat(myScores.avgDailyCalories, (v) => `${Math.round(v)} kcal`)}
                  rightValue={formatStat(opponentScores.avgDailyCalories, (v) =>
                    `${Math.round(v)} kcal`)}
                  leftWins={null}
                  accentColor={MODULE_COLORS.nutrition}
                  animDelay={statIndex++ * 100}
                />
                <CompareStatRow
                  label="Nutrition"
                  leftValue={formatStat(myScores.nutritionConsistency, (v) => `${Math.round(v)}`)}
                  rightValue={formatStat(opponentScores.nutritionConsistency, (v) =>
                    `${Math.round(v)}`)}
                  leftWins={winnerHigher(
                    myScores.nutritionConsistency,
                    opponentScores.nutritionConsistency,
                  )}
                  accentColor={MODULE_COLORS.nutrition}
                  animDelay={statIndex++ * 100}
                />
              </CompareModuleSection>
            )}

            {/* ── Peptides module ── */}
            {peptidesVisible && (
              <CompareModuleSection
                title="Peptides"
                accentColor={MODULE_COLORS.peptides}
                icon="flask-outline"
              >
                <CompareStatRow
                  label="Active"
                  leftValue={formatStat(myScores.activePeptideCount, (v) => `${v}`)}
                  rightValue={formatStat(opponentScores.activePeptideCount, (v) => `${v}`)}
                  leftWins={winnerHigher(myScores.activePeptideCount, opponentScores.activePeptideCount)}
                  accentColor={MODULE_COLORS.peptides}
                  animDelay={statIndex++ * 100}
                />
              </CompareModuleSection>
            )}
          </>
        )}

        {/* ── Cross-Module (always shown — outside lazy guard) ── */}
        <CompareModuleSection
          title="Cross-Module"
          accentColor={MODULE_COLORS.crossModule}
          icon="trophy-outline"
        >
          <CompareStatRow
            label="Consistency"
            leftValue={formatStat(myScores.overallConsistency, (v) => `${Math.round(v)}`)}
            rightValue={formatStat(opponentScores.overallConsistency, (v) => `${Math.round(v)}`)}
            leftWins={winnerHigher(myScores.overallConsistency, opponentScores.overallConsistency)}
            accentColor={MODULE_COLORS.crossModule}
            animDelay={statIndex++ * 100}
          />
          <CompareStatRow
            label="XP Rank"
            leftValue={formatStat(myScores.xpPercentile, (v) => `${Math.round(v)}%`)}
            rightValue={formatStat(opponentScores.xpPercentile, (v) => `${Math.round(v)}%`)}
            leftWins={winnerHigher(myScores.xpPercentile, opponentScores.xpPercentile)}
            accentColor={MODULE_COLORS.crossModule}
            animDelay={statIndex++ * 100}
          />
        </CompareModuleSection>

        {/* Share button */}
        <Animated.View style={{ transform: [{ scale: shareBtnScale }] }}>
          <TouchableOpacity
            style={styles.shareButton}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleSharePress(); }}
            onPressIn={handleSharePressIn}
            onPressOut={handleSharePressOut}
            accessibilityRole="button"
            accessibilityLabel="Share comparison"
          >
            <Ionicons name="share-outline" size={18} color="#FFFFFF" style={styles.shareIcon} />
            <Text style={styles.shareButtonText}>Share Compare</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
    </GlassBackground>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // VS header
  vsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  vsAvatarBlock: {
    alignItems: 'center',
    flex: 1,
  },
  vsAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  vsAvatarInitial: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  vsName: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: 100,
  },
  vsLabel: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
    textAlign: 'center',
    paddingHorizontal: 8,
  },

  // Radar chart
  radarWrapper: {
    alignItems: 'center',
    marginBottom: 28,
  },

  // Skeleton
  skeletonWrapper: {
    padding: 16,
    gap: 16,
  },
  skeletonBlock: {
    borderRadius: 12,
  },

  // State screens
  stateTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  stateMessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#6B7280',
    borderRadius: 8,
    minHeight: 48,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },

  // Info banner (no module overlap)
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },

  // Lazy loading placeholder
  lazyPlaceholder: {
    minHeight: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Share button
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.social,
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: 8,
    minHeight: 48,
  },
  shareIcon: {
    marginRight: 8,
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
