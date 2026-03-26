/**
 * ShareCardGenerator — off-screen card rendered at 360x640 and captured at 3x
 * for a 1080x1920 Instagram-Story-sized PNG.
 *
 * Card layout (top to bottom):
 *   1. Dark background (#1F2937) with a semi-transparent gradient overlay View
 *   2. "pepmax.app" branding — purple, centered
 *   3. VS row — two 80px initials circles, "VS" in the middle
 *   4. RadarChart at size=280
 *   5. Stat highlight rows per visible module
 *   6. Footer — "Compare your stats at pepmax.app"
 *
 * Privacy rule: a stat row renders only when BOTH users have a value !== -1
 * AND the module key is in `data.visibleModules`.
 *
 * Pure helpers (`buildVisibleStats`, `STAT_DEFINITIONS`) live in
 * src/utils/shareCardStats.ts so they can be unit-tested without importing
 * React Native native modules.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import RadarChart from './RadarChart';
import {
  buildVisibleStats,
  STAT_DEFINITIONS,
  type StatDefinition,
} from '../../utils/shareCardStats';
import type { CompareCardData } from '../../types/shareCard';

// Re-export pure helpers so callers can import from one place if desired.
export { buildVisibleStats, STAT_DEFINITIONS };
export type { StatDefinition };

// ─── Canvas dimensions ────────────────────────────────────────────────────────

const CARD_W = 360;
const CARD_H = 640;

// ─── Accent / color constants ─────────────────────────────────────────────────

const ACCENT = '#7C3AED';
const GRAY = '#6B7280';
const OVERLAY_COLOR = 'rgba(124, 58, 237, 0.06)'; // subtle purple tint overlay

// ─── Stat row sub-component ───────────────────────────────────────────────────

type StatRowProps = {
  def: StatDefinition;
  myVal: number;
  oppVal: number;
};

function StatRow({ def, myVal, oppVal }: StatRowProps) {
  // Determine winner (null = tie)
  let myWins: boolean | null = null;
  if (myVal !== oppVal) {
    myWins = def.winDir === 'higher' ? myVal > oppVal : myVal < oppVal;
  }

  const myColor = myWins === true ? ACCENT : myWins === false ? GRAY : '#FFFFFF';
  const oppColor = myWins === false ? ACCENT : myWins === true ? GRAY : '#FFFFFF';

  return (
    <View style={styles.statRow}>
      <Text style={[styles.statValue, { color: myColor }]} numberOfLines={1}>
        {def.format(myVal)}
      </Text>
      <Text style={styles.statLabel}>{def.label}</Text>
      <Text style={[styles.statValue, { color: oppColor }]} numberOfLines={1}>
        {def.format(oppVal)}
      </Text>
    </View>
  );
}

// ─── Props type ───────────────────────────────────────────────────────────────

type ShareCardGeneratorProps = {
  data: CompareCardData;
};

// ─── Main component ───────────────────────────────────────────────────────────

export function ShareCardGenerator({ data }: ShareCardGeneratorProps) {
  const { myName, opponentName, myScores, opponentScores, visibleModules, units = 'metric' } = data;

  const visibleStats = buildVisibleStats(myScores, opponentScores, visibleModules, units);

  return (
    <View
      style={styles.canvas}
      accessible={true}
      accessibilityRole="image"
      accessibilityLabel={`Compare card: ${myName} versus ${opponentName}`}
    >
      {/* Semi-transparent gradient overlay (no expo-linear-gradient dependency) */}
      <View style={styles.gradientOverlay} pointerEvents="none" />

      {/* Branding — top */}
      <Text style={styles.brandingTop}>pepmax.app</Text>

      {/* VS Row */}
      <View style={styles.vsRow}>
        {/* My avatar */}
        <View style={styles.avatarBlock}>
          <View style={[styles.avatarCircle, { backgroundColor: ACCENT }]}>
            <Text style={styles.avatarInitial}>{myName.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.vsName} numberOfLines={1}>{myName}</Text>
        </View>

        <Text style={styles.vsText}>VS</Text>

        {/* Opponent avatar */}
        <View style={styles.avatarBlock}>
          <View style={[styles.avatarCircle, { backgroundColor: '#2563EB' }]}>
            <Text style={styles.avatarInitial}>{opponentName.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.vsName} numberOfLines={1}>{opponentName}</Text>
        </View>
      </View>

      {/* Radar Chart */}
      <View style={styles.radarWrapper}>
        <RadarChart
          userScores={myScores}
          opponentScores={opponentScores}
          userName={myName}
          opponentName={opponentName}
          size={280}
        />
      </View>

      {/* Stat rows */}
      {visibleStats.length > 0 && (
        <View style={styles.statsContainer}>
          {visibleStats.map((def) => (
            <StatRow
              key={`${def.module}-${def.field}`}
              def={def}
              myVal={myScores[def.field] as number}
              oppVal={opponentScores[def.field] as number}
            />
          ))}
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Compare your stats at pepmax.app</Text>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  canvas: {
    width: CARD_W,
    height: CARD_H,
    backgroundColor: '#1F2937',
    overflow: 'hidden',
    alignItems: 'center',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: OVERLAY_COLOR,
  },
  brandingTop: {
    color: ACCENT,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },

  // VS row
  vsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 24,
    marginBottom: 8,
    gap: 12,
  },
  avatarBlock: {
    alignItems: 'center',
    flex: 1,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  vsName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    maxWidth: 100,
  },
  vsText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
    textAlign: 'center',
    minWidth: 40,
  },

  // Radar
  radarWrapper: {
    alignItems: 'center',
    marginBottom: 8,
  },

  // Stats
  statsContainer: {
    width: '100%',
    paddingHorizontal: 16,
    gap: 4,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
    width: 90,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    flex: 1,
    textAlign: 'center',
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  footerText: {
    color: '#9CA3AF',
    fontSize: 11,
    textAlign: 'center',
  },
});
