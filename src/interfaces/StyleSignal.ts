import { InteractionStyle } from '../types/InteractionStyle';

/**
 * A single natural-language signal captured from user input that informed
 * iNoU's learned interaction style. Stored as a rolling window in UserPreferenceProfile.
 */
export interface StyleSignal {
  /** The interaction style detected from this signal */
  detectedStyle: InteractionStyle;

  /** Excerpt from the user's message that triggered this detection */
  sourceText: string;

  /** Confidence score 0–1 for this signal */
  confidence: number;

  /** ISO timestamp when this signal was captured */
  capturedAt: string;
}
