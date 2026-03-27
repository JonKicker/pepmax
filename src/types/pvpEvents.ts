/**
 * pvpEvents types — Seasonal Events, Event Challenges, Crew vs Crew.
 *
 * Phase 3: PVP Overhaul — Seasonal Events & Crew PVP.
 */

export type EventStatus = 'upcoming' | 'active' | 'completed';
export type ChallengeDifficulty = 'normal' | 'hard' | 'extreme';

export type SeasonalEvent = {
  id: string;
  seasonId: string;
  name: string;                // e.g. "Iron Forge Week"
  description: string;
  startDate: number;           // timestamp ms
  endDate: number;             // timestamp ms
  status: EventStatus;
  challenges: EventChallenge[];
  exclusiveBadgeId?: string;   // badge only available during this event
  bonusXPMultiplier: number;   // e.g. 1.5 for 50% bonus XP during event
  themeColor: string;          // event-specific accent color (hex)
};

export type EventChallenge = {
  id: string;
  title: string;
  description: string;
  difficulty: ChallengeDifficulty;
  targetValue: number;
  targetUnit: string;          // "lbs", "miles", "days", etc.
  xpReward: number;            // scales: normal=50, hard=100, extreme=200
  rpReward: number;            // scales: normal=10, hard=25, extreme=50
  type: string;                // 'volume' | 'distance' | 'consistency' | 'cross_module'
};

export type UserEventProgress = {
  eventId: string;
  challengeProgress: Record<string, number>; // challengeId -> current value
  completedChallenges: string[];             // challengeId[]
  joinedAt: number;
  badgeClaimed: boolean;
};

// ─── Crew vs Crew ──────────────────────────────────────────────────────────

export type CrewChallenge = {
  id: string;
  title: string;
  description: string;
  metric: string;              // 'total_volume' | 'total_distance' | 'total_workouts'
  targetValue: number;
  targetUnit: string;
  startDate: number;
  endDate: number;
  status: EventStatus;
  xpRewardPerMember: number;
  rpRewardPerMember: number;
};

export type CrewChallengeEntry = {
  crewId: string;
  crewName: string;
  crewEmoji: string;
  totalProgress: number;
  memberContributions: Record<string, number>; // uid -> contribution
  memberCount: number;
};
