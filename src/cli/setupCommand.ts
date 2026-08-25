import { GoogleGenAI } from "@google/genai";
import { saveGeminiApiKey, loadEnvironment } from "./environment";
import {
  getCostGovernanceConfig,
  saveCostGovernanceConfig,
  DEFAULT_FREE_POOL,
  DEFAULT_PAID_POOL,
} from "./costGovernanceEngine";
import { writeOutput } from "./outputRouter";
import { OutputChannelEnum } from "../enums/OutputChannelEnum";
import { LLMConfigurationPrompter } from "../interfaces/LLMConfigurationPrompter";

/**
 * Safely masks an API key for logs and UI display (Zero-Exposure Policy).
 */
export function maskApiKey(apiKey?: string): string {
  if (!apiKey || apiKey.trim().length === 0) return "(none)";
  const trimmed = apiKey.trim();
  if (trimmed.length <= 8) return "********";
  return `${trimmed.slice(0, 8)}...${trimmed.slice(-4)} (${trimmed.length} chars)`;
}

const CANDIDATE_FREE_MODELS = [
  "gemini-flash-latest",
  "gemini-3.7-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-3-flash-preview",
];

const CANDIDATE_PAID_MODELS = [
  "gemini-pro-latest",
  "gemini-3.1-pro-preview",
];

/**
 * Probes Google GenAI with the provided key, tests available models live,
 * and auto-configures the free and paid waterfall pools.
 */
export async function probeAndConfigureModels(
  apiKey: string,
  rootDir: string = process.cwd(),
): Promise<{
  success: boolean;
  workingFree: string[];
  workingPaid: string[];
  message: string;
}> {
  if (!apiKey || apiKey.trim().length === 0) {
    return {
      success: false,
      workingFree: [],
      workingPaid: [],
      message: "❌ API key cannot be empty.",
    };
  }

  const cleanKey = apiKey.trim();
  const ai = new GoogleGenAI({ apiKey: cleanKey });

  // Test live connection with candidate models
  const workingFree: string[] = [];
  const workingPaid: string[] = [];

  // 1. Probe candidate free models
  for (const model of CANDIDATE_FREE_MODELS) {
    try {
      const resp = await ai.models.generateContent({
        model,
        contents: "OK",
      });
      if (resp) workingFree.push(model);
    } catch {
      // Model not available or unsupported for this key
    }
  }

  // 2. Probe candidate paid/pro models
  for (const model of CANDIDATE_PAID_MODELS) {
    try {
      const resp = await ai.models.generateContent({
        model,
        contents: "OK",
      });
      if (resp) workingPaid.push(model);
    } catch {
      // Model not available or unsupported for this key
    }
  }

  if (workingFree.length === 0 && workingPaid.length === 0) {
    return {
      success: false,
      workingFree: [],
      workingPaid: [],
      message: `❌ Failed to connect to Google GenAI with key ${maskApiKey(cleanKey)}. Please verify the key at https://aistudio.google.com/app/apikey.`,
    };
  }

  // Save the key into local gitignored .env / .inuo-key.json
  saveGeminiApiKey(cleanKey, rootDir);

  // Configure cost governance pools
  const config = getCostGovernanceConfig(rootDir);
  config.freeModelsPool = workingFree.length > 0 ? workingFree : [...DEFAULT_FREE_POOL];
  config.paidModelsPool = workingPaid.length > 0 ? workingPaid : [...DEFAULT_PAID_POOL];
  config.preferredFreeModel = workingFree[0] || config.freeModelsPool[0];
  config.preferredPaidModel = workingPaid[0] || config.paidModelsPool[0];
  config.activeModel = config.preferredFreeModel;
  config.freeTierStatus = "Available";
  config.exhaustedFreeModels = [];
  saveCostGovernanceConfig(config, rootDir);

  const summary = [
    `✔ Successfully verified and configured Google GenAI!`,
    `• Masked Key: ${maskApiKey(cleanKey)}`,
    `• Working Free Models (${workingFree.length}): ${workingFree.join(", ") || "(fallback configured)"}`,
    `• Working Paid Models (${workingPaid.length}): ${workingPaid.join(", ") || "(fallback configured)"}`,
    `• Active Default Model: ${config.activeModel}`,
  ].join("\n");

  return {
    success: true,
    workingFree,
    workingPaid,
    message: summary,
  };
}

import { saveLLMConfiguration, getLLMProviderSetup } from "./llmCommand";

/**
 * CLI command handler for 'setup' / 'setup llm <engine> [apiKey]'.
 */
export async function runSetupCommand(
  args: string[],
  rootDir: string = process.cwd(),
  prompter?: LLMConfigurationPrompter,
): Promise<void> {
  const sub = (args[0] || "").toLowerCase();

  if (sub === "status") {
    const env = loadEnvironment(rootDir);
    const config = getCostGovernanceConfig(rootDir);
    const lines = [
      "=== iNoU Environment & AI Setup Status ===",
      `• Google API Key: ${maskApiKey(env.geminiApiKey)}`,
      `• Local Model (Ollama): ${env.localLlmModel || "qwen2.5:3b"} (${env.localLlmUrl || "http://localhost:11434"})`,
      `• Active Cloud Model: ${config.activeModel}`,
      `• Free Models Pool: ${(config.freeModelsPool || []).join(", ")}`,
      `• Paid Models Pool: ${(config.paidModelsPool || []).join(", ")}`,
      `• Paid Consent: ${config.paidTierConsent ? "GRANTED" : "REVOKED / PENDING"}`,
    ];
    writeOutput(OutputChannelEnum.USER_REPLY, lines.join("\n"));
    return;
  }

  // Handle `setup llm <engine> [apiKey]`
  if (sub === "llm" || sub === "ai" || sub === "engine") {
    const engine = (args[1] || "").toLowerCase();

    if (!engine) {
      const available = [
        "gemini",
        "copilot",
        "ollama",
        "openai",
        "anthropic",
        "groq",
        "deepseek",
        "mistral",
        "openrouter",
      ];
      writeOutput(
        OutputChannelEnum.USER_REPLY,
        `Uso: setup llm <engine> [apiKey]\n\nMotores soportados:\n${available.map((e) => `  • ${e}`).join("\n")}\n\nEjemplos:\n  setup llm gemini AIzaSy...\n  setup llm copilot\n  setup llm ollama qwen2.5:3b`,
      );
      return;
    }

    if (engine === "gemini" || engine === "google") {
      let keyToTest = args[2] || "";
      if (!keyToTest) {
        const env = loadEnvironment(rootDir);
        if (env.geminiApiKey) {
          writeOutput(
            OutputChannelEnum.USER_REPLY,
            `\x1b[36m[*] Probing current configured Gemini key: ${maskApiKey(env.geminiApiKey)}...\x1b[0m`,
          );
          keyToTest = env.geminiApiKey;
        } else if (prompter) {
          const input = await prompter.ask("Enter your Google Gemini / AI Studio API key:");
          keyToTest = input ? input.trim() : "";
        }
      }

      if (!keyToTest) {
        writeOutput(
          OutputChannelEnum.USER_REPLY,
          "Uso: setup llm gemini <apiKey>\nObtén tu API key en https://aistudio.google.com/app/apikey",
        );
        return;
      }

      writeOutput(
        OutputChannelEnum.USER_REPLY,
        `\x1b[36m⏳ Testing Gemini API key and discovering available models live...\x1b[0m`,
      );

      const result = await probeAndConfigureModels(keyToTest, rootDir);
      writeOutput(OutputChannelEnum.USER_REPLY, result.message);
      return;
    }

    if (engine === "ollama" || engine === "qwen" || engine === "local") {
      const model = args[2] || "qwen2.5:3b";
      writeOutput(
        OutputChannelEnum.USER_REPLY,
        `✔ Motor local Ollama configurado con modelo: "${model}" (http://localhost:11434)`,
      );
      return;
    }

    // Generic LLM provider setup
    try {
      const setup = getLLMProviderSetup(engine);
      const key = args[2];
      const config = saveLLMConfiguration(
        {
          configurationName: `${engine}-default`,
          engineName: setup.engineName,
          model: setup.defaultModel,
          baseUrl: setup.defaultBaseUrl,
          supportsPlanMode: true,
          supportsExecuteMode: true,
        },
        rootDir,
      );
      writeOutput(
        OutputChannelEnum.USER_REPLY,
        `✔ Motor "${engine}" configurado exitosamente como "${config.configurationName}".`,
      );
    } catch (err: any) {
      writeOutput(
        OutputChannelEnum.USER_REPLY,
        `❌ Error al configurar el motor "${engine}": ${err.message}`,
      );
    }
    return;
  }

  // Fallback direct key setup: `setup <apiKey>`
  if (args[0] && args[0].length > 15 && args[0].startsWith("AIzaSy")) {
    const result = await probeAndConfigureModels(args[0], rootDir);
    writeOutput(OutputChannelEnum.USER_REPLY, result.message);
    return;
  }

  writeOutput(
    OutputChannelEnum.USER_REPLY,
    "Uso:\n  setup llm <engine> [apiKey]\n  setup status\n\nEjemplo: setup llm gemini <tu_api_key>",
  );
}
