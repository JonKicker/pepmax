import { useRef, useEffect } from 'react';
import * as Speech from 'expo-speech';
import { useCardioSettings } from './useCardioSettings';
import { speakPace, speakDistance, speakDuration } from '../utils/cardio';
import type { DistanceUnit } from '../types/cardio';

const FREQ_METERS: Record<string, number> = {
  '0.5mi': 804.67,
  '1mi': 1609.34,
};
const FREQ_SECONDS: Record<string, number> = {
  '5min': 300,
  '10min': 600,
};

export function useAudioCues(
  distance: number,
  elapsedActive: number,
  currentPace: number,
  unit: DistanceUnit
) {
  const { settings } = useCardioSettings();
  const lastDistThreshold = useRef(0);
  const lastTimeThreshold = useRef(0);

  useEffect(() => {
    if (!settings.audioCuesEnabled) return;

    const freq = settings.audioCueFrequency;
    let shouldAnnounce = false;

    if (FREQ_METERS[freq] !== undefined) {
      const threshold = FREQ_METERS[freq];
      const crossings = Math.floor(distance / threshold);
      if (crossings > lastDistThreshold.current) {
        lastDistThreshold.current = crossings;
        shouldAnnounce = true;
      }
    } else if (FREQ_SECONDS[freq] !== undefined) {
      const threshold = FREQ_SECONDS[freq];
      const crossings = Math.floor(elapsedActive / threshold);
      if (crossings > lastTimeThreshold.current) {
        lastTimeThreshold.current = crossings;
        shouldAnnounce = true;
      }
    }

    if (!shouldAnnounce) return;

    const parts: string[] = [];
    for (const cue of settings.audioCueContent) {
      if (cue === 'distance') parts.push(speakDistance(distance, unit));
      else if (cue === 'pace') parts.push(speakPace(currentPace, unit));
      else if (cue === 'time') parts.push(speakDuration(elapsedActive));
    }

    if (parts.length > 0) {
      Speech.speak(parts.join('. '), { rate: 0.95, pitch: 1.0 });
    }
  }, [distance, elapsedActive, settings, currentPace, unit]);
}
