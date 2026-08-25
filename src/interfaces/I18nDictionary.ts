import { InteractionStyle } from '../types/InteractionStyle';

/**
 * Comprehensive I18N Dictionary interface for system-wide multi-lingual messaging.
 * Every string displayed in the UI MUST come from this dictionary — no hardcoded UI strings.
 */
export interface I18nDictionary {
  lang: string;
  shellBanner: {
    title: string;
    protocolSync: string;
    greeting: string;
  };
  farewell: string;
  systemOverview: {
    title: string;
    intentStructuring: string;
    peerMatching: string;
    goalDecomposition: string;
    decentralizedGovernance: string;
  };
  hostGreeting: {
    greeting: string;
  };
  intentParser: {
    analyzing: string;
    commandSequence: string;
    executingCommand: string;
    parsedNeed: string;
    parsedOffer: string;
    parsedDetail: string;
    parsedAnswer: string;
    parsedCorrection: string;
  };
  style: {
    /** Shown when iNoU detects a style from context and adopts it */
    styleDetected: string;
    /** Shown after user confirms or iNoU learns a style preference */
    styleLearned: string;
    /** Question shown above the clarification widget options */
    clarificationQuestion: string;
    /** Placeholder text for the open write-in field in the clarification widget */
    clarificationWriteIn: string;
    /** Localized display names for each InteractionStyle option in the clarification widget */
    optionLabels: Record<InteractionStyle, string>;
  };
  mode: {
    succinctEnabled: string;
    succinctDisabled: string;
    debugLevelSet: string;
    languageSet: string;
  };
  errors: {
    incoherenceDetected: string;
    accessRevoked: string;
    apiKeyMissing: string;
    tokenQuotaReached: string;
    networkError: string;
    invalidApiKey: string;
    serviceUnavailable: string;
    generalTechnicalError: string;
  };
  costGovernance: {
    freeTierExhaustedPrompt: string;
    allFreeModelsExhaustedPrompt: string;
    cascadingFreeModel: string;
    paidModelSelected: string;
    paidConsentGranted: string;
    paidConsentRevoked: string;
    paidConfirmationRequired: string;
    tierStatusHeader: string;
  };
}
