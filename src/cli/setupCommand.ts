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

/**
 * CLI command handler for 'setup' / 'setup llm'.
 */
export async function runSetupCommand(
  args: string[],
  rootDir: string = process.cwd(),
  prompter?: LLMConfigurationPrompter,
): Promise<void> {
  const sub = (args[0] || "").toLowerCase();

  // 1. Direct argument key: `setup <apiKey>` or `setup llm <apiKey>`
  let keyToTest = args[1] || (sub !== "llm" && sub !== "status" && sub !== "env" && sub.length > 10 ? args[0] : "");

  if (sub === "status") {
    const env = loadEnvironment(rootDir);
    const config = getCostGovernanceConfig(rootDir);
    const lines = [
      "=== iNoU Environment & AI Setup Status ===",
      `• Google API Key: ${maskApiKey(env.geminiApiKey)}`,
      `• Active Model: ${config.activeModel}`,
      `• Free Models Pool: ${(config.freeModelsPool || []).join(", ")}`,
      `• Paid Models Pool: ${(config.paidModelsPool || []).join(", ")}`,
      `• Paid Consent: ${config.paidTierConsent ? "GRANTED" : "REVOKED / PENDING"}`,
    ];
    writeOutput(OutputChannelEnum.USER_REPLY, lines.join("\n"));
    return;
  }

  // If no key provided via arguments, check existing key or prompt
  if (!keyToTest) {
    const env = loadEnvironment(rootDir);
    if (env.geminiApiKey) {
      writeOutput(
        OutputChannelEnum.USER_REPLY,
        `\x1b[36m[*] Probing current configured key: ${maskApiKey(env.geminiApiKey)}...\x1b[0m`,
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
      "Usage: setup [llm <apiKey> | status]\nOr run ./scripts/setup-llm.sh <apiKey>",
    );
    return;
  }

  writeOutput(
    OutputChannelEnum.USER_REPLY,
    `\x1b[36m⏳ Testing API key and discovering available models live...\x1b[0m`,
  );

  const result = await probeAndConfigureModels(keyToTest, rootDir);
  writeOutput(OutputChannelEnum.USER_REPLY, result.message);
}
