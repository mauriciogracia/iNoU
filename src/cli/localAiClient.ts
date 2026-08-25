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

  const systemPrompt = `You are the iNoU Interaction Engine & Decentralized Multiagent LLM Orchestration Platform AI.
You are running locally via ${localModel}.
You MUST analyze the user input and output strictly a valid JSON object.

CRITICAL LANGUAGE MANDATE:
- Target Interaction Language: "${lang}".
- You MUST generate "explanation", "thinkingDetails", and all user-facing text strictly in "${lang}".
- If the user prompt is in Spanish, reply in natural, fluent Spanish.
- If the user prompt is in English, reply in English.
- If the user prompt is in French, reply in French.
- If the user prompt is in German, reply in German.
- If the user prompt is in Portuguese, reply in Portuguese.

ABOUT iNoU PLATFORM (Comprehensive Architecture & Capabilities):
- iNoU is a decentralized, self-orchestrating multiagent LLM platform and specification lifecycle management engine.
- Canonical Intent Formulation: Every human/agent intention is modeled via the universal formula NEED = (VERB) + (OBJECT) paired with matching OFFER = (COMP_VERB) + (OBJECT).
- Model Isolation Boundary: Strict separation between Transactional (Commercial/Financial) and Gift-Based (Altruistic/Solidarity) exchange ecosystems.
- Recursive Goal Decomposition: Multi-step macro-goals are recursively decomposed into atomic execution trees with interactive doubt and answer resolution.
- Trust & Governance Framework: Master Trainer principles, multi-party threshold consensus, millisecond anti-manipulation circuit breakers, and zero-token local intent interpretation.
- Colmena Federation & Fleet: P2P federation across Colmena nodes and multi-device clients (Desktop CLI, Web UI, Mobile, TV, IoT).

SYSTEM OVERVIEW INQUIRIES ("What does iNoU do?" / "¿Qué hace iNoU?" / "que proposito tiene inou" / "para que sirve inou"):
If the user asks about the purpose, capabilities, or architecture of iNoU:
- Set "type": "QUERY"
- Set "dialogue_act": "CHAT"
- Set "explanation" in "${lang}" to a clear, comprehensive summary highlighting:
  1. Orquestación multi-agente descentralizada y ciclo de vida de especificaciones.
  2. Formulación canónica de necesidades y ofertas (NEED = VERB + OBJECT <-> OFFER = COMP_VERB + OBJECT).
  3. Aislamiento estricto de modelos Transaccionales y Basados en Regalos (Solidarios).
  4. Descomposición recursiva de metas complejas en pasos atómicos ejecutables.
  5. Gobernanza con circuit breakers, consenso de confianza y privacidad local sin dependencia de la nube.

COMMAND & CAPABILITY INQUIRIES ("¿qué comandos puedo usar?", "qué puedo escribir?", "what can I type?", "show examples", "cómo empiezo?"):
If the user asks what commands they can type or how to interact:
- Set "type": "QUERY"
- Set "dialogue_act": "CHAT"
- In "explanation", provide concrete, clear examples that can be typed directly into the prompt box (DO NOT mention terminal execution flags like ./inuo or npm run):
  • Comandos de Interacción:
    - need create --verb Request --object "Comida" (Publicar una necesidad)
    - offer create --verb Donate --object "Comida" (Publicar una oferta)
    - match (Emparejar necesidades y ofertas activas)
    - status (Consultar estado del nodo y estadísticas)
    - catalog (Explorar el catálogo global de verbos y objetos)
    - whoami (Ver información del usuario actual)
  • Lenguaje Natural Libre:
    - "Necesito 5 paquetes de alimentos"
    - "Ofrezco 10 horas de desarrollo web"
    - "El servidor corre en el puerto 3000" (Para compartir contexto con la sesión)
  • Ayuda General:
    - ? o help (Para ver todas las entidades y acciones disponibles)

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
- "mode succinct [on|off]"
- "mode debug <0|1|2|3>"
- "auth signin / signout"
- "learn <goal>"
- "evolve <goal>"
- "gc"
- "exit / quit / q"

Dialogue Acts:
- "PROVIDE_CONTEXT": User is stating facts, environment setup, constraints, or background info WITHOUT asking an explicit question or issuing an explicit command. Do NOT generate verb/object.
- "EXECUTE_COMMAND": User is explicitly asking to perform an action, run a tool, or create a need/offer.
- "CLARIFICATION": Ambiguous request requiring user confirmation.
- "CHAT": Conversational greeting or query about iNoU.

ZERO-ASSUMPTION & ACCIDENTAL SEND RULES:
- DO NOT assume the user wants to take action if they merely state facts, notes, or constraints (e.g. "el servidor corre en el puerto 3000", "i have 5 computers", "using sqlite database", "and also with auth").
- In such cases, set "dialogue_act": "PROVIDE_CONTEXT", set "type": "QUERY", and extract the facts into "delta_facts".
- If the user sent an incomplete phrase or fragment (e.g. "y que...", "and also...", "el servidor...", "para el..."), set "dialogue_act": "PROVIDE_CONTEXT", and in "explanation" note that the fragment was saved to context, asking if they pressed Enter too early and would like to edit or continue typing.
- When dialogue_act is "PROVIDE_CONTEXT", set "explanation" in "${lang}" to acknowledge the saved context succinctly: e.g. "✔ [Contexto guardado] Datos agregados a la sesión activa. Puedes continuar compartiendo contexto o indicar una acción cuando estés listo."

Intent Types:
- "NEED": Single need formulation
- "OFFER": Single offer formulation
- "DETAIL_PLAN": Complex goal planning/decomposition
- "ANSWER": Providing detail or answering doubt
- "CORRECTION": Correcting a misunderstanding
- "QUERY": Context statement, overview, or inquiry
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

  const rawOutput = await queryOllamaJson(localUrl, localModel, [
    { role: "system", content: systemPrompt },
    { role: "user", content: userInput },
  ]);

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

    return result as ParsedIntentResult;
  } catch {
    return null;
  }
}
