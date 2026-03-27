/**
 * useVoiceRecording — manages expo-av Audio.Recording lifecycle for voice food logging.
 *
 * Returns a stable API for requesting mic permission, starting/stopping recording,
 * and getting the resulting audio URI.
 *
 * expo-av is imported at the top of this hook (not at module level of a service)
 * so that it's lazily bundled and only loaded when the hook is first used.
 *
 * Usage:
 *   const { isRecording, startRecording, stopRecording, audioUri, error } = useVoiceRecording();
 */

import { useState, useCallback, useRef } from 'react';
import type { RecordingState } from '../types/voiceLog';

// expo-av is loaded lazily via dynamic import to avoid startup cost
// and to follow the pattern established by speechService (no module-level import).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _audioModule: any = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getAudioModule(): Promise<any> {
  if (!_audioModule) {
    // Dynamic require — only loads expo-av when voice recording is first needed.
    // NOTE: expo-av must be installed (`npx expo install expo-av`) before this hook is used.
    // The dynamic require avoids compile-time errors when the package is not yet installed.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _audioModule = require('expo-av');
  }
  return _audioModule;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseVoiceRecordingResult {
  /** True while recording is in progress. */
  isRecording: boolean;
  /** Current lifecycle state. */
  recordingState: RecordingState;
  /** Starts recording. Requests mic permission if not yet granted. */
  startRecording: () => Promise<void>;
  /**
   * Stops recording, populates audioUri state, and RETURNS the URI directly
   * so callers don't need to rely on the state variable which may not yet
   * be updated when the await resolves.
   */
  stopRecording: () => Promise<string | null>;
  /** File URI of the recorded audio. Null until stopRecording completes. */
  audioUri: string | null;
  /** Error message if recording failed. Null on success. */
  error: string | null;
  /** Resets state back to idle (clears uri and error). */
  reset: () => void;
}

export function useVoiceRecording(): UseVoiceRecordingResult {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recordingRef = useRef<unknown>(null);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setAudioUri(null);
      setRecordingState('recording');

      const { Audio } = await getAudioModule();

      // Request permission
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        setError('Microphone permission denied. Please enable it in Settings.');
        setRecordingState('error');
        return;
      }

      // Configure audio session
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      recordingRef.current = recording;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start recording.';
      setError(msg);
      setRecordingState('error');
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    if (!recordingRef.current) {
      setError('No active recording to stop.');
      setRecordingState('error');
      return null;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rec = recordingRef.current as any;
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI() ?? null;
      recordingRef.current = null;
      setAudioUri(uri);
      setRecordingState('stopped');

      // Reset audio mode after recording
      const { Audio } = await getAudioModule();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      // Return the URI directly — callers must not rely on the audioUri state
      // variable immediately after await because setState is async.
      return uri;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to stop recording.';
      setError(msg);
      setRecordingState('error');
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    recordingRef.current = null;
    setAudioUri(null);
    setError(null);
    setRecordingState('idle');
  }, []);

  return {
    isRecording: recordingState === 'recording',
    recordingState,
    startRecording,
    stopRecording,
    audioUri,
    error,
    reset,
  };
}
