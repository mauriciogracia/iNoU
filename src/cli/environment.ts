import fs from "fs";
import path from "path";
import { Environment } from "../interfaces/Environment";
import { LogLevelEnum } from "../enums/LogLevelEnum";

export function loadEnvironment(rootDir: string = process.cwd()): Environment {
  const manifestPath = path.join(rootDir, "inuo-manifest.json");
  const techSpec = path.join(rootDir, "tech-specs", "main-specs-goals.md");
  const docsSpec = path.join(rootDir, "docs", "main-specs-goals.md");
  const rootSpec = path.join(rootDir, "main-specs-goals.md");
  const fallbackSpec = path.join(rootDir, "INUO_SPEC.md");
  let specPath = fallbackSpec;
  if (fs.existsSync(techSpec)) specPath = techSpec;
  else if (fs.existsSync(docsSpec)) specPath = docsSpec;
  else if (fs.existsSync(rootSpec)) specPath = rootSpec;
  const statePath = path.join(rootDir, ".inuo-state.json");
  const configPath = path.join(rootDir, ".inuo-key.json");
  const envFilePath = path.join(rootDir, ".env");

  let geminiApiKey =
    process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
  let defaultModel = process.env.GEMINI_MODEL || "gemini-3.6-flash";
  let debugLevel = process.env.DEBUG_LEVEL
    ? parseInt(process.env.DEBUG_LEVEL, 10)
    : LogLevelEnum.INFO;
  let localLlmUrl = process.env.LOCAL_LLM_URL;
  let localLlmModel = process.env.LOCAL_LLM_MODEL || "qwen2.5:3b";

  // Load from .env if present
  if (fs.existsSync(envFilePath)) {
    try {
      const envContent = fs.readFileSync(envFilePath, "utf8");
      const match =
        envContent.match(/GEMINI_API_KEY\s*=\s*(.+)/) ||
        envContent.match(/GOOGLE_API_KEY\s*=\s*(.+)/);
      if (match && match[1] && match[1].trim()) {
        geminiApiKey = match[1].trim().replace(/^["']|["']$/g, "");
      }
      const modelMatch = envContent.match(/GEMINI_MODEL\s*=\s*(.+)/);
      if (modelMatch && modelMatch[1] && modelMatch[1].trim()) {
        defaultModel = modelMatch[1].trim().replace(/^["']|["']$/g, "");
      }
      const debugMatch = envContent.match(/DEBUG_LEVEL\s*=\s*(.+)/);
      if (debugMatch && debugMatch[1]) {
        const parsed = parseInt(debugMatch[1].trim(), 10);
        if (!isNaN(parsed)) debugLevel = parsed;
      }
      const localLlmUrlMatch = envContent.match(/LOCAL_LLM_URL\s*=\s*(.+)/);
      if (localLlmUrlMatch && localLlmUrlMatch[1] && localLlmUrlMatch[1].trim()) {
        localLlmUrl = localLlmUrlMatch[1].trim().replace(/^["']|["']$/g, "");
      }
      const localLlmModelMatch = envContent.match(/LOCAL_LLM_MODEL\s*=\s*(.+)/);
      if (localLlmModelMatch && localLlmModelMatch[1] && localLlmModelMatch[1].trim()) {
        localLlmModel = localLlmModelMatch[1].trim().replace(/^["']|["']$/g, "");
      }
    } catch {}
  }

  let tokenBudgetMonthly: number | undefined;
  if (process.env.GEMINI_TOKEN_BUDGET) {
    const v = parseInt(process.env.GEMINI_TOKEN_BUDGET, 10);
    if (!isNaN(v) && v > 0) tokenBudgetMonthly = v;
  }

  // Load from .inuo-state.json if state defines debugLevel
  if (fs.existsSync(statePath)) {
    try {
      const stateData = JSON.parse(fs.readFileSync(statePath, "utf8"));
      if (stateData.operatingMode?.debugLevel !== undefined) {
        debugLevel = stateData.operatingMode.debugLevel;
      }
    } catch {}
  }

  // Load from .inuo-key.json if key still empty
  if (fs.existsSync(configPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(configPath, "utf8"));
      if (!geminiApiKey && data.apiKey) geminiApiKey = data.apiKey;
      if (!tokenBudgetMonthly && data.tokenBudgetMonthly) {
        tokenBudgetMonthly = data.tokenBudgetMonthly;
      }
      if (!localLlmUrl && data.localLlmUrl) {
        localLlmUrl = data.localLlmUrl;
      }
      if (data.localLlmModel) {
        localLlmModel = data.localLlmModel;
      }
    } catch {}
  }

  let specVersion = "00.03.70";
  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      if (manifest.SPEC_VERSION) specVersion = manifest.SPEC_VERSION;
    } catch {}
  }

  return {
    geminiApiKey,
    specVersion,
    cliVersion: "00.03.70",
    rootDir,
    manifestPath,
    specPath,
    statePath,
    configPath,
    defaultModel,
    debugLevel,
    tokenBudgetMonthly,
    localLlmUrl,
    localLlmModel,
  };
}

export function saveGeminiApiKey(
  apiKey: string,
  rootDir: string = process.cwd(),
): void {
  const configPath = path.join(rootDir, ".inuo-key.json");
  fs.writeFileSync(configPath, JSON.stringify({ apiKey }, null, 2), "utf8");
  process.env.GEMINI_API_KEY = apiKey;
}

export function isGeminiConnected(rootDir: string = process.cwd()): boolean {
  const env = loadEnvironment(rootDir);
  return !!env.geminiApiKey;
}
