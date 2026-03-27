/**
 * Dashboard — unified command center.
 *
 * Modular card system with skeleton loading, pull-to-refresh (5-min cache),
 * consistency tracking, body weight sparkline, and card visibility preferences.
 */
import React, { useState, useEffect, useRef } from 'react';
import { ScrollView, RefreshControl, StyleSheet, View, Text } from 'react-native';
import { AnimatedPressable } from '../../../src/components/AnimatedPressable';
import Animated, { useSharedValue, useAnimatedStyle, withDelay, withTiming, withSpring } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useDashboard } from '../../../src/hooks/useDashboard';
import { SkeletonCard } from '../../../src/components/SkeletonLoader';
import { GreetingSection } from '../../../src/components/dashboard/GreetingSection';
import { PeptideCard } from '../../../src/components/dashboard/PeptideCard';
import { NutritionCard } from '../../../src/components/dashboard/NutritionCard';
import { TrainingCard } from '../../../src/components/dashboard/TrainingCard';
import { CardioCard } from '../../../src/components/dashboard/CardioCard';
import { BodyWeightCard } from '../../../src/components/dashboard/BodyWeightCard';
import { AIInsightCard } from '../../../src/components/dashboard/AIInsightCard';
import { SmartInsightsCard } from '../../../src/components/dashboard/SmartInsightsCard';
import { ConsistencyCard } from '../../../src/components/dashboard/ConsistencyCard';
import { RecoveryScoreCard } from '../../../src/components/dashboard/RecoveryScoreCard';
import { LogWeightModal } from '../../../src/components/dashboard/LogWeightModal';
import { OnboardingChecklist } from '../../../src/components/dashboard/OnboardingChecklist';
import { GamificationCard } from '../../../src/components/dashboard/GamificationCard';
import { DailyQuestsCard } from '../../../src/components/dashboard/DailyQuestsCard';
import { GlassBackground } from '../../../src/components/GlassBackground';
import { HydrationCard } from '../../../src/components/dashboard/HydrationCard';
import { SuggestedWorkoutCard } from '../../../src/components/dashboard/SuggestedWorkoutCard';

import { BodyHubHeroCard } from '../../../src/components/dashboard/BodyHubHeroCard';
import { useBodyHubMuscles } from '../../../src/hooks/useBodyHubMuscles';
import { useBodyHubInjections } from '../../../src/hooks/useBodyHubInjections';
import { useBodyHubCardio } from '../../../src/hooks/useBodyHubCardio';
import { useSmartInsights } from '../../../src/hooks/useSmartInsights';
import { useWorkoutSuggestion } from '../../../src/hooks/useWorkoutSuggestion';
import { useXP } from '../../../src/hooks/useXP';
import { useQuests } from '../../../src/hooks/useQuests';
import { ACHIEVEMENT_DEFINITIONS } from '../../../src/utils/achievementDefinitions';
import type { DashboardCardId } from '../../../src/types/dashboard';

function AnimatedCard({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    opacity.value = withDelay(index * 100, withTiming(1, { duration: 350 }));
    translateY.value = withDelay(index * 100, withSpring(0, { damping: 18, stiffness: 120 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentional: animate on mount only, index is stable for a given card

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={animStyle}>{children}</Animated.View>;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardScreen() {
  const { colors } = useTheme();
  const { userProfile, updateProfile } = useAuth();
  const router = useRouter();
  const dashboard = useDashboard(userProfile);
  const { data, loading, refreshing, errors, cardOrder, hiddenCards, onboardingDismissed } = dashboard;
  const smartInsights = useSmartInsights(dashboard.data, userProfile);
  const recoveryZone = data?.recovery?.zone ?? null;
  const recoveryScore = data?.recovery?.recoveryScore ?? null;
  const workoutSuggestion = useWorkoutSuggestion(recoveryZone, recoveryScore);
  const xp = useXP();
  const questData = useQuests();

  // Body Hub hero card hooks — deferred until dashboard data is ready and card is not hidden.
  // Hardcoded view='front' since the hero card is a summary preview only.
  const bodyHubEnabled = !loading && !hiddenCards.includes('bodyHub');
  const bodyHubMuscles = useBodyHubMuscles('front', bodyHubEnabled);
  const bodyHubInjections = useBodyHubInjections('front', bodyHubEnabled);
  const bodyHubCardio = useBodyHubCardio('front', bodyHubEnabled);

  // Award streak milestone XP when a 7-day (or multiple-of-7) streak is hit.
  // Uses a ref to ensure we only award once per milestone per session.
  const lastStreakMilestoneRef = useRef(0);
  useEffect(() => {
    const current = data?.streak?.current ?? 0;
    if (current > 0 && current % 7 === 0 && current > lastStreakMilestoneRef.current) {
      lastStreakMilestoneRef.current = current;
      xp.awardXP(100, 'streak_milestone', 'system', true).catch(() => {});
    }
  }, [data?.streak?.current]); // eslint-disable-line react-hooks/exhaustive-deps
  const [showWeightModal, setShowWeightModal] = useState(false);

  const name = userProfile?.firstName ?? '';
  const greeting = name ? `${getGreeting()}, ${name}` : getGreeting();
  const units = userProfile?.units ?? 'imperial';

  // Show onboarding if user has zero data and hasn't dismissed
  const showOnboarding = data && !onboardingDismissed && (
    (data.doses?.length ?? 0) === 0 &&
    (data.totals?.calories ?? 0) === 0 &&
    (data.recentSessions?.length ?? 0) === 0 &&
    (data.recentCardio?.length ?? 0) === 0 &&
    (data.recentWeights?.length ?? 0) === 0
  );

  const renderCard = (cardId: DashboardCardId) => {
    if (cardId === 'greeting') return null; // Rendered separately above cards
    if (hiddenCards.includes(cardId)) return null;

    if (loading && !data) {
      return <SkeletonCard key={cardId} />;
    }

    switch (cardId) {
      case 'recovery':
        return (
          <RecoveryScoreCard
            key={cardId}
            recovery={data?.recovery ?? null}
            colors={colors}
            onCheckIn={() => router.push('/(tabs)/dashboard/morning-check-in')}
            onDetail={() => router.push('/(tabs)/dashboard/recovery-detail')}
          />
        );
      case 'suggestedWorkout':
        return (
          <SuggestedWorkoutCard
            key={cardId}
            suggestion={workoutSuggestion.suggestion}
            loading={workoutSuggestion.isLoading}
            colors={colors}
            onStartWorkout={(templateId) => {
              if (templateId) {
                router.push({ pathname: '/(tabs)/training/session-preview', params: { templateId } });
              } else {
                router.push('/(tabs)/training');
              }
            }}
          />
        );
      case 'consistency':
        return (
          <ConsistencyCard
            key={cardId}
            consistency={data?.consistency ?? null}
            colors={colors}
            onToggleRestDay={dashboard.toggleRestDay}
            onPress={() => router.push('/(tabs)/dashboard/consistency-detail')}
          />
        );
      case 'peptides':
        return (
          <PeptideCard
            key={cardId}
            doses={data?.doses ?? []}
            colors={colors}
            error={errors.peptides ?? false}
            onPress={() => router.push('/(tabs)/peptides')}
            onQuickLog={() => router.push('/(tabs)/peptides/log-dose')}
          />
        );
      case 'nutrition':
        return (
          <NutritionCard
            key={cardId}
            totals={data?.totals ?? null}
            colors={colors}
            error={errors.nutrition ?? false}
            onPress={() => router.push('/(tabs)/nutrition')}
            calorieTarget={userProfile?.calorieTarget}
          />
        );
      case 'training':
        return (
          <TrainingCard
            key={cardId}
            sessions={data?.recentSessions ?? []}
            colors={colors}
            error={errors.training ?? false}
            onPress={() => router.push('/(tabs)/training')}
            onStartWorkout={(templateId) => {
              if (templateId) {
                router.push({ pathname: '/(tabs)/training/session-preview', params: { templateId } });
              } else {
                router.push('/(tabs)/training');
              }
            }}
          />
        );
      case 'cardio':
        return (
          <CardioCard
            key={cardId}
            sessions={data?.recentCardio ?? []}
            colors={colors}
            error={errors.cardio ?? false}
            units={units}
            onPress={() => router.push('/(tabs)/cardio')}
          />
        );
      case 'bodyWeight':
        return (
          <BodyWeightCard
            key={cardId}
            weights={data?.recentWeights ?? []}
            colors={colors}
            error={errors.bodyWeight ?? false}
            units={units}
            onLogPress={() => setShowWeightModal(true)}
            onPress={() => router.push('/(tabs)/dashboard/body-tracking')}
          />
        );
      case 'smartInsights':
        if (smartInsights.insights.length === 0 && !smartInsights.loading) return null;
        return (
          <SmartInsightsCard
            key={cardId}
            insights={smartInsights.insights}
            loading={smartInsights.loading}
            onDismiss={smartInsights.dismiss}
            colors={colors}
          />
        );
      case 'aiInsight':
        return (
          <AIInsightCard key={cardId} colors={colors} />
        );
      case 'bodyHub':
        return (
          <BodyHubHeroCard
            key={cardId}
            onPress={() => router.push('/(tabs)/dashboard/body-hub')}
            muscleRegionColors={bodyHubMuscles.regionColors}
            muscleRecovery={null}
            injectionSitesReady={bodyHubInjections.siteStats.filter((s) => s.status === 'ready').length || null}
            cardioRegionColors={bodyHubCardio.regionColors}
            restingHR={bodyHubCardio.heartData?.restingBpm ?? null}
            effortScore={bodyHubCardio.lungData?.effortScore ?? null}
            sex={userProfile?.sex ?? 'male'}
          />
        );
      case 'quests':
        return (
          <DailyQuestsCard
            key={cardId}
            quests={questData.quests}
            completedCount={questData.completedCount}
            allDone={questData.allDone}
            bonusClaimed={questData.bonusClaimed}
            loading={questData.loading}
            colors={colors}
            onClaimBonus={questData.claimBonus}
          />
        );
      case 'gamification': {
        // Find the most recently unlocked achievement title for the card subtitle
        const latestAchievement = Object.keys(xp.achievements).length > 0
          ? ACHIEVEMENT_DEFINITIONS.find((d) => xp.achievements[d.id])?.title
          : undefined;
        return (
          <GamificationCard
            key={cardId}
            level={xp.level}
            levelInfo={xp.levelInfo}
            totalXP={xp.totalXP}
            todayXP={xp.todayXP}
            latestAchievementTitle={latestAchievement}
            loading={xp.loading}
            onPress={() => router.push('/(tabs)/dashboard/xp-hub')}
          />
        );
      }
      case 'hydration':
        return (
          <HydrationCard
            key={cardId}
            colors={colors}
            onPress={() => router.push('/(tabs)/nutrition')}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <GlassBackground>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={dashboard.refresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {/* Greeting */}
        <GreetingSection
          greeting={greeting}
          colors={colors}
        />

        {/* Settings gear */}
        <AnimatedPressable
          haptic
          style={styles.settingsBtn}
          onPress={() => router.push('/(tabs)/dashboard/settings')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Settings"
        >
          <Ionicons name="settings-outline" size={20} color={colors.textSecondary} />
        </AnimatedPressable>

        {/* Onboarding checklist */}
        {showOnboarding && data && (
          <OnboardingChecklist
            data={data}
            colors={colors}
            onDismiss={dashboard.dismissOnboarding}
          />
        )}

        {/* Card feed */}
        {loading && !data ? (
          <>
            <AnimatedCard index={0}><SkeletonCard /></AnimatedCard>
            <AnimatedCard index={1}><SkeletonCard /></AnimatedCard>
            <AnimatedCard index={2}><SkeletonCard /></AnimatedCard>
          </>
        ) : (
          cardOrder.map((cardId, i) => {
            const card = renderCard(cardId);
            if (!card) return null;
            return <AnimatedCard key={cardId} index={i}>{card}</AnimatedCard>;
          })
        )}

        {/* Social Hub entry */}
        <AnimatedPressable
          haptic
          style={[styles.communityCard, { backgroundColor: colors.glass.subtle, borderColor: colors.glass.border }]}
          onPress={() => router.push('/(tabs)/dashboard/social')}
          accessibilityRole="button"
          accessibilityLabel="Social Hub — Friends, crews and leaderboards"
        >
          <View style={[styles.communityIcon, { backgroundColor: Colors.social + '18' }]}>
            <Ionicons name="people-circle-outline" size={22} color={Colors.social} />
          </View>
          <View style={styles.communityText}>
            <Text style={[styles.communityTitle, { color: colors.textPrimary }]}>Social Hub</Text>
            <Text style={[styles.communitySubtitle, { color: colors.textSecondary }]}>
              Friends, crews & leaderboards
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </AnimatedPressable>

        {/* Challenges entry */}
        <AnimatedPressable
          haptic
          style={[styles.communityCard, { backgroundColor: colors.glass.subtle, borderColor: colors.glass.border }]}
          onPress={() => router.push('/(tabs)/dashboard/challenges')}
          accessibilityRole="button"
          accessibilityLabel="Challenges — Compete with friends and crews"
        >
          <View style={[styles.communityIcon, { backgroundColor: Colors.gold + '18' }]}>
            <Ionicons name="trophy-outline" size={22} color={Colors.gold} />
          </View>
          <View style={styles.communityText}>
            <Text style={[styles.communityTitle, { color: colors.textPrimary }]}>Challenges</Text>
            <Text style={[styles.communitySubtitle, { color: colors.textSecondary }]}>
              Compete with friends & crews
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </AnimatedPressable>

        {/* Community Library entry */}
        <AnimatedPressable
          haptic
          style={[styles.communityCard, { backgroundColor: colors.glass.subtle, borderColor: colors.glass.border }]}
          onPress={() => router.push('/(tabs)/dashboard/community')}
          accessibilityRole="button"
          accessibilityLabel="Community Library — Browse and import community protocols"
        >
          <View style={[styles.communityIcon, { backgroundColor: Colors.accent + '18' }]}>
            <Ionicons name="people-outline" size={22} color={Colors.accent} />
          </View>
          <View style={styles.communityText}>
            <Text style={[styles.communityTitle, { color: colors.textPrimary }]}>Community Library</Text>
            <Text style={[styles.communitySubtitle, { color: colors.textSecondary }]}>
              Browse & import community protocols
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </AnimatedPressable>
      </ScrollView>
      </GlassBackground>

      <LogWeightModal
        visible={showWeightModal}
        onDismiss={() => setShowWeightModal(false)}
        onSaved={dashboard.refresh}
        colors={colors}
        units={units}
        updateProfile={updateProfile}
      />

    </>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
  settingsBtn: { position: 'absolute', top: 16, right: 16 },
  communityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginTop: 8,
  },
  communityIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  communityText: { flex: 1 },
  communityTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  communitySubtitle: { fontSize: 13 },
});
