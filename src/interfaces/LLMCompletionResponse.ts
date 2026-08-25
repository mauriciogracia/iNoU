import { LLMTierEnum } from "../enums/LLMTierEnum";

export interface LLMCompletionResponse {
  content: string;
  model: string;
  providerId: string;
  tier: LLMTierEnum;
  tokensUsed?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  estimatedCostUsd?: number;
  finishReason?: string;
  rawResponse?: any;
}
