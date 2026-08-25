import { LLMTierEnum } from "../enums/LLMTierEnum";
import { LLMCompletionRequest } from "./LLMCompletionRequest";
import { LLMCompletionResponse } from "./LLMCompletionResponse";

/**
 * Universal code interface for LLM provider adapters across Free, Paid, Local, and Hybrid tiers.
 */
export interface ILLMProviderAdapter {
  readonly id: string;
  readonly name: string;
  readonly tier: LLMTierEnum;
  readonly supportedModels: string[];
  readonly defaultModel: string;

  isConfigured(rootDir?: string): boolean;
  generateCompletion(
    request: LLMCompletionRequest,
    rootDir?: string,
  ): Promise<LLMCompletionResponse>;
  getCostEstimate(
    promptTokens: number,
    completionTokens: number,
    model?: string,
  ): number;
}
