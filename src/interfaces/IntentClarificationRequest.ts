/**
 * Structured payload emitted by iNoU when the user's intent cannot be determined
 * with sufficient confidence. The web UI renders this as an inline single-select
 * widget (radio options) + open write-in text field — identical to Antigravity's
 * clarification UX. No modals. No forced choice.
 *
 * iNoU's principle: never over-assume. When assumption confidence is too high a risk,
 * always ask the user.
 */
export interface IntentClarificationRequest {
  /** I18n-keyed question text displayed above the option list */
  question: string;

  /** Ordered list of known intent options rendered as single-select radio choices */
  options: Array<{ value: string; label: string }>;

  /** Placeholder text for the open write-in input field */
  writeInPlaceholder: string;

  /**
   * Context key used to route the user's answer back to the correct handler.
   * e.g. 'interactionStyle' | 'commandIntent' | 'needVerb'
   */
  contextKey: string;
}
