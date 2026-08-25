import http from "http";
import https from "https";
import { loadEnvironment } from "./environment";
import { getProjectPaths, loadState } from "./context";
import { writeOutput } from "./outputRouter";
import { OutputChannelEnum } from "../enums/OutputChannelEnum";
import { getPreference, buildPreferencePromptBlock } from "./preferenceEngine";
import { getI18n } from "../i18n";
import { ParsedIntentResult } from "./aiClient";

export interface LocalSLMResponse {
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
  dialogue_act?: "PROVIDE_CONTEXT" | "EXECUTE_COMMAND" | "CLARIFICATION" | "CHAT";
  verb?: string;
  object?: string;
  goalText?: string;
  targetIdOrCode?: string;
  answerText?: string;
  correctionTopic?: string;
  correctionText?: string;
  modelType?: "Transactional" | "GiftBased";
  explanation?: string;
  thinkingDetails?: string;
  debugDetails?: string;
  commandSequence?: string[];
  subNeeds?: { verb: string; object: string }[];
  doubts?: string[];
  delta_facts?: Record<string, any>;
  confidence?: number;
}

import { spawn } from "child_process";
import fs from "fs";
import path from "path";

function findOllamaExecutable(): string | null {
  if (process.platform === "win32") {
    const candidates = [
      path.join(process.env.LOCALAPPDATA || "", "Programs", "Ollama", "ollama.exe"),
      path.join(process.env.ProgramFiles || "", "Ollama", "ollama.exe"),
      path.join(process.env["ProgramFiles(x86)"] || "", "Ollama", "ollama.exe"),
      path.join(process.env.USERPROFILE || "", "AppData", "Local", "Programs", "Ollama", "ollama.exe"),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
  } else {
    const candidates = ["/usr/local/bin/ollama", "/usr/bin/ollama", "/opt/homebrew/bin/ollama"];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
  }
  return null;
}

let isSpawningOllama = false;

export async function ensureOllamaRunning(url: string = "http://localhost:11434"): Promise<boolean> {
  const isUp = await pingOllama(url, 800);
  if (isUp) return true;

  const binPath = findOllamaExecutable();
  if (!binPath || isSpawningOllama) return false;

  isSpawningOllama = true;
  try {
    const child = spawn(binPath, ["serve"], {
      detached: true,
      stdio: "ignore",
      shell: false,
    });
    child.unref();

    // Wait up to 3 seconds for service to respond
    for (let i = 0; i < 6; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const up = await pingOllama(url, 500);
      if (up) {
        isSpawningOllama = false;
        return true;
      }
    }
  } catch {
    // ignore
  } finally {
    isSpawningOllama = false;
  }
  return false;
}

async function pingOllama(url: string, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const parsedUrl = new URL(`${url.replace(/\/+$/, "")}/api/tags`);
      const client = parsedUrl.protocol === "https:" ? https : http;
      const req = client.get(
        parsedUrl,
        { timeout: timeoutMs },
        (res) => {
          resolve(!!(res.statusCode && res.statusCode >= 200 && res.statusCode < 300));
        },
      );
      req.on("error", () => resolve(false));
      req.on("timeout", () => {
        req.destroy();
        resolve(false);
      });
    } catch {
      resolve(false);
    }
  });
}

export async function isLocalLlmAvailable(
  url: string = "http://localhost:11434",
  timeoutMs: number = 1000,
): Promise<boolean> {
  return ensureOllamaRunning(url);
}

export async function queryOllamaJson(
  url: string,
  model: string,
  messages: { role: string; content: string }[],
  timeoutMs: number = 30000,
): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const parsedUrl = new URL(`${url.replace(/\/+$/, "")}/api/chat`);
      const payload = JSON.stringify({
        model,
        messages,
        format: "json",
        stream: false,
        options: {
          temperature: 0.1,
        },
      });

      const client = parsedUrl.protocol === "https:" ? https : http;
      const req = client.request(
        parsedUrl,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(payload),
          },
          timeout: timeoutMs,
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              try {
                const parsed = JSON.parse(data);
                const content = parsed.message?.content || parsed.response || "";
                resolve(content);
              } catch {
                resolve(null);
              }
            } else {
              resolve(null);
            }
          });
        },
      );

      req.on("error", () => resolve(null));
      req.on("timeout", () => {
        req.destroy();
        resolve(null);
      });

      req.write(payload);
      req.end();
    } catch {
      resolve(null);
    }
  });
}

export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}

const activeSessionHistory: ConversationTurn[] = [];
const activeContextFacts: Record<string, any> = {};

export function addSessionTurn(role: "user" | "assistant", content: string): void {
  if (!content) return;
  activeSessionHistory.push({ role, content });
  if (activeSessionHistory.length > 10) {
    activeSessionHistory.shift();
  }
}

export function addContextFacts(facts: Record<string, any>): void {
  if (!facts || typeof facts !== "object") return;
  Object.assign(activeContextFacts, facts);
}

export function getSessionHistory(): ConversationTurn[] {
  return [...activeSessionHistory];
}

export function getContextFacts(): Record<string, any> {
  return { ...activeContextFacts };
}

export function clearSessionHistory(): void {
  activeSessionHistory.length = 0;
  for (const k of Object.keys(activeContextFacts)) {
    delete activeContextFacts[k];
  }
}

import { detectLanguage } from "./languageEngine";

export async function processLocalIntent(
  userInput: string,
  rootDir: string = process.cwd(),
): Promise<ParsedIntentResult | null> {
  const env = loadEnvironment(rootDir);
  const localUrl = env.localLlmUrl || "http://localhost:11434";
  const localModel = env.localLlmModel || "qwen2.5:3b";

  const paths = getProjectPaths(rootDir);
  const state = loadState(paths.statePath);
  const modeConfig = state.operatingMode;
  const detectedInputLang = detectLanguage(userInput);
  const lang = detectedInputLang || modeConfig?.detectedLanguage || "es";
  const dict = getI18n(lang);
  const isSuccinct = modeConfig?.isSuccinctMode !== false;
  const debugLevel = env.debugLevel;

  const userId = state.activeUser?.userId ?? "user_local";
  const prefs = getPreference(userId, rootDir);
  const preferenceBlock = prefs ? buildPreferencePromptBlock(prefs) : "";
  const currentFacts = getContextFacts();
  const factsBlock = Object.keys(currentFacts).length > 0
    ? `\nACCUMULATED SESSION CONTEXT (Previously Stated Facts & Constraints):\n${JSON.stringify(currentFacts, null, 2)}\n`
    : "";

  const systemPrompt = `You are the iNoU Interaction Engine & Decentralized Multiagent LLM Orchestration Platform AI.
You are running locally via ${localModel}.
You MUST analyze the user input in the context of the accumulated session context and recent conversation, and output strictly a valid JSON object.

CRITICAL LANGUAGE MANDATE:
- Target Interaction Language: "${lang}".
- You MUST generate "explanation", "thinkingDetails", and all user-facing text strictly in "${lang}".
- If the user prompt is in Spanish, reply in natural, fluent Spanish.
- If the user prompt is in English, reply in English.
- If the user prompt is in French, reply in French.
- If the user prompt is in German, reply in German.
- If the user prompt is in Portuguese, reply in Portuguese.

MULTI-TURN CONVERSATION & CO-REFERENCE RESOLUTION:
- ALWAYS evaluate the user prompt in the context of the previous conversation turns and accumulated session context.
- If the user uses pronouns or references like "pero como lo hago aca", "como lo hago", "hazlo con eso", "y eso?", "donde?", resolve what "eso / lo" refers to from the previous messages in the conversation.
${factsBlock}
CONTRADICTION DETECTION & PROACTIVE CLARIFICATION:
- Continuously check incoming user statements against the ACCUMULATED SESSION CONTEXT.
- If the user provides a statement that CONTRADICTS a previously accumulated fact (e.g. previously stated "puerto 3000" and now says "puerto 8080", or previously "PostgreSQL" and now "SQLite"):
  1. Set "dialogue_act": "CLARIFICATION"
  2. Set "type": "QUERY"
  3. Set "doubts": ["Contradicción detectada entre el valor previo y el nuevo valor."]
  4. In "explanation", explicitly point out the discrepancy in "${lang}" and politely ask the user to clarify which setting/option they wish to keep.

DOMAIN SEPARATION: MARKETPLACE "CONNECTING NEEDS" vs GENERAL ASSISTANT CHAT:
- "NEED" / "OFFER" intent types and "need create" / "offer create" commands are STRICTLY for the P2P Marketplace of Specifications (Connecting Needs public barter/matchmaking across nodes).
- DO NOT classify general conversational chat, setup assistance, or task orchestration as "NEED" or "OFFER".
- For general assistance, configuration, questions, or context, use "QUERY", "PROVIDE_CONTEXT", or "EXECUTE_COMMAND".

EXECUTION ORDERS WITH ACCUMULATED CONTEXT (Dialogue Act: "EXECUTE_COMMAND"):
- When the user gives an order or instruction to execute an action (e.g. "hazlo ahora", "procede", "detalla el plan", "ejecuta la configuración"):
  1. HYDRATE WITH CONTEXT: You MUST merge all previously shared facts, constraints, entities, and environment details from the accumulated session context into the execution plan.
  2. DETAILED ACTION SUMMARY: In "explanation", generate a detailed, comprehensive prompt breakdown in "${lang}" clearly summarizing:
     - The exact action being taken.
     - All accumulated parameters and facts being applied (e.g., ports, databases, quantities, targets).
     - Next steps or command output.
  3. STRUCTURED RESULT: Populate "commandSequence" or "subNeeds" fully hydrated with the accumulated facts.

ABOUT iNoU PLATFORM (Architecture & Commands):
- iNoU is a decentralized, self-orchestrating multiagent LLM platform and specification lifecycle management engine.
- Direct Commands in Prompt Area:
  • "setup llm <apiKey>" or "key <apiKey>" -> Configure Gemini API Key inside iNoU
  • "need create --verb <Verb> --object <Object>" -> Publish a Public Marketplace Need (Connecting Needs)
  • "offer create --verb <ComplementVerb> --object <Object>" -> Publish a Public Marketplace Offer
  • "match" -> Find marketplace peer matches
  • "status" -> View system & node status
  • "catalog" -> View global catalog
  • "whoami" -> View active identity
  • "help" / "?" -> View all commands

CONFIGURATION & SETUP INQUIRIES ("como configurar gemini", "como conectar api key", "pero como lo hago aca", "como configuro"):
If the user asks how to configure Gemini API Key or credentials inside iNoU:
- Set "type": "QUERY"
- Set "dialogue_act": "CHAT"
- In "explanation", explicitly explain in "${lang}" that within this prompt area they can type:
  • \`setup llm <tu_api_key>\` o \`key <tu_api_key>\` y presionar Enter.
  • O agregar \`GEMINI_API_KEY=tu_clave\` en el archivo \`.env\`.

COMMAND & CAPABILITY INQUIRIES ("¿qué comandos puedo usar?", "qué puedo escribir?", "what can I type?", "show examples", "cómo empiezo?"):
If the user asks what commands they can type or how to interact:
- Set "type": "QUERY"
- Set "dialogue_act": "CHAT"
- In "explanation", provide concrete, clear examples that can be typed directly into the prompt box.

ZERO-ASSUMPTION & ACCIDENTAL SEND RULES:
- DO NOT assume the user wants to take action if they merely state facts, notes, or constraints without a command.
- Set "dialogue_act": "PROVIDE_CONTEXT", set "type": "QUERY", and extract facts into "delta_facts".
- If the user sent an incomplete phrase or fragment, set "dialogue_act": "PROVIDE_CONTEXT", and note that the fragment was saved to context, asking if they pressed Enter too early.

Intent Types:
- "NEED": Single need formulation
- "OFFER": Single offer formulation
- "DETAIL_PLAN": Complex goal planning/decomposition
- "ANSWER": Providing detail or answering doubt
- "CORRECTION": Correcting a misunderstanding
- "QUERY": Overview, question, or inquiry about iNoU
- "EVOLVE": Self-evolution request
- "LEARN": Skill learning request
- "EXIT": Session termination
- "COMMAND_SEQUENCE": Sequence of CLI commands

Return ONLY a raw JSON object with NO markdown formatting:
{
  "type": "NEED" | "OFFER" | "DETAIL_PLAN" | "ANSWER" | "CORRECTION" | "QUERY" | "EVOLVE" | "LEARN" | "EXIT" | "COMMAND_SEQUENCE",
  "dialogue_act": "PROVIDE_CONTEXT" | "EXECUTE_COMMAND" | "CLARIFICATION" | "CHAT",
  "verb": "PrimaryVerb",
  "object": "PrimaryObject",
  "goalText": "Goal description if EVOLVE/LEARN",
  "targetIdOrCode": "Optional step code",
  "answerText": "Answer details",
  "correctionTopic": "Topic area",
  "correctionText": "Rule text",
  "modelType": "Transactional" | "GiftBased",
  "explanation": "Clear explanation strictly in ${lang}",
  "thinkingDetails": "Reasoning thoughts in ${lang}",
  "debugDetails": "Qwen 2.5 Local Intent Engine",
  "commandSequence": [ "need create --verb Request --object Food" ],
  "subNeeds": [ { "verb": "SubVerb", "object": "SubObject" } ],
  "doubts": [ "Optional doubt in ${lang}" ],
  "delta_facts": { "key": "value" },
  "confidence": 0.98
}`;

  writeOutput(
    OutputChannelEnum.THINKING,
    `[Local SLM: ${localModel}] ${dict.intentParser?.analyzing || "Analyzing intent locally..."}`,
    debugLevel,
  );

  const history = getSessionHistory();
  const messages = [
    { role: "system", content: systemPrompt },
    ...history,
    { role: "user", content: userInput },
  ];

  const rawOutput = await queryOllamaJson(localUrl, localModel, messages);

  if (!rawOutput) {
    return null;
  }

  try {
    const cleanJson = rawOutput
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    const result = JSON.parse(cleanJson) as LocalSLMResponse;

    if (result.thinkingDetails) {
      writeOutput(
        OutputChannelEnum.THINKING,
        result.thinkingDetails,
        debugLevel,
      );
    }

    // Emit structured JSON interpretation to Depuración (DEBUG) channel
    writeOutput(
      OutputChannelEnum.DEBUG,
      `⚙ [Qwen 2.5 Intent Interpretation JSON]:\n${JSON.stringify(result, null, 2)}`,
      debugLevel,
    );

    // Record accumulated facts if any
    if (result.delta_facts) {
      addContextFacts(result.delta_facts);
    }

    // Record this turn in session history for co-reference resolution
    addSessionTurn("user", userInput);
    if (result.explanation) {
      addSessionTurn("assistant", result.explanation);
    }

    return result as ParsedIntentResult;
  } catch {
    return null;
  }
}
