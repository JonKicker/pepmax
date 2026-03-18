/**
 * Dashboard — unified command center.
 *
 * Modular card system with skeleton loading, pull-to-refresh (5-min cache),
 * streak tracking, body weight sparkline, and card visibility preferences.
 */
import React, { useState } from 'react';
import { ScrollView, RefreshControl, StyleSheet, TouchableOpacity } from 'react-native';
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
import { LogWeightModal } from '../../../src/components/dashboard/LogWeightModal';
import { OnboardingChecklist } from '../../../src/components/dashboard/OnboardingChecklist';
import PremiumGate from '../../../src/components/premium/PremiumGate';
import type { DashboardCardId } from '../../../src/types/dashboard';

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
  const dashboard = useDashboard();
  const [showWeightModal, setShowWeightModal] = useState(false);

  const name = userProfile?.firstName ?? '';
  const greeting = name ? `${getGreeting()}, ${name}` : getGreeting();
  const units = userProfile?.units ?? 'imperial';

  const { data, loading, refreshing, errors, cardOrder, hiddenCards, onboardingDismissed } = dashboard;

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
                router.push({ pathname: '/(tabs)/training/active-session', params: { templateId } });
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
      case 'aiInsight':
        return (
          <PremiumGate key={cardId} mode="blur">
            <AIInsightCard colors={colors} />
          </PremiumGate>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <ScrollView
        style={{ backgroundColor: colors.background }}
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
        {/* Greeting + streak */}
        <GreetingSection
          greeting={greeting}
          colors={colors}
          streak={data?.streak ?? null}
        />

        {/* Settings gear */}
        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => router.push('/(tabs)/dashboard/settings')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="settings-outline" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

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
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          cardOrder.map((cardId) => renderCard(cardId))
        )}
      </ScrollView>

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
  scroll: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 },
  settingsBtn: { position: 'absolute', top: 16, right: 16 },
});
