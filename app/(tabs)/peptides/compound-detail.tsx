/**
 * compound-detail.tsx — Full-screen compound education detail view.
 *
 * 5 tabs: Overview | Protocols | Safety | Stacking | FAQ
 * Always-visible: disclaimer banner, storage banner, references footer, track CTA.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager,
  StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import { GlassBackground } from '../../../src/components/GlassBackground';
import { GradientButton } from '../../../src/components/GradientButton';
import { AnimatedPressable } from '../../../src/components/AnimatedPressable';
import { EducationCard } from '../../../src/components/peptides/EducationCard';
import { ProtocolCard } from '../../../src/components/peptides/ProtocolCard';

import { getCompoundById, COMPOUND_DATABASE } from '../../../src/data/compoundDatabase';
import { getEducation } from '../../../src/data/compoundEducation';
import type { CompoundStatus } from '../../../src/data/compoundDatabase';
import type { ProtocolInfo } from '../../../src/types/education';

import { useAuth } from '../../../src/contexts/AuthContext';
import { addPeptideFromPreset, getPeptides } from '../../../src/services/peptideService';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Types ────────────────────────────────────────────────────────────────────

type TabName = 'Overview' | 'Protocols' | 'Safety' | 'Stacking' | 'FAQ';
const TABS: TabName[] = ['Overview', 'Protocols', 'Safety', 'Stacking', 'FAQ'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  'GLP-1 / Weight Management': '#2E86C1',
  'Growth Hormone / GH Secretagogues': '#8E44AD',
  'Healing / Recovery': '#27AE60',
  'Immune Support': '#E74C3C',
  'Melanocortin / Tanning / Sexual Health': '#E67E22',
  'Nootropic / Cognitive / Sleep': '#3498DB',
  'Metabolic / Diabetes': '#16A085',
  'Bone / Osteoporosis': '#95A5A6',
  'Cosmetic / Skin': '#E91E63',
  'Fat Loss (Non-GLP-1)': '#FF5722',
  'Fertility / Hormone': '#9C27B0',
  'Longevity / Mitochondrial': '#00897B',
  'Mood / Social': '#5C6BC0',
  'Muscle Growth / Myostatin Inhibitor': '#F44336',
};

function getStatusBadge(status: CompoundStatus, dark: boolean) {
  switch (status) {
    case 'FDA-Approved':
    case 'FDA-Approved (Rx/Compounded)':
      return {
        bg: dark ? '#1B5E20' + '33' : '#E8F5E9',
        text: dark ? '#66BB6A' : '#2E7D32',
        label: 'FDA Approved',
      };
    case 'Compounded':
      return {
        bg: dark ? '#E65100' + '33' : '#FFF3E0',
        text: dark ? '#FFB74D' : '#E65100',
        label: 'Compounded',
      };
    default:
      return {
        bg: dark ? '#546E7A' + '33' : '#ECEFF1',
        text: dark ? '#90A4AE' : '#546E7A',
        label: 'Research',
      };
  }
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CompoundDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, dark } = useTheme();
  const { currentUser } = useAuth();

  const compound = getCompoundById(id);
  const education = getEducation(id);

  const [activeTab, setActiveTab] = useState<TabName>('Overview');
  const [isTracked, setIsTracked] = useState(false);

  // ─── Check if already tracked ────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser || !compound) return;
    let cancelled = false;
    getPeptides().then((result) => {
      if (cancelled) return;
      if (result.data) {
        const tracked = result.data.some(
          (p) => p.name === compound.name || p.presetId === compound.id,
        );
        setIsTracked(tracked);
      }
    });
    return () => { cancelled = true; };
  }, [currentUser, compound]);

  // ─── Handlers ────────────────────────────────────────────────────────────
  const handleStartProtocol = (protocol: ProtocolInfo) => {
    router.push({
      pathname: '/(tabs)/peptides/cycle-planner',
      params: {
        prefillCompoundId: compound!.id,
        prefillCompoundName: compound!.name,
        prefillDose: protocol.startingDose || String(compound!.commonDoses[0] || ''),
        prefillUnit: protocol.unit || compound!.unit,
      },
    });
  };

  const handleTrack = async () => {
    if (!currentUser || !compound) return;
    try {
      await addPeptideFromPreset(compound, compound.commonDoses[0] || 0);
      setIsTracked(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.error('Failed to track compound:', e);
    }
  };

  // ─── Compound not found ───────────────────────────────────────────────────
  if (!compound) {
    return (
      <GlassBackground>
        <Stack.Screen options={{ title: 'Compound Detail' }} />
        <View style={styles.notFoundContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textSecondary} accessible={false} />
          <Text style={[styles.notFoundTitle, { color: colors.textPrimary }]}>
            Compound not found
          </Text>
          <Text style={[styles.notFoundSub, { color: colors.textSecondary }]}>
            The compound with ID &quot;{id}&quot; does not exist in the database.
          </Text>
          <AnimatedPressable
            haptic
            scaleValue={0.96}
            style={[styles.backButton, { backgroundColor: Colors.peptide }]}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </AnimatedPressable>
        </View>
      </GlassBackground>
    );
  }

  const categoryColor = CATEGORY_COLORS[compound.group] ?? Colors.peptide;
  const statusBadge = getStatusBadge(compound.status, dark);

  // ─── Fallback — no education data ─────────────────────────────────────────
  if (!education) {
    return (
      <GlassBackground>
        <Stack.Screen options={{ title: compound.name }} />
        <ScrollView contentContainerStyle={styles.fallbackContainer}>
          <Text style={[styles.fallbackName, { color: colors.textPrimary }]}>
            {compound.name}
          </Text>
          <Text style={[styles.fallbackMoa, { color: colors.textSecondary }]}>
            {compound.mechanismOfAction}
          </Text>
          <Text style={[styles.fallbackComing, { color: colors.textSecondary }]}>
            Detailed education content coming soon.
          </Text>
        </ScrollView>
      </GlassBackground>
    );
  }

  // ─── Main render ─────────────────────────────────────────────────────────
  return (
    <GlassBackground>
      <Stack.Screen options={{ title: compound.name }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── DISCLAIMER BANNER ─────────────────────────────────────────── */}
        <View
          style={[
            styles.disclaimerBanner,
            { backgroundColor: dark ? '#3E2723' : '#FFF8E1' },
          ]}
        >
          <Ionicons
            name="warning"
            size={18}
            color="#F9A825"
            style={styles.disclaimerIcon}
            accessible={false}
          />
          <Text
            style={[
              styles.disclaimerText,
              { color: dark ? '#FFE082' : '#F57F17' },
            ]}
          >
            This information is for educational purposes only. Always consult a
            healthcare provider before starting any peptide protocol.
          </Text>
        </View>

        {/* ── HEADER ────────────────────────────────────────────────────── */}
        <View style={styles.headerSection}>
          <Text style={[styles.compoundName, { color: colors.textPrimary }]}>
            {compound.name}
          </Text>

          {compound.aliases !== 'N/A' && (
            <Text style={[styles.aliases, { color: colors.textSecondary }]}>
              Also known as: {compound.aliases}
            </Text>
          )}

          <View style={styles.badgeRow}>
            {/* Category badge */}
            <View
              style={[
                styles.badge,
                { backgroundColor: categoryColor + '22' },
              ]}
            >
              <Text style={[styles.badgeText, { color: categoryColor }]}>
                {compound.group}
              </Text>
            </View>

            {/* Status badge */}
            <View
              style={[styles.badge, { backgroundColor: statusBadge.bg }]}
            >
              <Text style={[styles.badgeText, { color: statusBadge.text }]}>
                {statusBadge.label}
              </Text>
            </View>
          </View>
        </View>

        {/* ── STORAGE BANNER ────────────────────────────────────────────── */}
        <View
          style={[
            styles.storageBanner,
            {
              backgroundColor: colors.glass.subtle,
              borderColor: colors.glass.border,
            },
          ]}
        >
          <Ionicons
            name="thermometer-outline"
            size={18}
            color={Colors.peptide}
            style={styles.storageIcon}
            accessible={false}
          />
          <Text style={[styles.storageText, { color: colors.textSecondary }]}>
            {education.storageDetail || compound.storage || 'See product label for storage instructions'}
          </Text>
        </View>

        {/* ── TAB BAR ───────────────────────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBarContent}
          style={styles.tabBarScroll}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <AnimatedPressable
                key={tab}
                haptic
                scaleValue={0.96}
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setActiveTab(tab);
                }}
                style={[
                  styles.tabPill,
                  isActive
                    ? { backgroundColor: Colors.peptide }
                    : {
                        backgroundColor: colors.glass.subtle,
                        borderWidth: 1,
                        borderColor: colors.glass.border,
                      },
                ]}
              >
                <Text
                  style={[
                    styles.tabPillText,
                    { color: isActive ? '#FFFFFF' : colors.textSecondary },
                  ]}
                >
                  {tab}
                </Text>
              </AnimatedPressable>
            );
          })}
        </ScrollView>

        {/* ── TAB CONTENT ───────────────────────────────────────────────── */}
        <View style={styles.tabContent}>

          {/* Overview */}
          {activeTab === 'Overview' && (
            <>
              <EducationCard
                title="Overview"
                icon="book-outline"
                defaultExpanded
              >
                <Text style={[styles.overviewText, { color: colors.textPrimary }]}>
                  {education.overview}
                </Text>
              </EducationCard>

              <View style={styles.spacer} />

              <EducationCard
                title="Mechanism of Action"
                icon="flask-outline"
              >
                <Text style={[styles.overviewText, { color: colors.textPrimary }]}>
                  {education.mechanismDetail}
                </Text>
              </EducationCard>

              <View style={styles.spacer} />

              <EducationCard
                title="Research Status"
                icon="school-outline"
              >
                <Text style={[styles.overviewText, { color: colors.textPrimary }]}>
                  {education.researchStatus}
                </Text>
              </EducationCard>
            </>
          )}

          {/* Protocols */}
          {activeTab === 'Protocols' &&
            education.commonProtocols.map((protocol, i) => (
              <View key={i} style={styles.protocolWrapper}>
                <ProtocolCard
                  protocol={protocol}
                  compoundName={compound.name}
                  onStartProtocol={handleStartProtocol}
                />
              </View>
            ))}

          {/* Safety */}
          {activeTab === 'Safety' && (
            <>
              <EducationCard
                title="Safety Notes"
                icon="alert-circle-outline"
                defaultExpanded
              >
                {education.safetyNotes.map((note, i) => (
                  <View key={i} style={styles.safetyRow}>
                    <Ionicons
                      name="warning-outline"
                      size={16}
                      color="#E67E22"
                      style={styles.safetyIcon}
                    />
                    <Text style={[styles.safetyText, { color: colors.textPrimary }]}>
                      {note}
                    </Text>
                  </View>
                ))}
              </EducationCard>

              <View style={styles.spacer} />

              <EducationCard
                title="Common Side Effects"
                icon="medical-outline"
              >
                <View style={styles.pillContainer}>
                  {compound.commonSideEffects.map((effect, i) => (
                    <View
                      key={i}
                      style={[
                        styles.pill,
                        { backgroundColor: Colors.peptide + '18' },
                      ]}
                    >
                      <Text style={[styles.pillText, { color: Colors.peptide }]}>
                        {effect}
                      </Text>
                    </View>
                  ))}
                </View>
              </EducationCard>
            </>
          )}

          {/* Stacking */}
          {activeTab === 'Stacking' && (
            <>
              <EducationCard
                title="Stacking Information"
                icon="layers-outline"
                defaultExpanded
              >
                <Text style={[styles.overviewText, { color: colors.textPrimary }]}>
                  {education.stackingInfo}
                </Text>
              </EducationCard>

              <View style={styles.spacer} />

              <EducationCard
                title="Common Stacks"
                icon="git-merge-outline"
              >
                <View style={styles.pillContainer}>
                  {compound.commonStacks.map((stackName, i) => {
                    const stackCompound = COMPOUND_DATABASE.find(
                      (c) =>
                        c.name.toLowerCase().includes(stackName.toLowerCase()) ||
                        stackName.toLowerCase().includes(c.name.toLowerCase()),
                    );
                    return (
                      <AnimatedPressable
                        key={i}
                        haptic
                        disabled={!stackCompound}
                        accessibilityLabel={stackCompound ? `Navigate to ${stackName}` : stackName}
                        onPress={() => {
                          if (stackCompound) {
                            router.push({
                              pathname: '/(tabs)/peptides/compound-detail',
                              params: { id: stackCompound.id },
                            });
                          }
                        }}
                      >
                        <View
                          style={[
                            styles.pill,
                            {
                              backgroundColor: Colors.peptide + '18',
                              borderWidth: stackCompound ? 1 : 0,
                              borderColor: Colors.peptide + '44',
                              flexDirection: 'row',
                              alignItems: 'center',
                            },
                          ]}
                        >
                          <Text style={[styles.pillText, { color: Colors.peptide }]}>
                            {stackName}
                          </Text>
                          {stackCompound && (
                            <Ionicons
                              name="arrow-forward"
                              size={12}
                              color={Colors.peptide}
                              style={styles.pillArrow}
                              accessible={false}
                            />
                          )}
                        </View>
                      </AnimatedPressable>
                    );
                  })}
                </View>
              </EducationCard>
            </>
          )}

          {/* FAQ */}
          {activeTab === 'FAQ' &&
            education.faqs.map((faq, i) => (
              <View key={i} style={styles.faqWrapper}>
                <EducationCard title={faq.question} icon="help-circle-outline">
                  <Text style={[styles.overviewText, { color: colors.textPrimary }]}>
                    {faq.answer}
                  </Text>
                </EducationCard>
              </View>
            ))}

        </View>

        {/* ── REFERENCES FOOTER ─────────────────────────────────────────── */}
        {education.references.length > 0 && (
          <View
            style={[
              styles.referencesSection,
              { borderTopColor: colors.border },
            ]}
          >
            <Text style={[styles.referencesTitle, { color: colors.textSecondary }]}>
              References
            </Text>
            {education.references.map((ref, i) => (
              <Text
                key={i}
                style={[styles.referenceText, { color: colors.textSecondary }]}
              >
                {i + 1}. {ref.title} — {ref.source} ({ref.year})
              </Text>
            ))}
          </View>
        )}

        {/* ── TRACK CTA ─────────────────────────────────────────────────── */}
        <View style={styles.ctaContainer}>
          {isTracked ? (
            <View
              style={[
                styles.trackedBadge,
                {
                  backgroundColor: dark ? '#1B5E20' + '33' : '#E8F5E9',
                  borderColor: '#66BB6A',
                },
              ]}
            >
              <Ionicons name="checkmark-circle" size={20} color={dark ? '#66BB6A' : '#2E7D32'} accessible={false} />
              <Text style={[styles.trackedText, { color: dark ? '#66BB6A' : '#2E7D32' }]}>
                Already Tracking
              </Text>
            </View>
          ) : (
            <GradientButton
              label="Track This Compound"
              onPress={handleTrack}
              colors={[Colors.peptide, Colors.primary]}
            />
          )}
        </View>

      </ScrollView>
    </GlassBackground>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Scroll container
  scrollContent: {
    paddingBottom: 100,
  },

  // Not-found state
  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  notFoundTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 8,
  },
  notFoundSub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  backButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },

  // Fallback (no education)
  fallbackContainer: {
    padding: 24,
    paddingBottom: 60,
    gap: 12,
  },
  fallbackName: {
    fontSize: 24,
    fontWeight: '800',
  },
  fallbackMoa: {
    fontSize: 15,
    lineHeight: 22,
  },
  fallbackComing: {
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 8,
  },

  // Disclaimer banner
  disclaimerBanner: {
    borderRadius: 12,
    padding: 12,
    margin: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  disclaimerIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },

  // Header section
  headerSection: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  compoundName: {
    fontSize: 26,
    fontWeight: '800',
  },
  aliases: {
    fontSize: 14,
    marginTop: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Storage banner
  storageBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  storageIcon: {
    marginRight: 8,
  },
  storageText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },

  // Tab bar
  tabBarScroll: {
    marginBottom: 4,
  },
  tabBarContent: {
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
    paddingBottom: 4,
  },
  tabPill: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  tabPillText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Tab content wrapper
  tabContent: {
    paddingHorizontal: 16,
  },

  // Shared spacer between cards
  spacer: {
    height: 12,
  },

  // Body text used in Overview, Stacking, FAQ
  overviewText: {
    fontSize: 14,
    lineHeight: 22,
  },

  // Protocol wrapper (bottom margin between cards)
  protocolWrapper: {
    marginBottom: 12,
  },

  // Safety notes
  safetyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  safetyIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  safetyText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },

  // Pills (side effects, stacks)
  pillContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  pillArrow: {
    marginLeft: 4,
  },

  // FAQ
  faqWrapper: {
    marginBottom: 12,
  },

  // References footer
  referencesSection: {
    marginTop: 24,
    marginHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  referencesTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  referenceText: {
    fontSize: 12,
    lineHeight: 18,
  },

  // Track CTA
  ctaContainer: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 40,
  },
  trackedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  trackedText: {
    color: '#2E7D32',
    fontWeight: '600',
    fontSize: 15,
  },
});
