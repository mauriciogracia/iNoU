/**
 * Result produced by iNoU's 4-tier language and intent resolution pipeline.
 */
export interface LanguageResolutionResult {
  /** Resolved interaction language code (e.g. 'en', 'es', 'fr', 'de', 'pt') */
  resolvedLanguage: string;

  /** Engine tier that successfully resolved the intent */
  resolutionTier: 'LLM' | 'CatalogEngine' | 'MCPIntegration' | 'ProactiveDoubt';

  /** Parsed intent structure if matched */
  parsedIntent?: any;

  /** Resolution confidence score (0.0 to 1.0) */
  confidence: number;

  /** Human-readable explanation of resolution path */
  explanation: string;
}
