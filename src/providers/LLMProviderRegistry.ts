import { ILLMProviderAdapter } from "../interfaces/ILLMProviderAdapter";
import { LLMTierEnum } from "../enums/LLMTierEnum";
import { LLMCompletionRequest } from "../interfaces/LLMCompletionRequest";
import { LLMCompletionResponse } from "../interfaces/LLMCompletionResponse";
import { GeminiProviderAdapter } from "./GeminiProviderAdapter";
import { OllamaProviderAdapter } from "./OllamaProviderAdapter";
import { OpenAICompatibleProviderAdapter } from "./OpenAICompatibleProviderAdapter";
import { AnthropicProviderAdapter } from "./AnthropicProviderAdapter";

/**
 * Universal Registry and Lifecycle Manager for Code-Level LLM Providers in iNoU.
 */
export class LLMProviderRegistry {
  private static instance: LLMProviderRegistry;
  private adapters: Map<string, ILLMProviderAdapter> = new Map();

  private constructor() {
    this.registerDefaults();
  }

  public static getInstance(): LLMProviderRegistry {
    if (!LLMProviderRegistry.instance) {
      LLMProviderRegistry.instance = new LLMProviderRegistry();
    }
    return LLMProviderRegistry.instance;
  }

  private registerDefaults(): void {
    // 1. Google Gemini (Hybrid Free / Paid API Pro)
    this.register(new GeminiProviderAdapter());

    // 2. Ollama Local SLM (Local Tier)
    this.register(new OllamaProviderAdapter());

    // 3. OpenAI (Paid Tier)
    this.register(
      new OpenAICompatibleProviderAdapter({
        id: "openai",
        name: "OpenAI",
        baseUrl: "https://api.openai.com/v1",
        apiKeyEnvVar: "OPENAI_API_KEY",
        defaultModel: "gpt-4o-mini",
        supportedModels: ["gpt-4o", "gpt-4o-mini", "o1", "o3-mini"],
        tier: LLMTierEnum.PAID,
        costPer1MPrompt: 0.15,
        costPer1MCompletion: 0.60,
      }),
    );

    // 4. GitHub Copilot (Paid / Enterprise Tier)
    this.register(
      new OpenAICompatibleProviderAdapter({
        id: "copilot",
        name: "GitHub Copilot",
        baseUrl: "https://api.githubcopilot.com",
        apiKeyEnvVar: "COPILOT_API_KEY",
        defaultModel: "gpt-4.1",
        supportedModels: ["gpt-4.1", "claude-3.5-sonnet", "o3-mini"],
        tier: LLMTierEnum.PAID,
      }),
    );

    // 5. Groq (High Speed Free/Paid Tier)
    this.register(
      new OpenAICompatibleProviderAdapter({
        id: "groq",
        name: "Groq Cloud",
        baseUrl: "https://api.groq.com/openai/v1",
        apiKeyEnvVar: "GROQ_API_KEY",
        defaultModel: "llama-3.3-70b-versatile",
        supportedModels: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "deepseek-r1-distill-llama-70b"],
        tier: LLMTierEnum.HYBRID,
        costPer1MPrompt: 0.59,
        costPer1MCompletion: 0.79,
      }),
    );

    // 6. DeepSeek (Cost-Efficient Paid Tier)
    this.register(
      new OpenAICompatibleProviderAdapter({
        id: "deepseek",
        name: "DeepSeek AI",
        baseUrl: "https://api.deepseek.com",
        apiKeyEnvVar: "DEEPSEEK_API_KEY",
        defaultModel: "deepseek-chat",
        supportedModels: ["deepseek-chat", "deepseek-reasoner"],
        tier: LLMTierEnum.PAID,
        costPer1MPrompt: 0.14,
        costPer1MCompletion: 0.28,
      }),
    );

    // 7. Mistral AI
    this.register(
      new OpenAICompatibleProviderAdapter({
        id: "mistral",
        name: "Mistral AI",
        baseUrl: "https://api.mistral.ai/v1",
        apiKeyEnvVar: "MISTRAL_API_KEY",
        defaultModel: "mistral-large-latest",
        supportedModels: ["mistral-large-latest", "mistral-small-latest", "codestral-latest"],
        tier: LLMTierEnum.PAID,
        costPer1MPrompt: 2.0,
        costPer1MCompletion: 6.0,
      }),
    );

    // 8. OpenRouter (Universal Gateway)
    this.register(
      new OpenAICompatibleProviderAdapter({
        id: "openrouter",
        name: "OpenRouter",
        baseUrl: "https://openrouter.ai/api/v1",
        apiKeyEnvVar: "OPENROUTER_API_KEY",
        defaultModel: "google/gemini-2.0-flash-001",
        supportedModels: ["google/gemini-2.0-flash-001", "anthropic/claude-3.5-sonnet", "deepseek/deepseek-r1"],
        tier: LLMTierEnum.HYBRID,
      }),
    );

    // 9. Anthropic Claude (Paid Tier)
    this.register(new AnthropicProviderAdapter());
  }

  public register(adapter: ILLMProviderAdapter): void {
    this.adapters.set(adapter.id.toLowerCase(), adapter);
  }

  public get(providerId: string): ILLMProviderAdapter | null {
    return this.adapters.get(providerId.toLowerCase()) || null;
  }

  public getAll(): ILLMProviderAdapter[] {
    return Array.from(this.adapters.values());
  }

  public getConfigured(rootDir: string = process.cwd()): ILLMProviderAdapter[] {
    return this.getAll().filter((a) => a.isConfigured(rootDir));
  }

  public getByTier(tier: LLMTierEnum): ILLMProviderAdapter[] {
    return this.getAll().filter((a) => a.tier === tier);
  }

  public getFreeProviders(): ILLMProviderAdapter[] {
    return this.getAll().filter(
      (a) =>
        a.tier === LLMTierEnum.FREE ||
        a.tier === LLMTierEnum.LOCAL ||
        a.tier === LLMTierEnum.HYBRID,
    );
  }

  public getPaidProviders(): ILLMProviderAdapter[] {
    return this.getAll().filter(
      (a) => a.tier === LLMTierEnum.PAID || a.tier === LLMTierEnum.HYBRID,
    );
  }

  public async execute(
    providerId: string,
    request: LLMCompletionRequest,
    rootDir: string = process.cwd(),
  ): Promise<LLMCompletionResponse> {
    const adapter = this.get(providerId);
    if (!adapter) {
      throw new Error(`LLM Provider "${providerId}" is not registered.`);
    }
    return adapter.generateCompletion(request, rootDir);
  }
}

export const llmProviderRegistry = LLMProviderRegistry.getInstance();
