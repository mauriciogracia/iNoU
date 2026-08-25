import https from "https";
import { ILLMProviderAdapter } from "../interfaces/ILLMProviderAdapter";
import { LLMTierEnum } from "../enums/LLMTierEnum";
import { LLMCompletionRequest } from "../interfaces/LLMCompletionRequest";
import { LLMCompletionResponse } from "../interfaces/LLMCompletionResponse";

/**
 * Anthropic Claude Provider Adapter (Claude 3.5 Sonnet / Claude 3 Opus)
 */
export class AnthropicProviderAdapter implements ILLMProviderAdapter {
  public readonly id = "anthropic";
  public readonly name = "Anthropic Claude";
  public readonly tier = LLMTierEnum.PAID;
  public readonly supportedModels = [
    "claude-3-5-sonnet-20241022",
    "claude-3-5-haiku-20241022",
    "claude-3-opus-20240229",
  ];
  public readonly defaultModel = "claude-3-5-sonnet-20241022";

  public isConfigured(): boolean {
    return Boolean(process.env.ANTHROPIC_API_KEY);
  }

  public getCostEstimate(
    promptTokens: number,
    completionTokens: number,
  ): number {
    // Claude 3.5 Sonnet: $3.00 / 1M prompt, $15.00 / 1M completion
    return (promptTokens * 3.0 + completionTokens * 15.0) / 1_000_000;
  }

  public async generateCompletion(
    request: LLMCompletionRequest,
  ): Promise<LLMCompletionResponse> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Anthropic Claude is not configured. Set ANTHROPIC_API_KEY in .env or run 'setup llm anthropic <apiKey>'.",
      );
    }

    const targetModel = request.model || this.defaultModel;
    const payload: any = {
      model: targetModel,
      max_tokens: request.maxTokens ?? 2048,
      temperature: request.temperature ?? 0.2,
      messages: [{ role: "user", content: request.prompt }],
    };

    if (request.systemPrompt) {
      payload.system = request.systemPrompt;
    }

    const body = JSON.stringify(payload);

    const rawResponse = await new Promise<any>((resolve, reject) => {
      const req = https.request(
        {
          hostname: "api.anthropic.com",
          path: "/v1/messages",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(body),
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
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
                reject(new Error(`Failed to parse Anthropic response: ${data}`));
              }
            } else {
              reject(
                new Error(
                  `Anthropic API returned status ${res.statusCode}: ${data}`,
                ),
              );
            }
          });
        },
      );
      req.on("error", reject);
      req.on("timeout", () => {
        req.destroy();
        reject(new Error("Anthropic request timed out"));
      });
      req.write(body);
      req.end();
    });

    const text =
      rawResponse.content?.[0]?.text || "";
    const promptTokens = rawResponse.usage?.input_tokens || 0;
    const completionTokens = rawResponse.usage?.output_tokens || 0;
    const totalTokens = promptTokens + completionTokens;

    return {
      content: text,
      model: targetModel,
      providerId: this.id,
      tier: LLMTierEnum.PAID,
      tokensUsed: {
        promptTokens,
        completionTokens,
        totalTokens,
      },
      estimatedCostUsd: this.getCostEstimate(promptTokens, completionTokens),
      finishReason: rawResponse.stop_reason,
      rawResponse,
    };
  }
}
