/**
 * cardGenerator.test.ts
 *
 * Tests for pure logic in cardGenerator.ts.
 * ViewShot and expo-sharing are mocked so no native modules are required.
 */
import type { ServiceResult } from '../types/service';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

jest.mock('../services/analytics', () => ({
  analytics: { track: jest.fn() },
  AnalyticsEvent: {
    CARD_SHARED: 'card_shared',
    CARD_CAPTURE_FAILED: 'card_capture_failed',
  },
}));

import * as Sharing from 'expo-sharing';
import { analytics } from '../services/analytics';
import { captureCard, captureAndShare } from '../services/cardGenerator';
import type { ShareCardData } from '../types/shareCard';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRef(capture?: () => Promise<string>) {
  return {
    current: capture ? { capture } : null,
  } as React.RefObject<{ capture: () => Promise<string> }>;
}

const workoutCard: ShareCardData = {
  type: 'workout',
  templateName: 'Push Day',
  exerciseCount: 4,
  totalVolume: 3500,
  volumeUnit: 'lbs',
  duration: 2700,
  setCount: 16,
  prCount: 1,
};

// ─── captureCard ─────────────────────────────────────────────────────────────

describe('captureCard', () => {
  it('returns error when ref.current is null', async () => {
    const ref = makeRef(undefined);
    const result = await captureCard(ref);
    expect(result.error).not.toBeNull();
    expect(result.data).toBeNull();
    expect(result.error!.message).toMatch(/not mounted/i);
  });

  it('returns the URI on successful capture', async () => {
    const ref = makeRef(() => Promise.resolve('file:///tmp/card.png'));
    const result = await captureCard(ref);
    expect(result.error).toBeNull();
    expect(result.data).toBe('file:///tmp/card.png');
  });

  it('returns error and tracks CARD_CAPTURE_FAILED when capture throws', async () => {
    const ref = makeRef(() => Promise.reject(new Error('native crash')));
    const result = await captureCard(ref);
    expect(result.error).not.toBeNull();
    expect(result.data).toBeNull();
    expect(result.error!.message).toBe('native crash');
    expect((analytics.track as jest.Mock)).toHaveBeenCalledWith(
      'card_capture_failed',
      expect.objectContaining({ reason: expect.any(String) }),
    );
  });
});

// ─── captureAndShare ──────────────────────────────────────────────────────────

describe('captureAndShare', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns error when Sharing.isAvailableAsync() is false', async () => {
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(false);
    const ref = makeRef(() => Promise.resolve('file:///tmp/card.png'));
    const result = await captureAndShare(ref, workoutCard);
    expect(result.error).not.toBeNull();
    expect(result.error!.message).toMatch(/not available/i);
    expect(result.data).toBeNull();
  });

  it('returns error when capture fails', async () => {
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
    const ref = makeRef(() => Promise.reject(new Error('capture failed')));
    const result = await captureAndShare(ref, workoutCard);
    expect(result.error).not.toBeNull();
    expect(result.data).toBeNull();
  });

  it('calls shareAsync and tracks CARD_SHARED on success', async () => {
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
    (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined);
    const ref = makeRef(() => Promise.resolve('file:///tmp/card.png'));
    const result = await captureAndShare(ref, workoutCard);
    expect(result.error).toBeNull();
    expect(result.data).toBeUndefined();
    expect(Sharing.shareAsync).toHaveBeenCalledWith(
      'file:///tmp/card.png',
      expect.objectContaining({ mimeType: 'image/png' }),
    );
    expect((analytics.track as jest.Mock)).toHaveBeenCalledWith(
      'card_shared',
      expect.objectContaining({ card_type: 'workout' }),
    );
  });

  it('treats user cancellation as success (no-op)', async () => {
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
    (Sharing.shareAsync as jest.Mock).mockRejectedValue(new Error('User cancelled'));
    const ref = makeRef(() => Promise.resolve('file:///tmp/card.png'));
    const result = await captureAndShare(ref, workoutCard);
    // Cancellation should be treated as a non-error
    expect(result.error).toBeNull();
    expect(result.data).toBeUndefined();
  });

  it('returns error for genuine share failures', async () => {
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
    (Sharing.shareAsync as jest.Mock).mockRejectedValue(new Error('Permission denied'));
    const ref = makeRef(() => Promise.resolve('file:///tmp/card.png'));
    const result = await captureAndShare(ref, workoutCard);
    expect(result.error).not.toBeNull();
    expect(result.error!.message).toBe('Permission denied');
  });

  it('passes card_type correctly for all card types', async () => {
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
    (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined);

    const cards: ShareCardData[] = [
      workoutCard,
      { type: 'pr', exerciseName: 'Bench Press', newValue: '225 lbs x 3', oldValue: '215 lbs x 3', date: new Date().toISOString() },
      { type: 'challenge', challengeTitle: '10k Steps', challengeType: 'steps', finalResult: '12000 steps', rank: 3, participantCount: 150, xpEarned: 100 },
      { type: 'levelUp', newLevel: 10, totalXP: 2500, rankTier: 'Silver', rankColor: '#C0C0C0', rankIcon: 'shield-half-outline' },
      { type: 'achievement', achievementId: 'first_rep', title: 'First Rep', description: 'Complete your first workout.', icon: 'barbell-outline', category: 'gym', unlockedDate: new Date().toISOString() },
    ];

    for (const card of cards) {
      jest.clearAllMocks();
      (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
      (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined);
      const ref = makeRef(() => Promise.resolve('file:///tmp/card.png'));
      await captureAndShare(ref, card);
      expect((analytics.track as jest.Mock)).toHaveBeenCalledWith(
        'card_shared',
        expect.objectContaining({ card_type: card.type }),
      );
    }
  });
});
