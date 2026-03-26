/**
 * SkeletonScreen — per-tab loading skeletons.
 *
 * Named exports: PeptidesSkeleton, TrainingSkeleton, CardioSkeleton, NutritionSkeleton.
 * Each mimics its tab's layout using SkeletonLoader blocks inside GlassCard / GlassBackground.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SkeletonLoader } from './SkeletonLoader';
import { GlassCard } from './GlassCard';
import { GlassBackground } from './GlassBackground';

// ─── PeptidesSkeleton ──────────────────────────────────────────────────────────

export function PeptidesSkeleton() {
  return (
    <GlassBackground>
      <View style={styles.container}>
        {/* Log Dose button placeholder */}
        <View style={styles.logDoseWrapper}>
          <SkeletonLoader width="100%" height={48} borderRadius={12} />
        </View>

        {/* 6 quick-action grid buttons (3 × 2) */}
        <View style={styles.grid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonLoader key={i} width="30%" height={40} borderRadius={10} style={styles.gridItem} />
          ))}
        </View>

        {/* 3 card placeholders with accent bar + text lines */}
        {Array.from({ length: 3 }).map((_, i) => (
          <GlassCard key={i} intensity="subtle" style={styles.card} padding={0}>
            <View style={styles.cardInner}>
              <View style={styles.cardAccent} />
              <View style={styles.cardBody}>
                <SkeletonLoader width="60%" height={14} borderRadius={6} style={{ marginBottom: 8 }} />
                <SkeletonLoader width="80%" height={12} borderRadius={6} style={{ marginBottom: 6 }} />
                <SkeletonLoader width="50%" height={12} borderRadius={6} />
              </View>
            </View>
          </GlassCard>
        ))}
      </View>
    </GlassBackground>
  );
}

// ─── TrainingSkeleton ─────────────────────────────────────────────────────────

export function TrainingSkeleton() {
  return (
    <GlassBackground>
      <View style={styles.container}>
        {/* 5 quick-action grid buttons */}
        <View style={styles.grid}>
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonLoader key={i} width="30%" height={40} borderRadius={10} style={styles.gridItem} />
          ))}
        </View>

        {/* Body measurement card */}
        <View style={styles.sectionPad}>
          <SkeletonLoader width="100%" height={80} borderRadius={14} />
        </View>

        {/* 3 workout card placeholders */}
        {Array.from({ length: 3 }).map((_, i) => (
          <GlassCard key={i} intensity="subtle" style={styles.card} padding={0}>
            <View style={styles.cardInner}>
              <View style={[styles.cardAccent, { backgroundColor: '#8E44AD33' }]} />
              <View style={styles.cardBody}>
                <SkeletonLoader width="70%" height={14} borderRadius={6} style={{ marginBottom: 8 }} />
                <SkeletonLoader width="45%" height={12} borderRadius={6} style={{ marginBottom: 6 }} />
                <SkeletonLoader width="35%" height={12} borderRadius={6} />
              </View>
            </View>
          </GlassCard>
        ))}
      </View>
    </GlassBackground>
  );
}

// ─── CardioSkeleton ───────────────────────────────────────────────────────────

export function CardioSkeleton() {
  return (
    <GlassBackground>
      <View style={styles.container}>
        {/* Weekly summary */}
        <View style={styles.sectionPad}>
          <SkeletonLoader width="100%" height={100} borderRadius={14} />
        </View>

        {/* Segments entry */}
        <View style={styles.sectionPad}>
          <SkeletonLoader width="100%" height={56} borderRadius={14} />
        </View>

        {/* 4 activity cards: circular icon + text lines */}
        {Array.from({ length: 4 }).map((_, i) => (
          <GlassCard key={i} intensity="subtle" style={styles.card} padding={16}>
            <View style={styles.activityRow}>
              <SkeletonLoader width={44} height={44} borderRadius={22} />
              <View style={styles.activityText}>
                <SkeletonLoader width="50%" height={14} borderRadius={6} style={{ marginBottom: 8 }} />
                <SkeletonLoader width="75%" height={12} borderRadius={6} style={{ marginBottom: 6 }} />
                <SkeletonLoader width="30%" height={30} borderRadius={20} />
              </View>
            </View>
          </GlassCard>
        ))}
      </View>
    </GlassBackground>
  );
}

// ─── NutritionSkeleton ────────────────────────────────────────────────────────

export function NutritionSkeleton() {
  return (
    <GlassBackground>
      <View style={styles.container}>
        {/* Date label */}
        <View style={styles.dateLabelWrap}>
          <SkeletonLoader width={200} height={13} borderRadius={6} />
        </View>

        {/* Calorie ring */}
        <View style={styles.ringWrap}>
          <SkeletonLoader width={200} height={200} borderRadius={100} />
        </View>

        {/* Macros card */}
        <View style={styles.sectionPad}>
          <SkeletonLoader width="100%" height={90} borderRadius={14} />
        </View>

        {/* 4 meal section bars */}
        {Array.from({ length: 4 }).map((_, i) => (
          <View key={i} style={styles.sectionPad}>
            <SkeletonLoader width="100%" height={44} borderRadius={10} />
          </View>
        ))}
      </View>
    </GlassBackground>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  logDoseWrapper: {
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  gridItem: {
    flexGrow: 1,
  },
  card: {
    marginBottom: 10,
    overflow: 'hidden',
  },
  cardInner: {
    flexDirection: 'row',
  },
  cardAccent: {
    width: 4,
    backgroundColor: '#2E86C133',
  },
  cardBody: {
    flex: 1,
    padding: 14,
  },
  sectionPad: {
    marginBottom: 12,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  activityText: {
    flex: 1,
  },
  dateLabelWrap: {
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 4,
  },
  ringWrap: {
    alignItems: 'center',
    marginBottom: 20,
  },
});
