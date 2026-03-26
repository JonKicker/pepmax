/**
 * ConsistencyCard — 30-day on-plan visual calendar with weekly ring and stats.
 */
import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { DashboardCard } from './DashboardCard';
import { Colors } from '../../constants/theme';
import type { Theme } from '../../constants/theme';
import type { ConsistencyData, DayConsistency } from '../../types/consistency';

const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DOT_SIZE = 28;

type Props = {
  consistency: ConsistencyData | null;
  colors: Theme['colors'];
  onToggleRestDay: (dateKey: string) => void;
  onPress?: () => void;
};

type TooltipState = {
  day: DayConsistency;
  index: number;
} | null;

function dotColor(status: DayConsistency['status'], colors: Theme['colors']): string {
  switch (status) {
    case 'full':    return Colors.nutrition;
    case 'partial': return Colors.warning;
    case 'rest':    return colors.border;
    case 'missed':  return Colors.error;
  }
}

function encouragingMessage(percent: number): string {
  if (percent >= 80) return 'Outstanding consistency!';
  if (percent >= 60) return 'Solid work, keep it up!';
  if (percent >= 40) return 'Building momentum...';
  return 'Every day is a fresh start';
}

function ringColor(score: number): string {
  if (score >= 70) return Colors.nutrition;
  if (score >= 40) return Colors.warning;
  return Colors.error;
}

export function ConsistencyCard({ consistency, colors, onToggleRestDay, onPress }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const [tooltip, setTooltip] = useState<TooltipState>(null);

  const days = consistency?.days ?? [];
  const onPlanLast14 = consistency?.onPlanLast14 ?? 0;
  const monthlyPercent = consistency?.monthlyPercent ?? 0;
  const weeklyScore = consistency?.weeklyScore ?? 0;

  const pct = weeklyScore / 100;
  const color = ringColor(weeklyScore);

  const handleDotPress = (day: DayConsistency, index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTooltip((prev) => (prev?.day.date === day.date ? null : { day, index }));
  };

  const handleToggleRest = () => {
    if (!tooltip) return;
    onToggleRestDay(tooltip.day.date);
    setTooltip(null);
  };

  return (
    <DashboardCard
      title="Consistency"
      icon="checkmark-done-outline"
      iconColor={Colors.gold}
      colors={colors}
      onPress={onPress}
    >
      {/* Headline row */}
      <View style={styles.headlineRow}>
        <View style={styles.headlineLeft}>
          <Text style={[styles.onPlanNum, { color: colors.textPrimary }]}>{onPlanLast14}</Text>
          <Text style={[styles.onPlanLabel, { color: colors.textSecondary }]}>
            {' '}of last 14 days on plan
          </Text>
        </View>

        {/* Weekly ring */}
        <View style={styles.ringContainer}>
          <View style={[styles.ringBg, { borderColor: color + '25' }]}>
            <View
              style={[
                styles.ringProgress,
                {
                  borderColor: color,
                  borderTopColor: 'transparent',
                  borderRightColor: pct > 0.25 ? color : 'transparent',
                  borderBottomColor: pct > 0.5 ? color : 'transparent',
                  borderLeftColor: pct > 0.75 ? color : 'transparent',
                  transform: [{ rotate: `${pct * 360}deg` }],
                },
              ]}
            />
          </View>
          <View style={styles.ringCenter}>
            <Text style={[styles.ringPct, { color: colors.textPrimary }]}>
              {Math.round(weeklyScore)}%
            </Text>
          </View>
        </View>
      </View>

      {/* Monthly subtitle */}
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {Math.round(monthlyPercent)}% consistency this month
      </Text>

      {/* 30-day calendar strip */}
      <View>
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          style={styles.calendarScroll}
          contentContainerStyle={styles.calendarContent}
        >
          {days.map((day, index) => {
            const dateObj = new Date(day.date + 'T12:00:00');
            const weekdayIdx = dateObj.getDay();
            const dateNum = dateObj.getDate();
            const isSelected = tooltip?.day.date === day.date;

            return (
              <TouchableOpacity
                key={day.date}
                style={styles.dayColumn}
                onPress={() => handleDotPress(day, index)}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.weekdayLabel, { color: colors.textSecondary }]}>
                  {WEEKDAY_INITIALS[weekdayIdx]}
                </Text>
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: dotColor(day.status, colors),
                      borderWidth: isSelected ? 2 : 0,
                      borderColor: colors.textPrimary,
                    },
                  ]}
                />
                <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>
                  {dateNum}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Tooltip overlay */}
        {tooltip && (
          <TouchableWithoutFeedback onPress={() => setTooltip(null)}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>
        )}
        {tooltip && (
          <View
            style={[
              styles.tooltip,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            pointerEvents="box-none"
          >
            <Text style={[styles.tooltipDate, { color: colors.textSecondary }]}>
              {new Date(tooltip.day.date + 'T12:00:00').toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </Text>
            <View style={styles.tooltipRow}>
              <Text style={[styles.tooltipItem, { color: colors.textPrimary }]}>
                Workout {tooltip.day.workoutLogged ? '✓' : '✗'}
                {tooltip.day.workoutLogged && tooltip.day.isBareMinimum ? ' (min)' : ''}
              </Text>
            </View>
            {tooltip.day.nutritionPercent > 0 && (
              <View style={styles.tooltipRow}>
                <Text style={[styles.tooltipItem, { color: colors.textPrimary }]}>
                  Nutrition {Math.round(tooltip.day.nutritionPercent)}%
                </Text>
              </View>
            )}
            <View style={styles.tooltipRow}>
              <Text style={[styles.tooltipItem, { color: colors.textPrimary }]}>
                Peptides {tooltip.day.peptideLogged ? '✓' : '✗'}
              </Text>
            </View>
            {tooltip.day.isRestDay && !tooltip.day.restDayOverride ? (
              <Text style={[styles.restLabel, { color: colors.textSecondary }]}>
                Configured rest day
              </Text>
            ) : (
              <TouchableOpacity
                style={[styles.restBtn, { borderColor: colors.border }]}
                onPress={handleToggleRest}
              >
                <Text style={[styles.restBtnText, { color: colors.textSecondary }]}>
                  {tooltip.day.restDayOverride ? 'Unmark rest day' : 'Mark as rest day'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Encouraging message */}
      <Text style={[styles.encouragement, { color: colors.textSecondary }]}>
        {encouragingMessage(monthlyPercent)}
      </Text>
    </DashboardCard>
  );
}

const styles = StyleSheet.create({
  headlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  headlineLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexShrink: 1,
  },
  onPlanNum: { fontSize: 32, fontWeight: '800' },
  onPlanLabel: { fontSize: 14 },
  // Ring
  ringContainer: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringBg: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 4,
  },
  ringProgress: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 4,
  },
  ringCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringPct: { fontSize: 11, fontWeight: '700' },
  // Subtitle
  subtitle: { fontSize: 13, marginBottom: 12 },
  // Calendar
  calendarScroll: { marginHorizontal: -4 },
  calendarContent: { paddingHorizontal: 4, gap: 4 },
  dayColumn: {
    alignItems: 'center',
    gap: 2,
    width: DOT_SIZE + 4,
  },
  weekdayLabel: { fontSize: 10 },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
  dateLabel: { fontSize: 10 },
  // Tooltip
  tooltip: {
    position: 'absolute',
    bottom: 50,
    left: 8,
    right: 8,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    zIndex: 10,
  },
  tooltipDate: { fontSize: 12, marginBottom: 6 },
  tooltipRow: { marginBottom: 2 },
  tooltipItem: { fontSize: 13 },
  restBtn: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
  },
  restBtnText: { fontSize: 12 },
  restLabel: { fontSize: 12, marginTop: 8, fontStyle: 'italic' },
  // Encouragement
  encouragement: { fontSize: 12, marginTop: 10, fontStyle: 'italic' },
});
