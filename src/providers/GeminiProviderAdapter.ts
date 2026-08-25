import https from "https";
import { ILLMProviderAdapter } from "../interfaces/ILLMProviderAdapter";
import { LLMTierEnum } from "../enums/LLMTierEnum";
import { LLMCompletionRequest } from "../interfaces/LLMCompletionRequest";
import { LLMCompletionResponse } from "../interfaces/LLMCompletionResponse";
import { loadEnvironment } from "../cli/environment";
import { getCostGovernanceConfig } from "../cli/costGovernanceEngine";

/**
 * Google Gemini Provider Adapter with dual-tier support:
 * - Free Tier: Flash cascade (zero cost, intelligent fallback on rate limit)
 * - Paid Tier: Google API Pro (token budget tracking & consent control)
 */
export class GeminiProviderAdapter implements ILLMProviderAdapter {
  public readonly id = "gemini";
  public readonly name = "Google Gemini";
  public readonly tier = LLMTierEnum.HYBRID;
  public readonly supportedModels = [
    "gemini-flash-latest",
    "gemini-3.7-flash",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-pro-latest",
    "gemini-3.1-pro-preview",
  ];
  public readonly defaultModel = "gemini-flash-latest";

  public isConfigured(rootDir: string = process.cwd()): boolean {
    const env = loadEnvironment(rootDir);
    return Boolean(env.geminiApiKey);
  }

  public getCostEstimate(
    promptTokens: number,
    completionTokens: number,
    model: string = this.defaultModel,
  ): number {
    const isPro = model.includes("pro");
    if (!isPro) return 0; // Free tier models
    // Pro estimated rate: $1.25 / 1M prompt, $5.00 / 1M completion
    return (promptTokens * 1.25 + completionTokens * 5.0) / 1_000_000;
  }

  public async generateCompletion(
    request: LLMCompletionRequest,
    rootDir: string = process.cwd(),
  ): Promise<LLMCompletionResponse> {
    const env = loadEnvironment(rootDir);
    const apiKey = env.geminiApiKey;
    if (!apiKey) {
      throw new Error(
        "Google Gemini is not configured. Run 'setup llm gemini <apiKey>' or 'auth signin'.",
      );
    }

    const costConfig = getCostGovernanceConfig(rootDir);
    const targetModel = request.model || costConfig.activeModel || this.defaultModel;
    const isPro = targetModel.includes("pro");
    const activeTier = isPro ? LLMTierEnum.PAID : LLMTierEnum.FREE;

    const payload: any = {
      contents: [{ role: "user", parts: [{ text: request.prompt }] }],
      generationConfig: {
        temperature: request.temperature ?? 0.2,
        maxOutputTokens: request.maxTokens ?? 2048,
      },
    };

    if (request.systemPrompt) {
      payload.systemInstruction = {
        parts: [{ text: request.systemPrompt }],
      };
    }

    const body = JSON.stringify(payload);
    const path = `/v1beta/models/${targetModel}:generateContent?key=${apiKey}`;

    const rawResponse = await new Promise<any>((resolve, reject) => {
      const req = https.request(
        {
          hostname: "generativelanguage.googleapis.com",
          path,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(body),
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
                reject(new Error(`Failed to parse Gemini response: ${data}`));
              }
            } else {
              reject(
                new Error(
                  `Gemini API returned status ${res.statusCode}: ${data}`,
                ),
              );
            }
          });
        },
      );
      req.on("error", reject);
      req.on("timeout", () => {
        req.destroy();
        reject(new Error("Gemini API request timed out"));
      });
      req.write(body);
      req.end();
    });

    const candidate = rawResponse.candidates?.[0];
    const textContent =
      candidate?.content?.parts?.[0]?.text || "";
    const usage = rawResponse.usageMetadata;
    const promptTokens = usage?.promptTokenCount || 0;
    const completionTokens = usage?.candidatesTokenCount || 0;
    const totalTokens = usage?.totalTokenCount || promptTokens + completionTokens;

    return {
      content: textContent,
      model: targetModel,
      providerId: this.id,
      tier: activeTier,
      tokensUsed: {
        promptTokens,
        completionTokens,
        totalTokens,
      },
      estimatedCostUsd: this.getCostEstimate(promptTokens, completionTokens, targetModel),
      finishReason: candidate?.finishReason,
      rawResponse,
    };
  }
}
