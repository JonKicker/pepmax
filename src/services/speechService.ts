/**
 * speechService — audio transcription for voice food logging.
 *
 * v1 implementation: returns a text-input fallback result.
 * Future versions will call a real STT (Speech-to-Text) API.
 *
 * RAY MANDATORY: expo-av is NOT imported at module level.
 * Any future use of expo-av Audio must be done via dynamic import
 * or lazy require inside the function body to avoid startup cost.
 *
 * Usage:
 *   const result = await transcribeAudio(uri);
 *   if (result.error) { ... }
 *   else { const text = result.data.text; }
 */

import type { ServiceResult } from '../types/service';
import type { TranscribeResult } from '../types/voiceLog';

/**
 * Attempts to transcribe an audio recording at the given URI.
 *
 * v1: Always returns a fallback result indicating the caller should present
 * a text-input field for manual entry. The uri parameter is accepted so
 * the function signature is stable for future STT integration.
 *
 * RAY MANDATORY: expo-av is NOT imported at module level.
 *
 * @param _uri - File URI of the recorded audio (unused in v1).
 * @returns ServiceResult containing TranscribeResult.
 */
export async function transcribeAudio(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _uri: string,
): Promise<ServiceResult<TranscribeResult>> {
  // v1: No STT backend wired yet. Return a fallback result so callers
  // can gracefully present a text input.
  return {
    data: {
      text: '',
      fromSpeech: false,
    },
    error: null,
  };
}

/**
 * Checks whether a real STT engine is available in the current build.
 * Returns false in v1 — always falls back to text input.
 */
export function isSpeechAvailable(): boolean {
  return false;
}
