import http from "http";
import { ILLMProviderAdapter } from "../interfaces/ILLMProviderAdapter";
import { LLMTierEnum } from "../enums/LLMTierEnum";
import { LLMCompletionRequest } from "../interfaces/LLMCompletionRequest";
import { LLMCompletionResponse } from "../interfaces/LLMCompletionResponse";
import { loadEnvironment } from "../cli/environment";

/**
 * Local SLM Provider Adapter (Ollama / Qwen 2.5):
 * - 100% offline, zero cloud token consumption
 * - Local inference on CPU / GPU
 */
export class OllamaProviderAdapter implements ILLMProviderAdapter {
  public readonly id = "ollama";
  public readonly name = "Ollama Local SLM";
  public readonly tier = LLMTierEnum.LOCAL;
  public readonly supportedModels = [
    "qwen2.5:3b",
    "qwen2.5:1.5b",
    "qwen2.5:7b",
    "llama3.2:3b",
    "mistral:7b",
  ];
  public readonly defaultModel = "qwen2.5:3b";

  public isConfigured(rootDir: string = process.cwd()): boolean {
    // Local Ollama is available by default at localhost:11434
    return true;
  }

  public getCostEstimate(): number {
    return 0; // Local model is always free
  }

  public async generateCompletion(
    request: LLMCompletionRequest,
    rootDir: string = process.cwd(),
  ): Promise<LLMCompletionResponse> {
    const env = loadEnvironment(rootDir);
    const targetModel = request.model || env.localLlmModel || this.defaultModel;
    const localUrl = env.localLlmUrl || "http://localhost:11434";

    const payload = {
      model: targetModel,
      prompt: request.prompt,
      system: request.systemPrompt,
      stream: false,
      options: {
        temperature: request.temperature ?? 0.1,
        num_predict: request.maxTokens ?? 2048,
      },
    };

    const body = JSON.stringify(payload);
    const parsed = new URL(localUrl);

    const rawResponse = await new Promise<any>((resolve, reject) => {
      const req = http.request(
        {
          hostname: parsed.hostname,
          port: parsed.port || 11434,
          path: "/api/generate",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(body),
          },
          timeout: 45000,
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              try {
                resolve(JSON.parse(data));
              } catch (e) {
                reject(new Error(`Failed to parse Ollama response: ${data}`));
              }
            } else {
              reject(
                new Error(
                  `Ollama returned status ${res.statusCode}: ${data}`,
                ),
              );
            }
          });
        },
      );
      req.on("error", reject);
      req.on("timeout", () => {
        req.destroy();
        reject(new Error("Ollama connection timed out"));
      });
      req.write(body);
      req.end();
    });

    const promptTokens = rawResponse.prompt_eval_count || 0;
    const completionTokens = rawResponse.eval_count || 0;

    return {
      content: rawResponse.response || "",
      model: targetModel,
      providerId: this.id,
      tier: LLMTierEnum.LOCAL,
      tokensUsed: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
      estimatedCostUsd: 0,
      finishReason: rawResponse.done ? "stop" : undefined,
      rawResponse,
    };
  }
}
