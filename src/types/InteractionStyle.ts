/**
 * Detected or learned interaction style for a user.
 * iNoU learns these from natural language signals and persists them in UserPreferenceProfile.
 * When confidence is too low, iNoU presents an IntentClarificationRequest widget instead of assuming.
 */
export type InteractionStyle =
  | 'canonical'       // Formal, complete, standards-based answers
  | 'succinct'        // Brief, bullet-only, no tables
  | 'detailed'        // Verbose, thorough, with tables and examples
  | 'factual'         // Fact-checking, citations, verifiable claims only
  | 'conversational'; // Friendly, informal, flowing prose
