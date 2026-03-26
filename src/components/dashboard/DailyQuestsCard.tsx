/**
 * DailyQuestsCard — shows 3 daily quests with completion state and bonus claim.
 *
 * Layout:
 *   - Card header: "Daily Quests" with target icon
 *   - 3 quest rows: checkbox, description, module icon, XP pill
 *   - Completed quests: filled checkbox + strikethrough text
 *   - Bonus row: "Claim +25 XP Bonus" (disabled until all 3 done, hidden after claimed)
 *   - Footer: countdown to local midnight
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { DashboardCard } from './DashboardCard';
import { Colors } from '../../constants/theme';
import { SkeletonLoader } from '../SkeletonLoader';
import type { Theme } from '../../constants/theme';
import type { Quest } from '../../types/challenges';
import type { XPModule } from '../../types/gamification';

// ─── Module metadata ─────────────────────────────────────────────────────────

const MODULE_ICON: Record<XPModule, React.ComponentProps<typeof Ionicons>['name']> = {
  peptides: 'eyedrop-outline',
  gym: 'barbell-outline',
  nutrition: 'nutrition-outline',
  cardio: 'bicycle-outline',
  recovery: 'moon-outline',
  system: 'star-outline',
};

const MODULE_COLOR: Record<XPModule, string> = {
  peptides: Colors.peptide,
  gym: Colors.gym,
  nutrition: Colors.nutrition,
  cardio: Colors.cardio,
  recovery: Colors.recovery,
  system: Colors.gold,
};

// ─── Countdown helpers ────────────────────────────────────────────────────────

function getMidnightMs(): number {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return midnight.getTime() - now.getTime();
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function QuestRow({
  quest,
  colors,
}: {
  quest: Quest;
  colors: Theme['colors'];
}) {
  const done = quest.status === 'completed';
  const moduleColor = MODULE_COLOR[quest.module] ?? Colors.accent;
  const moduleIcon = MODULE_ICON[quest.module] ?? 'star-outline';

  return (
    <View
      style={styles.questRow}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={`${quest.title}, ${done ? 'completed' : 'incomplete'}, ${quest.xpReward} XP`}
    >
      {/* Checkbox */}
      <View
        style={[
          styles.checkbox,
          done
            ? { backgroundColor: Colors.accent, borderColor: Colors.accent }
            : { borderColor: colors.border },
        ]}
      >
        {done && <Ionicons name="checkmark" size={12} color="#fff" />}
      </View>

      {/* Description */}
      <Text
        style={[
          styles.questText,
          { color: done ? colors.textSecondary : colors.textPrimary },
          done && styles.strikethrough,
        ]}
        numberOfLines={2}
      >
        {quest.title}
      </Text>

      {/* Module icon */}
      <View style={[styles.moduleIcon, { backgroundColor: moduleColor + '18' }]}>
        <Ionicons name={moduleIcon} size={13} color={moduleColor} />
      </View>

      {/* XP pill */}
      <View style={[styles.xpPill, { backgroundColor: Colors.gold + '22' }]}>
        <Text style={[styles.xpPillText, { color: Colors.gold }]}>
          +{quest.xpReward}
        </Text>
      </View>
    </View>
  );
}

// ─── Countdown ticker ─────────────────────────────────────────────────────────

function MidnightCountdown({ colors }: { colors: Theme['colors'] }) {
  const [remaining, setRemaining] = useState(getMidnightMs());

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(getMidnightMs());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <Text style={[styles.countdown, { color: colors.textSecondary }]}>
      Resets in {formatCountdown(remaining)}
    </Text>
  );
}

// ─── Main card ────────────────────────────────────────────────────────────────

type Props = {
  quests: Quest[];
  completedCount: number;
  allDone: boolean;
  bonusClaimed: boolean;
  loading: boolean;
  colors: Theme['colors'];
  onClaimBonus: () => Promise<void>;
};

export function DailyQuestsCard({
  quests,
  completedCount,
  allDone,
  bonusClaimed,
  loading,
  colors,
  onClaimBonus,
}: Props) {
  const [claiming, setClaiming] = useState(false);

  async function handleClaim() {
    if (claiming || bonusClaimed || !allDone) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setClaiming(true);
    try {
      await onClaimBonus();
    } finally {
      setClaiming(false);
    }
  }

  const headerSubtitle = loading
    ? ''
    : `${completedCount}/${quests.length} done`;

  return (
    <DashboardCard
      title={`Daily Quests${headerSubtitle ? '  ' + headerSubtitle : ''}`}
      icon="trophy-outline"
      iconColor={Colors.gold}
      colors={colors}
    >
      {loading ? (
        <View style={{ gap: 10, paddingVertical: 8 }}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <SkeletonLoader width={22} height={22} style={{ borderRadius: 11 }} />
              <SkeletonLoader width="60%" height={14} />
              <View style={{ flex: 1 }} />
              <SkeletonLoader width={40} height={20} style={{ borderRadius: 8 }} />
            </View>
          ))}
        </View>
      ) : (
        <>
          {/* Quest rows */}
          {quests.map((quest) => (
            <QuestRow key={quest.id} quest={quest} colors={colors} />
          ))}

          {/* Separator */}
          <View style={[styles.separator, { backgroundColor: colors.border }]} />

          {/* Bonus claim button — hidden once claimed */}
          {!bonusClaimed && (
            <TouchableOpacity
              style={[
                styles.bonusBtn,
                allDone
                  ? { backgroundColor: Colors.gold }
                  : { backgroundColor: colors.border },
              ]}
              onPress={handleClaim}
              disabled={!allDone || claiming}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={allDone ? 'Claim 25 XP bonus' : 'Complete all 3 quests to unlock bonus'}
              accessibilityState={{ disabled: !allDone || claiming }}
            >
              {claiming ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons
                    name="gift-outline"
                    size={16}
                    color={allDone ? '#fff' : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.bonusBtnText,
                      { color: allDone ? '#fff' : colors.textSecondary },
                    ]}
                  >
                    {allDone ? 'Claim +25 XP Bonus' : 'Complete all 3 to unlock bonus'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Bonus claimed state */}
          {bonusClaimed && (
            <View style={styles.bonusClaimed}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.gold} />
              <Text style={[styles.bonusClaimedText, { color: Colors.gold }]}>
                Bonus claimed!
              </Text>
            </View>
          )}

          {/* Countdown */}
          <MidnightCountdown colors={colors} />
        </>
      )}
    </DashboardCard>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  loadingRow: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  questRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  questText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
  },
  strikethrough: {
    textDecorationLine: 'line-through',
  },
  moduleIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  xpPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    flexShrink: 0,
  },
  xpPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  separator: {
    height: 1,
    marginVertical: 10,
  },
  bonusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
    marginBottom: 6,
    minHeight: 44,
  },
  bonusBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  bonusClaimed: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    marginBottom: 6,
  },
  bonusClaimedText: {
    fontSize: 14,
    fontWeight: '700',
  },
  countdown: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
});
