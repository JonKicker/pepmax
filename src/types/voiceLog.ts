/**
 * Types for the voice food logging feature.
 *
 * Voice input is transcribed (or typed as a fallback) and parsed into
 * ParsedFoodItem objects. Each item carries a confidence score so the UI
 * can flag low-confidence items for user review before logging.
 */

// ─── Parsed item ──────────────────────────────────────────────────────────────

/**
 * A single food item extracted from a voice or text input string.
 * e.g. "two eggs and a large banana" → [{name:'eggs',quantity:2,...}, {name:'banana',...}]
 */
export interface ParsedFoodItem {
  /** Canonical food name (lowercase, trimmed). */
  name: string;
  /** Numeric quantity (e.g. 1, 2, 0.5). */
  quantity: number;
  /** Unit string (e.g. 'serving', 'g', 'cup', 'slice'). */
  unit: string;
  /**
   * Parser confidence in [0, 1].
   * 1.0 = explicit numeric ("2 eggs"), 0.7 = word number ("two eggs"),
   * 0.5 = size modifier only ("a large banana"), 0.3 = name only.
   */
  confidence: number;
}

// ─── Recording state ─────────────────────────────────────────────────────────

/** Recording lifecycle state for the useVoiceRecording hook. */
export type RecordingState = 'idle' | 'recording' | 'stopped' | 'error';

// ─── Speech service result ────────────────────────────────────────────────────

/**
 * Result from speechService.transcribeAudio.
 * In v1 this is a text-input fallback; future versions will wire a real STT API.
 */
export interface TranscribeResult {
  /** Transcribed or fallback text. */
  text: string;
  /**
   * True when the text came from the real STT engine.
   * False when it came from the manual text-input fallback.
   */
  fromSpeech: boolean;
}
