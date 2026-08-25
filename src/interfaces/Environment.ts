export interface Environment {
  /** Google Gemini API Key */
  geminiApiKey: string;

  /** Specification version */
  specVersion: string;

  /** CLI version */
  cliVersion: string;

  /** Root directory of the repository */
  rootDir: string;

  /** Path to inuo-manifest.json */
  manifestPath: string;

  /** Path to INUO_SPEC.md */
  specPath: string;

  /** Path to .inuo-state.json */
  statePath: string;

  /** Path to local environment key configuration */
  configPath: string;

  /** Default Gemini model identifier */
  defaultModel: string;

  /** Debug logging level (0 = OFF, 1 = INFO [default], 2 = DEBUG, 3 = TRACE) */
  debugLevel: number;

  /** Optional monthly token budget limit (set via GEMINI_TOKEN_BUDGET in .env) */
  tokenBudgetMonthly?: number;

  /** Local SLM / Ollama endpoint URL (e.g. http://localhost:11434) */
  localLlmUrl?: string;

  /** Local SLM Model name (e.g. qwen2.5:3b) */
  localLlmModel?: string;
}
