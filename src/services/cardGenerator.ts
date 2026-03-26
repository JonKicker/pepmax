/**
 * cardGenerator — captures a ShareableCard ViewShot ref to a PNG and shares it.
 *
 * Follows ServiceResult<T> pattern: never throws, always returns { data, error }.
 * No Sentry imports — uses analytics events only (project pattern).
 */
import * as Sharing from 'expo-sharing';
import { analytics, AnalyticsEvent } from './analytics';
import type { ServiceResult } from '../types/service';
import type { ShareCardData } from '../types/shareCard';

// react-native-view-shot doesn't ship types that include a ref shape we can
// import easily, so we use the minimal interface we actually call.
export type ViewShotRef = {
  capture: () => Promise<string>;
};

// ─── captureCard ─────────────────────────────────────────────────────────────

/**
 * Triggers a ViewShot capture and returns the local file URI.
 * Returns an error if the ref is not ready or capture fails.
 */
export async function captureCard(
  viewShotRef: React.RefObject<ViewShotRef>,
): Promise<ServiceResult<string>> {
  if (!viewShotRef.current) {
    return { data: null, error: new Error('ViewShot ref is not mounted') };
  }

  try {
    const uri = await viewShotRef.current.capture();
    return { data: uri, error: null };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    analytics.track(AnalyticsEvent.CARD_CAPTURE_FAILED, {
      reason: error.message.slice(0, 120),
    });
    return { data: null, error };
  }
}

// ─── captureAndShare ─────────────────────────────────────────────────────────

/**
 * Captures the card and opens the native share sheet.
 *
 * Checks Sharing.isAvailableAsync() first — returns an error on devices where
 * sharing is unavailable (e.g. simulators).
 * Analytics is fire-and-forget after success.
 */
export async function captureAndShare(
  viewShotRef: React.RefObject<ViewShotRef>,
  cardData: ShareCardData,
): Promise<ServiceResult<void>> {
  // Guard: sharing must be available on this device
  const sharingAvailable = await Sharing.isAvailableAsync();
  if (!sharingAvailable) {
    return {
      data: null,
      error: new Error('Sharing is not available on this device'),
    };
  }

  const captureResult = await captureCard(viewShotRef);
  if (captureResult.error || !captureResult.data) {
    return { data: null, error: captureResult.error ?? new Error('Capture returned no URI') };
  }

  const dialogTitle = cardData.type === 'compare'
    ? 'Share comparison'
    : 'Share your achievement';

  try {
    await Sharing.shareAsync(captureResult.data, {
      mimeType: 'image/png',
      dialogTitle,
      UTI: 'public.png',
    });

    // Fire-and-forget analytics
    analytics.track(AnalyticsEvent.CARD_SHARED, {
      card_type: cardData.type,
    });

    return { data: undefined, error: null };
  } catch (err) {
    // User dismissing the share sheet throws on some platforms — treat as success
    // unless it's a genuine error (not a cancellation).
    const error = err instanceof Error ? err : new Error(String(err));
    const msg = error.message.toLowerCase();
    if (msg.includes('cancel') || msg.includes('dismiss') || msg.includes('user')) {
      // Treat cancellation as a no-op success
      return { data: undefined, error: null };
    }
    return { data: null, error };
  }
}
