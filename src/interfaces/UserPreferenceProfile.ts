import { ResponseLength } from "../types/ResponseLength";
import { ResponseFormat } from "../types/ResponseFormat";
import { InteractionStyle } from "../types/InteractionStyle";
import { StyleSignal } from "./StyleSignal";

/**
 * Learned response-style preferences for a single user, persisted across sessions.
 *
 * iNoU ("I Know U") learns from every interaction, prompt, and frequent operation.
 * This profile is the primary memory of what the user prefers — iNoU uses it to
 * automatically "add salt" to prompts without requiring the user to repeat themselves.
 *
 * When styleConfidence < clarificationThreshold, iNoU emits an IntentClarificationRequest
 * to the UI (inline widget: single-select options + open write-in) instead of assuming.
 */
export interface UserPreferenceProfile {
  userId: string;

  // ── Interaction Style (learned from NL signals) ──────────────────────────

  /**
   * The detected/learned interaction style.
   * Derived from accumulated styleSignals. iNoU never hard-codes this —
   * it is always inferred or explicitly confirmed by the user.
   */
  interactionStyle?: InteractionStyle;

  /**
   * Rolling window of the last N natural-language signals (max 20) that
   * contributed to shaping the current interactionStyle.
   */
  styleSignals?: StyleSignal[];

  /**
   * Confidence score 0–1 for the current interactionStyle.
   * Computed as a weighted average of recent signal confidences.
   * When below clarificationThreshold, iNoU shows the clarification widget.
   */
  styleConfidence?: number;

  /**
   * Minimum confidence required before iNoU applies the learned style without
   * asking. Below this threshold, iNoU emits an IntentClarificationRequest.
   * Default: 0.6
   */
  clarificationThreshold?: number;

  // ── Legacy response format fields ────────────────────────────────────────

  /** How long responses should be */
  responseLength?: ResponseLength;

  /** Whether to use prose, bullet lists, or structured (table) layout */
  responseFormat?: ResponseFormat;

  /** Explicit preference on tables (true = use them, false = avoid them) */
  preferTables?: boolean;

  // ── Sync & housekeeping ───────────────────────────────────────────────────

  /** Recurring auto-sync prompt interval in minutes (0 = disabled, default = 15) */
  autoSyncIntervalMinutes?: number;

  /** True if user wants interactive prompts on sync intervals */
  autoSyncPromptEnabled?: boolean;

  /** Number of preference signals captured so far */
  signalCount: number;

  /** ISO timestamp of last update */
  updatedAt: string;
}
