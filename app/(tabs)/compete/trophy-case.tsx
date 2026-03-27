import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import ViewShot from 'react-native-view-shot';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import { useXP } from '../../../src/hooks/useXP';
import { AchievementCard } from '../../../src/components/gamification/AchievementCard';
import { ACHIEVEMENT_DEFINITIONS, getAchievementProgress } from '../../../src/utils/achievementDefinitions';
import { getUserStats } from '../../../src/services/gamificationService';
import { analytics, AnalyticsEvent } from '../../../src/services/analytics';
import { captureAndShare } from '../../../src/services/cardGenerator';
import { ShareableCard } from '../../../src/components/sharing/ShareableCard';
import type { AchievementDefinition } from '../../../src/types/gamification';
import type { AchievementCardData } from '../../../src/types/shareCard';
import { ActivityIndicator, Alert } from 'react-native';

type CategoryFilter = 'all' | 'peptides' | 'gym' | 'nutrition' | 'cardio' | 'crossModule';

const FILTERS: Array<{ key: CategoryFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'peptides', label: 'Peptides' },
  { key: 'gym', label: 'Gym' },
  { key: 'nutrition', label: 'Nutrition' },
  { key: 'cardio', label: 'Cardio' },
  { key: 'crossModule', label: 'Cross' },
];

const CATEGORY_COLORS: Record<string, string> = {
  peptides: Colors.peptide,
  gym: Colors.gym,
  nutrition: Colors.nutrition,
  cardio: Colors.cardio,
  crossModule: Colors.gold,
};

export default function TrophyCaseScreen() {
  const { colors } = useTheme();
  const { achievements } = useXP();
  const [filter, setFilter] = useState<CategoryFilter>('all');
  const [selectedDef, setSelectedDef] = useState<AchievementDefinition | null>(null);
  const [stats, setStats] = useState<Record<string, number>>({});

  // Single shared ViewShot instance (Ray's fix: one ref, updatable data)
  const viewShotRef = useRef<ViewShot>(null);
  const [shareCardData, setShareCardData] = useState<AchievementCardData | null>(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    analytics.track(AnalyticsEvent.TROPHY_CASE_VIEWED);
    // Fetch user stats for achievement progress bars (fire-and-forget)
    getUserStats().then((result) => {
      if (result.data) setStats(result.data as unknown as Record<string, number>);
    }).catch(() => {});
  }, []);

  const handleShareAchievement = async (def: AchievementDefinition) => {
    if (sharing) return;
    const doc = achievements[def.id];
    if (!doc) return; // locked achievements cannot be shared

    const cardData: AchievementCardData = {
      type: 'achievement',
      achievementId: def.id,
      title: def.title,
      description: def.description,
      icon: def.icon,
      category: def.category,
      unlockedDate: doc.unlockedAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
    };

    // Update shared card data so the single ViewShot renders the right card
    setShareCardData(cardData);

    // Wait one frame for React to re-render the updated card before capturing
    await new Promise<void>((resolve) => setTimeout(resolve, 50));

    setSharing(true);
    try {
      const result = await captureAndShare(
        viewShotRef as React.RefObject<{ capture: () => Promise<string> }>,
        cardData,
      );
      if (result.error && !result.error.message.includes('not available')) {
        Alert.alert('Could not share', 'Please try again.');
      }
    } finally {
      setSharing(false);
    }
  };

  const filtered = ACHIEVEMENT_DEFINITIONS.filter(
    (def) => filter === 'all' || def.category === filter,
  );

  const unlockedCount = Object.keys(achievements).length;

  // AchievementCard expects to be in a 3-column grid, so we pad to complete rows
  const paddedData: Array<AchievementDefinition | null> = [...filtered];
  while (paddedData.length % 3 !== 0) paddedData.push(null);

  const selectedUnlocked = selectedDef ? achievements[selectedDef.id] : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Single off-screen ViewShot — data updated before each capture */}
      <View style={styles.offScreenWrapper}>
        <ViewShot
          ref={viewShotRef}
          options={{ format: 'png', quality: 1, width: 1080, height: 1920 }}
        >
          {shareCardData ? <ShareableCard data={shareCardData} /> : null}
        </ViewShot>
      </View>
      {/* Unlocked count */}
      <View style={[styles.countBanner, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Ionicons name="trophy" size={18} color={Colors.gold} />
        <Text style={[styles.countText, { color: colors.textPrimary }]}>
          {unlockedCount}/{ACHIEVEMENT_DEFINITIONS.length} Unlocked
        </Text>
      </View>

      {/* Category filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersRow}
        style={[styles.filtersBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}
      >
        {FILTERS.map((f) => {
          const isActive = filter === f.key;
          const accentColor = f.key === 'all' ? Colors.gold : CATEGORY_COLORS[f.key] ?? Colors.gold;
          return (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.filterChip,
                {
                  backgroundColor: isActive ? accentColor + '22' : 'transparent',
                  borderColor: isActive ? accentColor : colors.border,
                },
              ]}
              onPress={() => setFilter(f.key)}
            >
              <Text
                style={[
                  styles.filterLabel,
                  { color: isActive ? accentColor : colors.textSecondary },
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Achievement grid */}
      <FlatList
        data={paddedData}
        keyExtractor={(item, i) => item?.id ?? `pad-${i}`}
        numColumns={3}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => {
          if (!item) {
            // Invisible spacer to complete the last row
            return <View style={styles.gridSpacer} />;
          }
          const isLocked = !achievements[item.id];
          return (
            <AchievementCard
              definition={item}
              unlocked={achievements[item.id]}
              progress={isLocked ? getAchievementProgress(item.id, stats) ?? undefined : undefined}
              onPress={setSelectedDef}
            />
          );
        }}
      />

      {/* Achievement detail modal */}
      <Modal
        visible={!!selectedDef}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedDef(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedDef(null)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[styles.detailSheet, { backgroundColor: colors.surface }]}
            onPress={() => {}}
          >
            {selectedDef && (
              <>
                <View style={styles.handle} />
                <View
                  style={[
                    styles.detailIconCircle,
                    {
                      backgroundColor:
                        (CATEGORY_COLORS[selectedDef.category] ?? Colors.gold) + '22',
                    },
                  ]}
                >
                  <Ionicons
                    name={selectedDef.icon as any}
                    size={40}
                    color={
                      selectedUnlocked
                        ? CATEGORY_COLORS[selectedDef.category] ?? Colors.gold
                        : colors.border
                    }
                  />
                </View>
                <Text style={[styles.detailTitle, { color: colors.textPrimary }]}>
                  {selectedDef.title}
                </Text>
                <Text style={[styles.detailDesc, { color: colors.textSecondary }]}>
                  {selectedDef.description}
                </Text>
                <View style={[styles.detailXPBadge, { backgroundColor: Colors.gold + '22' }]}>
                  <Ionicons name="star" size={14} color={Colors.gold} />
                  <Text style={[styles.detailXPText, { color: Colors.gold }]}>
                    +{selectedDef.xpReward} XP reward
                  </Text>
                </View>
                {selectedUnlocked ? (
                  <>
                    <Text style={[styles.detailUnlocked, { color: Colors.nutrition }]}>
                      ✓ Unlocked{' '}
                      {selectedUnlocked.unlockedAt?.toDate?.()?.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) ?? ''}
                    </Text>
                    <TouchableOpacity
                      style={[styles.shareAchievementBtn, {
                        backgroundColor: (CATEGORY_COLORS[selectedDef.category] ?? Colors.gold) + '22',
                        borderColor: (CATEGORY_COLORS[selectedDef.category] ?? Colors.gold) + '55',
                      }]}
                      onPress={() => handleShareAchievement(selectedDef)}
                      disabled={sharing}
                      activeOpacity={0.7}
                    >
                      {sharing ? (
                        <ActivityIndicator size="small" color={CATEGORY_COLORS[selectedDef.category] ?? Colors.gold} />
                      ) : (
                        <>
                          <Ionicons name="share-outline" size={16} color={CATEGORY_COLORS[selectedDef.category] ?? Colors.gold} />
                          <Text style={[styles.shareAchievementText, { color: CATEGORY_COLORS[selectedDef.category] ?? Colors.gold }]}>
                            Share
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </>
                ) : (() => {
                  const prog = getAchievementProgress(selectedDef.id, stats);
                  if (prog) {
                    const pct = Math.min(100, Math.round((prog.current / prog.target) * 100));
                    return (
                      <View style={styles.detailProgressContainer}>
                        <View style={[styles.detailProgressTrack, { backgroundColor: colors.border + '44' }]}>
                          <View
                            style={[
                              styles.detailProgressFill,
                              {
                                width: `${pct}%` as any,
                                backgroundColor: (CATEGORY_COLORS[selectedDef.category] ?? Colors.gold) + '88',
                              },
                            ]}
                          />
                        </View>
                        <Text style={[styles.detailProgressLabel, { color: colors.textSecondary }]}>
                          {prog.current} / {prog.target} — {pct}% complete
                        </Text>
                      </View>
                    );
                  }
                  return (
                    <Text style={[styles.detailLocked, { color: colors.textSecondary }]}>
                      Not yet unlocked
                    </Text>
                  );
                })()}
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  countBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  countText: { fontSize: 15, fontWeight: '600' },

  filtersBar: { borderBottomWidth: StyleSheet.hairlineWidth, maxHeight: 52 },
  filtersRow: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterLabel: { fontSize: 13, fontWeight: '600' },

  grid: { padding: 8 },
  gridSpacer: { flex: 1, margin: 4, minHeight: 110 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  detailSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    paddingBottom: 40,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ccc',
    marginBottom: 8,
  },
  detailIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailTitle: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  detailDesc: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  detailXPBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  detailXPText: { fontSize: 15, fontWeight: '700' },
  detailUnlocked: { fontSize: 14, fontWeight: '500' },
  detailLocked: { fontSize: 14 },
  detailProgressContainer: { width: '100%', alignItems: 'center', gap: 6, paddingHorizontal: 16 },
  detailProgressTrack: { width: '100%', height: 6, borderRadius: 3, overflow: 'hidden' },
  detailProgressFill: { height: 6, borderRadius: 3 },
  detailProgressLabel: { fontSize: 13, fontWeight: '500' },

  // Share button in detail modal
  shareAchievementBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 4,
  },
  shareAchievementText: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Single off-screen ViewShot wrapper
  offScreenWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 0,
    overflow: 'hidden',
  },
});
