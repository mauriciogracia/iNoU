import { GoogleGenAI } from "@google/genai";
import { loadEnvironment, saveGeminiApiKey } from "./environment";
import { getProjectPaths, loadState } from "./context";
import { writeOutput } from "./outputRouter";
import { OutputChannelEnum } from "../enums/OutputChannelEnum";
import { getPreference, buildPreferencePromptBlock } from "./preferenceEngine";
import { addSessionTokens } from "./usageEngine";
import { getI18n } from "../i18n";
import { formatTechnicalError } from "./errorEngine";
import {
  getActiveTierModel,
  handleFreeTierExhaustion,
  recordModelExhaustion,
} from "./costGovernanceEngine";
export interface ParsedIntentResult {
  type:
  | "NEED"
  | "OFFER"
  | "DETAIL_PLAN"
  | "ANSWER"
  | "CORRECTION"
  | "QUERY"
  | "EXIT"
  | "EVOLVE"
  | "LEARN"
  | "COMMAND_SEQUENCE";
  verb?: string;
  object?: string;
  goalText?: string;
  targetIdOrCode?: string;
  answerText?: string;
  correctionTopic?: string;
  correctionText?: string;
  modelType?: "Transactional" | "GiftBased";
  explanation?: string; // Direct reply to user (stdout / Descriptor 1)
  thinkingDetails?: string; // Model reasoning and step breakdown (stderr / Descriptor 2)
  debugDetails?: string; // System debug details (stderr / Descriptor 2)
  commandSequence?: string[];
  subNeeds?: { verb: string; object: string }[];
  doubts?: string[];
}

import { isLocalLlmAvailable, processLocalIntent } from "./localAiClient";
import { getLLMConfigurations } from "./llmCommand";
import { LLMConfiguration } from "../interfaces/LLMConfiguration";

export function getStoredApiKey(rootDir: string = process.cwd()): string {
  const env = loadEnvironment(rootDir);
  return env.geminiApiKey;
}

export function saveApiKey(
  apiKey: string,
  rootDir: string = process.cwd(),
): void {
  saveGeminiApiKey(apiKey, rootDir);
}

export async function processNaturalLanguageIntent(
  userInput: string,
  rootDir: string = process.cwd(),
): Promise<ParsedIntentResult | null> {
  const env = loadEnvironment(rootDir);

  const paths = getProjectPaths(rootDir);
  const state = loadState(paths.statePath);
  const modeConfig = state.operatingMode;
  const lang = modeConfig?.detectedLanguage || "en";
  const dict = getI18n(lang);

  const activeChatId = state.activeChat;
  let activeProvider = "ollama";
  try {
    const { ChatRepository } = require("../repositories/ChatRepository");
    const chatRepo = new ChatRepository(rootDir);
    const activeChat = activeChatId ? chatRepo.findById(activeChatId) : null;
    if (activeChat?.provider_id) {
      activeProvider = activeChat.provider_id.toLowerCase();
    }
  } catch {}

  // 1. Ollama Provider
  if (activeProvider === "ollama") {
    const localAvailable = await isLocalLlmAvailable(env.localLlmUrl);
    if (localAvailable) {
      const localResult = await processLocalIntent(userInput, rootDir);
      if (localResult) {
        return localResult;
      }
    }
    writeOutput(
      OutputChannelEnum.USER_REPLY,
      `🦙 [Ollama Local] El motor local Ollama no responde en ${env.localLlmUrl || "http://localhost:11434"}. Asegúrate de que Ollama esté ejecutándose o cambia de motor en el selector inferior.`,
    );
    return null;
  }

  // 2. Gemini Provider
  if (activeProvider === "gemini") {
    if (!env.geminiApiKey) {
      writeOutput(
        OutputChannelEnum.USER_REPLY,
        dict.errors?.apiKeyMissing ||
          "✨ [Google Gemini] Clave API no configurada. Ejecuta 'setup llm gemini <API_KEY>' o añade GEMINI_API_KEY en .env.",
      );
      return null;
    }
  }

  // 3. Fallback or generic provider handling
  if (activeProvider !== "gemini" && activeProvider !== "ollama") {
    const configuredLlms = getLLMConfigurations(rootDir);
    const matched = configuredLlms.find((c: LLMConfiguration) => c.engineName.toLowerCase().includes(activeProvider) || c.configurationName.toLowerCase().includes(activeProvider));
    if (!matched && !env.geminiApiKey) {
      writeOutput(
        OutputChannelEnum.USER_REPLY,
        `⚙ [Motor: ${activeProvider.toUpperCase()}] No está configurado en este nodo. Ejecuta 'setup llm ${activeProvider} <key>' o selecciona Ollama/Gemini.`,
      );
      return null;
    }
  }
  const isSuccinct = modeConfig?.isSuccinctMode !== false;
  const debugLevel = env.debugLevel;
  const userId = state.activeUser?.userId ?? "user_local";
  const prefs = getPreference(userId, rootDir);
  const preferenceBlock = prefs ? buildPreferencePromptBlock(prefs) : "";

  try {
    const ai = new GoogleGenAI({ apiKey: env.geminiApiKey });
    const prompt = `You are the iNoU Interaction Engine & Command Translation AI.
The user input is: "${userInput}"
Target Interaction Language: "${lang}"
Succinct Mode: ${isSuccinct ? "ACTIVE" : "DISABLED"}
${preferenceBlock
        ? `
${preferenceBlock}
`
        : ""
      }
CRITICAL OUTPUT SEPARATION MANDATE:
- "explanation": Direct user reply ONLY in Target Interaction Language ("${lang}"). Concise and direct.
- "thinkingDetails": Step-by-step reasoning and goal decomposition thoughts (in "${lang}").
- "debugDetails": Internal prompt classification metrics and metadata.

CRITICAL LANGUAGE MANDATE:
- You MUST generate "explanation" and "thinkingDetails" strictly in Target Interaction Language ("${lang}").

CRITICAL SUCCINCT MODE MANDATE:
${isSuccinct
        ? `- Succinct Mode is ACTIVE: Be extremely concise, direct, and short.
- NEVER generate markdown tables (| ... |).
- Use ONLY simple bullet lists (- item) for any multi-item descriptions.`
        : `- Provide clear, helpful explanations.`
      }

SYSTEM OVERVIEW INQUIRIES ("What does iNoU do?" / "¿Qué hace iNoU?" / "Was macht iNoU?" / "Que fait iNoU?" / "O que faz o iNoU?"):
If the user asks what iNoU does, its purpose, or general capabilities:
- Set "type": "QUERY"
- Set "explanation" to a 4-bullet point presentation in Target Interaction Language ("${lang}") covering:
  - Intent Structuring Engine (NEED = VERB + OBJECT <-> OFFER = COMPLEMENT + OBJECT)
  - Direct Peer Matching (Request <-> Donate, Buy <-> Sell, Seek <-> Offer)
  - Recursive Goal Decomposition (Breaking down multi-step goals into executable sub-needs)
  - Decentralized Governance & Trust (Millisecond circuit breakers, multi-party threshold consensus)

Formula Baseline: NEED = (VERB) + (OBJECT) or OFFER = (COMP_VERB) + (OBJECT)

Valid Need Verbs: Request, Buy, Seek, Need, Borrow, Consult, Search, Call, Volunteer, Report, Ride, Talk, Transport, Deliver, Employ, Contract, Recruit, Construct, Design, Plan, Build, Upgrade, Evolve.
Valid Offer Complements: Donate, Sell, Offer, Fulfill, Lend, Advise, Supply, Respond, Coordinate, Action, Drive, Listen, Carry, Fetch, Teach, Nurse, Apply, Execute.

Supported CLI Commands:
- "need create --verb <Verb> --object <Object>"
- "offer create --verb <ComplementVerb> --object <Object>"
- "match"
- "detail <id> decompose <description>"
- "answer <id> <text>"
- "whoami"
- "status"
- "catalog"
- "version"
- "social broadcast --message <msg>"
- "question ask --title <Title> --options <Opt1,Opt2>"
- "mode promptMe / letMeServeYou"
- "mode succinct [on|off]"
- "mode debug <0|1|2|3>"
- "auth signin / signout"
- "learn <goal>" / "learn from chat history all" / "learn @<file>"
- "evolve <goal>"
- "gc" (Open Google Chrome Web UI)
- "exit / quit / q"


Intent Types:
- "NEED": Single simple need (e.g. "I need a food packet")
- "OFFER": Single simple offer (e.g. "I offer 10 food packets")
- "DETAIL_PLAN": Complex goal or request asking to detail/plan steps
- "ANSWER": Providing details or answering a doubt for a specific step/code
- "CORRECTION": User is correcting a misunderstanding or giving a rule directive
- "QUERY": General question about iNoU or status
- "EVOLVE": User requests iNoU to self-evolve, modify its codebase, create types, or add new command capabilities (e.g. "modificate a ti misma para agregar auth", "evolve add oauth2 support", "agrega el comando auth para linkedin"). Set "type": "EVOLVE", "goalText": "<feature description>".
- "LEARN": User asks iNoU to learn a skill, integrate an external API, or learn from chat history (e.g. "aprende a postear en tiktok", "learn how to post to linkedin", "learn from chat history all"). Set "type": "LEARN", "goalText": "<skill description>".
- "EXIT": User wants to exit, say goodbye, or terminate session in any language
- "COMMAND_SEQUENCE": For ANY complex, multi-step, or unsupported input, convert the user prompt into a sequence of real supported CLI commands in "commandSequence" array.

Return ONLY a raw JSON object with NO markdown formatting matching this structure:
{
  "type": "NEED" | "OFFER" | "DETAIL_PLAN" | "ANSWER" | "CORRECTION" | "QUERY" | "EVOLVE" | "LEARN" | "EXIT" | "COMMAND_SEQUENCE",
  "verb": "PrimaryVerb",
  "object": "PrimaryObject",
  "goalText": "Goal description for EVOLVE or LEARN",
  "targetIdOrCode": "Optional target step code or ID if answering or detailing existing step",
  "answerText": "Answer details if answering a step",
  "correctionTopic": "Topic area if correcting",
  "correctionText": "Learned directive rule text if correcting",
  "modelType": "Transactional" | "GiftBased",
  "explanation": "Short direct user reply in Target Interaction Language",
  "thinkingDetails": "Model step breakdown & reasoning thoughts",
  "debugDetails": "Introspection metadata",
  "commandSequence": [
    "need create --verb Request --object Food"
  ],
  "subNeeds": [
    { "verb": "SubVerb", "object": "SubObject" }
  ],
  "doubts": [
    "Optional doubt in Target Interaction Language"
  ]
}`;

    while (true) {
      const tierResolution = getActiveTierModel(rootDir);
      if (tierResolution.requiresConsent) {
        writeOutput(
          OutputChannelEnum.USER_REPLY,
          dict.costGovernance.paidConfirmationRequired,
        );
        return null;
      }

      const targetModel = tierResolution.model || env.defaultModel;

      writeOutput(
        OutputChannelEnum.THINKING,
        `[Google Gemini: ${targetModel}] ${dict.intentParser.analyzing}`,
        debugLevel,
      );

      try {
        const response = await ai.models.generateContent({
          model: targetModel,
          contents: prompt,
        });

        const text = response.text?.trim() || "";
        const meta = (response as any).usageMetadata;
        if (meta) {
          addSessionTokens(
            meta.promptTokenCount ?? 0,
            meta.candidatesTokenCount ?? 0,
            targetModel,
          );
        }
        const cleanJson = text
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim();
        const result = JSON.parse(cleanJson) as ParsedIntentResult;

        // Route Thinking Details to stderr (Descriptor 2)
        if (result.thinkingDetails) {
          writeOutput(
            OutputChannelEnum.THINKING,
            result.thinkingDetails,
            debugLevel,
          );
        }

        // Route Debug Details to stderr (Descriptor 2)
        writeOutput(
          OutputChannelEnum.DEBUG,
          `⚙ [Gemini AI Intent Interpretation JSON]:\n${JSON.stringify(result, null, 2)}`,
          debugLevel,
        );

        return result;
      } catch (err: any) {
        const errMsg = ((err as Error)?.message || String(err)).toLowerCase();
        const status = (err as any)?.status || (err as any)?.statusCode;
        const isQuotaExhausted =
          status === 429 ||
          status === 404 ||
          status === 503 ||
          errMsg.includes("429") ||
          errMsg.includes("resource_exhausted") ||
          errMsg.includes("quota") ||
          errMsg.includes("not available");

        if (isQuotaExhausted && !tierResolution.isPaid) {
          writeOutput(
            OutputChannelEnum.DEBUG,
            `⚙ [AI Model Rate/Quota Status] Model "${targetModel}" status ${status ?? "N/A"}: ${err.message || err}`,
            debugLevel,
          );
          const cascadeResult = recordModelExhaustion(targetModel, lang, rootDir);
          if (!cascadeResult.allExhausted && cascadeResult.cascadedModel) {
            writeOutput(
              OutputChannelEnum.DEBUG,
              `🔄 [Cost Governance] Cascading from "${targetModel}" to "${cascadeResult.cascadedModel}"...`,
              debugLevel,
            );
            continue;
          }
          // All free models exhausted: prompt rendered, break loop to protect tokens
          writeOutput(
            OutputChannelEnum.DEBUG,
            `⚠️ [Cost Governance] All free candidate models exhausted in pool.`,
            debugLevel,
          );
          return null;
        }

        writeOutput(
          OutputChannelEnum.DEBUG,
          `❌ [Gemini AI Error] ${err.stack || err.message || err}`,
          debugLevel,
        );
        const friendlyError = formatTechnicalError(err, lang);
        writeOutput(OutputChannelEnum.USER_REPLY, friendlyError);
        return null;
      }
    }
  } catch (err: any) {
    writeOutput(
      OutputChannelEnum.DEBUG,
      `❌ [Gemini AI Initialization Error] ${err.stack || err.message || err}`,
      debugLevel,
    );
    const friendlyError = formatTechnicalError(err, lang);
    writeOutput(OutputChannelEnum.USER_REPLY, friendlyError);
    return null;
  }
}

/**
 * Generic AI execution function utilizing the cost-governance cascading free-tier waterfall.
 */
export async function executeAiCall(
  prompt: string,
  rootDir: string = process.cwd(),
): Promise<string> {
  const env = loadEnvironment(rootDir);
  if (!env.geminiApiKey) {
    throw new Error("Gemini API key is missing. Run 'inuo setup' to configure credentials.");
  }

  const ai = new GoogleGenAI({ apiKey: env.geminiApiKey });

  while (true) {
    const tierResolution = getActiveTierModel(rootDir);
    if (tierResolution.requiresConsent) {
      throw new Error("All free tier models are exhausted. Explicit consent for paid model is required via 'tier consent yes'.");
    }

    const targetModel = tierResolution.model || env.defaultModel;

    try {
      const response = await ai.models.generateContent({
        model: targetModel,
        contents: prompt,
      });

      const text = response.text?.trim() || "";
      const meta = (response as any).usageMetadata;
      if (meta) {
        addSessionTokens(
          meta.promptTokenCount ?? 0,
          meta.candidatesTokenCount ?? 0,
          targetModel,
        );
      }
      return text;
    } catch (err: any) {
      const errMsg = ((err as Error)?.message || String(err)).toLowerCase();
      const status = (err as any)?.status || (err as any)?.statusCode;
      const isQuotaExhausted =
        status === 429 ||
        status === 404 ||
        status === 503 ||
        errMsg.includes("429") ||
        errMsg.includes("resource_exhausted") ||
        errMsg.includes("quota") ||
        errMsg.includes("not available");

      if (isQuotaExhausted && !tierResolution.isPaid) {
        const cascadeResult = recordModelExhaustion(targetModel, "en", rootDir);
        if (!cascadeResult.allExhausted && cascadeResult.cascadedModel) {
          continue;
        }
        throw new Error("All free models in pool exhausted. Quota limit reached.");
      }
      throw err;
    }
  }
}

