/**
 * ShareCardRenderer — generates shareable PVP moment images.
 *
 * Uses react-native-view-shot (v4.0.3, already installed) to capture
 * a dark-themed card as a PNG, then shares via expo-sharing.
 *
 * Card size: 400 × 600. Rendered off-viewport until capture is triggered.
 *
 * Types:
 *   rank_up        — old badge → arrow → new badge, "PROMOTED"
 *   duel_victory   — VS layout, stats, "VICTORY", win streak
 *   season_summary — season name, RP, peak tier badge, reward badge
 *   league_standing — rank position, weekly delta, league bracket
 *
 * Bottom branding: "@username" + tier badge + "pepmax.app"
 *
 * Props:
 *   type         — which card layout to render
 *   data         — card data (username, tier, type-specific fields)
 *   onCapture    — called with the captured image URI
 *   visible      — trigger capture when true
 */
import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { analytics, AnalyticsEvent } from '../../services/analytics';
import { RankBadge } from './RankBadge';
import { RANK_TIERS_V2 } from '../../utils/rankTierV2';
import {
  getShareCardTitle,
  getShareCardSubtitle,
  formatShareValue,
  type ShareCardData,
  type ShareCardType,
} from '../../utils/shareCardUtils';

// ─── Card constants ───────────────────────────────────────────────────────────

const CARD_WIDTH = 400;
const CARD_HEIGHT = 600;

// Card uses a dark static theme — not system theme-responsive because
// share cards must look consistent when saved to the camera roll on any device.
const CARD_BG = '#0F0F1A';
const CARD_SURFACE = '#1E1E2E';
const CARD_BORDER = '#2E2E42';
const CARD_TEXT_PRIMARY = '#FFFFFF';
const CARD_TEXT_SECONDARY = '#A0A0B8';
const CARD_ACCENT = '#6C5CE7';
const CARD_GOLD = '#FFD700';
const CARD_WIN = '#00B894';

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  type: ShareCardType;
  data: ShareCardData;
  onCapture: (uri: string) => void;
  visible: boolean;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTierColor(tier: string): string {
  return RANK_TIERS_V2.find((t) => t.tier === tier)?.color ?? '#FFFFFF';
}

// ─── Card layout sub-components ──────────────────────────────────────────────

function RankUpContent({ data }: { data: ShareCardData }) {
  const oldColor = data.oldTier ? getTierColor(data.oldTier) : CARD_TEXT_SECONDARY;
  const newColor = data.newTier ? getTierColor(data.newTier) : CARD_ACCENT;

  return (
    <View style={cardStyles.contentBlock}>
      <Text style={[cardStyles.promotedLabel, { color: CARD_WIN }]}>PROMOTED</Text>
      <View style={cardStyles.rankUpRow}>
        {data.oldTier && <RankBadge tier={data.oldTier} size="md" />}
        <Text style={[cardStyles.arrowText, { color: CARD_TEXT_SECONDARY }]}>→</Text>
        {data.newTier && <RankBadge tier={data.newTier} size="lg" glow />}
      </View>
      {data.oldTier && data.newTier && (
        <Text style={[cardStyles.rankUpSubtext, { color: CARD_TEXT_SECONDARY }]}>
          <Text style={{ color: oldColor }}>{data.oldTier.toUpperCase()}</Text>
          {' '}→{' '}
          <Text style={{ color: newColor }}>{data.newTier.toUpperCase()}</Text>
        </Text>
      )}
    </View>
  );
}

function DuelVictoryContent({ data }: { data: ShareCardData }) {
  return (
    <View style={cardStyles.contentBlock}>
      <Text style={[cardStyles.victoryLabel, { color: CARD_WIN }]}>VICTORY</Text>
      {data.opponentName && (
        <Text style={[cardStyles.vsText, { color: CARD_TEXT_SECONDARY }]}>
          vs <Text style={{ color: CARD_TEXT_PRIMARY }}>{data.opponentName}</Text>
        </Text>
      )}
      {data.metric && data.myValue !== undefined && data.theirValue !== undefined && (
        <View style={[cardStyles.statsBox, { backgroundColor: CARD_SURFACE, borderColor: CARD_BORDER }]}>
          <Text style={[cardStyles.statMetric, { color: CARD_TEXT_SECONDARY }]}>
            {data.metric}
          </Text>
          <View style={cardStyles.statValuesRow}>
            <Text style={[cardStyles.statValue, { color: CARD_GOLD }]}>
              {formatShareValue(data.myValue, '')}
            </Text>
            <Text style={[cardStyles.statDivider, { color: CARD_TEXT_SECONDARY }]}>vs</Text>
            <Text style={[cardStyles.statValue, { color: CARD_TEXT_SECONDARY }]}>
              {formatShareValue(data.theirValue, '')}
            </Text>
          </View>
        </View>
      )}
      {data.winStreak !== undefined && data.winStreak > 1 && (
        <View style={[cardStyles.streakPill, { backgroundColor: CARD_GOLD + '22', borderColor: CARD_GOLD + '66' }]}>
          <Text style={[cardStyles.streakText, { color: CARD_GOLD }]}>
            {data.winStreak}x Win Streak
          </Text>
        </View>
      )}
    </View>
  );
}

function SeasonSummaryContent({ data }: { data: ShareCardData }) {
  return (
    <View style={cardStyles.contentBlock}>
      {data.seasonName && (
        <Text style={[cardStyles.seasonName, { color: CARD_TEXT_SECONDARY }]}>
          {data.seasonName}
        </Text>
      )}
      {data.totalRP !== undefined && (
        <Text style={[cardStyles.totalRP, { color: CARD_GOLD }]}>
          {data.totalRP.toLocaleString('en-US')} RP
        </Text>
      )}
      {data.peakTier && (
        <View style={cardStyles.peakTierRow}>
          <Text style={[cardStyles.peakLabel, { color: CARD_TEXT_SECONDARY }]}>Peak tier</Text>
          <RankBadge tier={data.peakTier} size="md" glow />
        </View>
      )}
      {data.rewardTier && (
        <View style={[cardStyles.rewardPill, { backgroundColor: CARD_ACCENT + '22', borderColor: CARD_ACCENT + '66' }]}>
          <Text style={[cardStyles.rewardPillText, { color: CARD_ACCENT }]}>
            Reward: {data.rewardTier}
          </Text>
        </View>
      )}
    </View>
  );
}

function LeagueStandingContent({ data }: { data: ShareCardData }) {
  const delta = data.weeklyDelta;
  const deltaColor = delta === undefined
    ? CARD_TEXT_SECONDARY
    : delta > 0 ? CARD_WIN : delta < 0 ? '#E17055' : CARD_TEXT_SECONDARY;
  const deltaText = delta === undefined
    ? ''
    : delta > 0 ? `+${delta}` : `${delta}`;

  return (
    <View style={cardStyles.contentBlock}>
      {data.leagueRank !== undefined && (
        <Text style={[cardStyles.leagueRankNum, { color: CARD_GOLD }]}>
          #{data.leagueRank}
        </Text>
      )}
      {data.leagueSize !== undefined && (
        <Text style={[cardStyles.leagueSize, { color: CARD_TEXT_SECONDARY }]}>
          of {data.leagueSize} competitors
        </Text>
      )}
      {delta !== undefined && (
        <Text style={[cardStyles.weeklyDelta, { color: deltaColor }]}>
          {deltaText} this week
        </Text>
      )}
    </View>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ShareCardRenderer({ type, data, onCapture, visible }: Props) {
  const viewShotRef = useRef<ViewShot>(null);

  useEffect(() => {
    if (!visible) return;

    const capture = async () => {
      try {
        if (!viewShotRef.current) return;
        const uri = await viewShotRef.current.capture?.();
        if (!uri) return;

        analytics.track(AnalyticsEvent.SHARE_CARD_GENERATED, { type });
        onCapture(uri);

        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uri, {
            mimeType: 'image/png',
            dialogTitle: getShareCardTitle(type),
          });
          analytics.track(AnalyticsEvent.SHARE_CARD_SHARED, { type });
        }
      } catch {
        // Silently fail — capture is best-effort
      }
    };

    // Small delay to ensure layout is complete before capture
    const timer = setTimeout(capture, 150);
    return () => clearTimeout(timer);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const title = getShareCardTitle(type);
  const subtitle = getShareCardSubtitle(type, data);

  return (
    <View
      style={styles.offscreen}
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <ViewShot
        ref={viewShotRef}
        options={{ format: 'png', quality: 1.0 }}
        style={cardStyles.card}
      >
        {/* Branding header */}
        <View style={cardStyles.brandHeader}>
          <Text style={[cardStyles.brandText, { color: CARD_ACCENT }]}>PEPMAX</Text>
        </View>

        {/* Title */}
        <View style={cardStyles.titleBlock}>
          <Text style={[cardStyles.cardTitle, { color: CARD_TEXT_PRIMARY }]}>{title}</Text>
          <Text style={[cardStyles.cardSubtitle, { color: CARD_TEXT_SECONDARY }]} numberOfLines={2}>
            {subtitle}
          </Text>
        </View>

        {/* Type-specific content */}
        {type === 'rank_up' && <RankUpContent data={data} />}
        {type === 'duel_victory' && <DuelVictoryContent data={data} />}
        {type === 'season_summary' && <SeasonSummaryContent data={data} />}
        {type === 'league_standing' && <LeagueStandingContent data={data} />}

        {/* Footer */}
        <View style={[cardStyles.footer, { borderTopColor: CARD_BORDER }]}>
          <RankBadge tier={data.tier} size="sm" />
          <Text style={[cardStyles.footerUsername, { color: CARD_TEXT_PRIMARY }]}>
            @{data.username}
          </Text>
          <Text style={[cardStyles.footerBrand, { color: CARD_TEXT_SECONDARY }]}>
            pepmax.app
          </Text>
        </View>
      </ViewShot>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

// Offscreen positioning — card is rendered but not visible to the user
// until capture is complete. Negative top pushes it far off-screen.
const OFFSCREEN_OFFSET = Platform.OS === 'web' ? 9999 : -CARD_HEIGHT - 200;

const styles = StyleSheet.create({
  offscreen: {
    position: 'absolute',
    top: OFFSCREEN_OFFSET,
    left: 0,
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    overflow: 'hidden',
  },
});

const cardStyles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: CARD_BG,
    paddingHorizontal: 32,
    paddingVertical: 28,
    justifyContent: 'space-between',
  },
  brandHeader: {
    alignItems: 'flex-start',
  },
  brandText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 4,
  },
  titleBlock: {
    gap: 8,
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 2,
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  contentBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  // rank_up
  promotedLabel: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 4,
  },
  rankUpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  arrowText: {
    fontSize: 28,
    fontWeight: '900',
  },
  rankUpSubtext: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
  },
  // duel_victory
  victoryLabel: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 5,
  },
  vsText: {
    fontSize: 16,
    fontWeight: '600',
  },
  statsBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    width: '100%',
    gap: 8,
  },
  statMetric: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  statValuesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  statDivider: {
    fontSize: 12,
    fontWeight: '600',
  },
  streakPill: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  streakText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  // season_summary
  seasonName: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  totalRP: {
    fontSize: 42,
    fontWeight: '900',
  },
  peakTierRow: {
    alignItems: 'center',
    gap: 8,
  },
  peakLabel: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  rewardPill: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  rewardPillText: {
    fontSize: 14,
    fontWeight: '700',
  },
  // league_standing
  leagueRankNum: {
    fontSize: 64,
    fontWeight: '900',
    letterSpacing: -2,
  },
  leagueSize: {
    fontSize: 14,
    fontWeight: '500',
  },
  weeklyDelta: {
    fontSize: 20,
    fontWeight: '800',
  },
  // footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 16,
    gap: 10,
  },
  footerUsername: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  footerBrand: {
    fontSize: 12,
    fontWeight: '500',
  },
});
