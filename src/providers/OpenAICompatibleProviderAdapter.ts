import https from "https";
import http from "http";
import { ILLMProviderAdapter } from "../interfaces/ILLMProviderAdapter";
import { LLMTierEnum } from "../enums/LLMTierEnum";
import { LLMCompletionRequest } from "../interfaces/LLMCompletionRequest";
import { LLMCompletionResponse } from "../interfaces/LLMCompletionResponse";
import { getLLMConfigurations } from "../cli/llmCommand";

export interface OpenAICompatibleConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiKeyEnvVar: string;
  defaultModel: string;
  supportedModels: string[];
  tier?: LLMTierEnum;
  costPer1MPrompt?: number;
  costPer1MCompletion?: number;
}

/**
 * Generic OpenAI-compatible Provider Adapter (OpenAI, Copilot, Groq, DeepSeek, Mistral, OpenRouter).
 */
export class OpenAICompatibleProviderAdapter implements ILLMProviderAdapter {
  public readonly id: string;
  public readonly name: string;
  public readonly tier: LLMTierEnum;
  public readonly supportedModels: string[];
  public readonly defaultModel: string;
  private baseUrl: string;
  private apiKeyEnvVar: string;
  private costPer1MPrompt: number;
  private costPer1MCompletion: number;

  constructor(config: OpenAICompatibleConfig) {
    this.id = config.id;
    this.name = config.name;
    this.baseUrl = config.baseUrl;
    this.apiKeyEnvVar = config.apiKeyEnvVar;
    this.defaultModel = config.defaultModel;
    this.supportedModels = config.supportedModels;
    this.tier = config.tier ?? LLMTierEnum.PAID;
    this.costPer1MPrompt = config.costPer1MPrompt ?? 0.15;
    this.costPer1MCompletion = config.costPer1MCompletion ?? 0.60;
  }

  public isConfigured(rootDir: string = process.cwd()): boolean {
    if (process.env[this.apiKeyEnvVar]) return true;
    const configs = getLLMConfigurations(rootDir);
    return configs.some(
      (c) => c.engineName.toLowerCase() === this.id.toLowerCase(),
    );
  }

  public getCostEstimate(
    promptTokens: number,
    completionTokens: number,
  ): number {
    return (
      (promptTokens * this.costPer1MPrompt +
        completionTokens * this.costPer1MCompletion) /
      1_000_000
    );
  }

  public async generateCompletion(
    request: LLMCompletionRequest,
    rootDir: string = process.cwd(),
  ): Promise<LLMCompletionResponse> {
    const apiKey =
      process.env[this.apiKeyEnvVar] ||
      getLLMConfigurations(rootDir).find(
        (c) => c.engineName.toLowerCase() === this.id.toLowerCase(),
      )?.model;

    if (!apiKey && this.apiKeyEnvVar !== "NONE") {
      throw new Error(
        `Provider "${this.name}" is not configured. Set ${this.apiKeyEnvVar} or run 'setup llm ${this.id} <key>'.`,
      );
    }

    const targetModel = request.model || this.defaultModel;
    const messages: any[] = [];
    if (request.systemPrompt) {
      messages.push({ role: "system", content: request.systemPrompt });
    }
    messages.push({ role: "user", content: request.prompt });

    const payload = {
      model: targetModel,
      messages,
      temperature: request.temperature ?? 0.2,
      max_tokens: request.maxTokens ?? 2048,
    };

    const body = JSON.stringify(payload);
    const parsed = new URL(this.baseUrl);
    const isHttps = parsed.protocol === "https:";
    const transport = isHttps ? https : http;

    const rawResponse = await new Promise<any>((resolve, reject) => {
      const req = transport.request(
        {
          hostname: parsed.hostname,
          port: parsed.port || (isHttps ? 443 : 80),
          path: `${parsed.pathname.replace(/\/$/, "")}/chat/completions`,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(body),
            Authorization: `Bearer ${apiKey || ""}`,
          },
          timeout: 30000,
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              try {
                resolve(JSON.parse(data));
              } catch (e) {
                reject(new Error(`Failed to parse response: ${data}`));
              }
            } else {
              reject(
                new Error(
                  `${this.name} API returned status ${res.statusCode}: ${data}`,
                ),
              );
            }
          });
        },
      );
      req.on("error", reject);
      req.on("timeout", () => {
        req.destroy();
        reject(new Error(`${this.name} request timed out`));
      });
      req.write(body);
      req.end();
    });

    const choice = rawResponse.choices?.[0];
    const text = choice?.message?.content || "";
    const usage = rawResponse.usage;
    const promptTokens = usage?.prompt_tokens || 0;
    const completionTokens = usage?.completion_tokens || 0;
    const totalTokens = usage?.total_tokens || promptTokens + completionTokens;

    return {
      content: text,
      model: targetModel,
      providerId: this.id,
      tier: this.tier,
      tokensUsed: {
        promptTokens,
        completionTokens,
        totalTokens,
      },
      estimatedCostUsd: this.getCostEstimate(promptTokens, completionTokens),
      finishReason: choice?.finish_reason,
      rawResponse,
    };
  }
}
