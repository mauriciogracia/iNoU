import readline from "readline";
import { createContext, getProjectPaths, loadState } from "./context";
import { runBootstrap } from "./bootstrapCommand";
import { runStatus } from "./statusCommand";
import { runCatalog } from "./catalogCommand";
import { runNeedCommand } from "./needCommand";
import { runOfferCommand } from "./offerCommand";
import { runMatchCommand } from "./matchCommand";
import { runTest } from "./testCommand";
import { runRollback } from "./rollbackCommand";
import {
  getStoredApiKey,
  saveApiKey,
  processNaturalLanguageIntent,
} from "./aiClient";
import {
  checkAndApplySyncProtocol,
  runSelectiveSyncCommand,
} from "./syncEngine";
import { runEvolveCommand } from "./evolveCommand";
import { runDetailCommand, runAnswerCommand } from "./detailCommand";
import {
  runRoleCommand,
  runPrincipleCommand,
  runBehaviorCommand,
  runSkillCommand,
} from "./governanceCommand";
import { runWhoamiCommand, runUserSetCommand } from "./userCommand";
import {
  processUserCorrection,
  exportTrainingData,
  mergeTrainingData,
} from "./learningEngine";
import { runForgetCommand } from "./forgetCommand";
import { detectPrincipleIncoherence } from "./incoherenceEngine";
import { detectManipulationAttempt } from "./manipulationDefenseEngine";
import { runMCPCommand } from "./mcpCommand";
import { runColmenaCommand } from "./colmenaCommand";
import { runDeviceCommand } from "./deviceCommand";
import {
  generateSelfAwarenessResponse,
  generateSelfAwarenessResponseWithLLMFallback,
} from "./selfAwarenessEngine";
import {
  triggerEmergencyIncapacitation,
  authorizeEmergencyCommand,
} from "./emergencyEngine";
import { writeOutput } from "./outputRouter";
import { OutputChannelEnum } from "../enums/OutputChannelEnum";
import { LogLevelEnum } from "../enums/LogLevelEnum";
import { runMasterMindCommand } from "./masterMindCommand";
import { runMemberCommand } from "./memberCommand";
import { runEngineCommand } from "./engineCommand";
import { runAuthCommand } from "./authCommand";
import { runThresholdCommand } from "./thresholdCommand";
import { detectLanguage } from "./languageEngine";
import {
  initiateHostGreeting,
  setInteractionLanguage,
  setOperatingMode,
  setSuccinctMode,
  setDebugLevel,
} from "./hostServiceEngine";
import { runSocialCommand } from "./socialCommand";
import { runQuestionCommand } from "./questionCommand";
import { calculateInuoVersion } from "./versionEngine";
import { runVersionCommand } from "./versionCommand";
import { INUOTerminalUI } from "./tuiEngine";
import { runGCCommand } from "./gcCommand";
import { TOOL_NAME, TOOL_CMD } from "./brand";
import { handleFormatSignal } from "./preferenceEngine";
import { runAiCommand } from "./aiCommand";
import {
  createTerminalLLMConfigurationPrompter,
  runLLMCommand,
} from "./llmCommand";
import { LLMConfigurationPrompter } from "../interfaces/LLMConfigurationPrompter";
import { runNodeCommand } from "./nodeCommand";
import { runSocialMediaCommand, runSNCommand } from "./snCommand";
import { runTierCommand } from "./tierCommand";
import { runSetupCommand } from "./setupCommand";
import { runLearnCommand } from "./learnCommand";
import { resolveAlias, runAliasCommand } from "./aliasCommand";
import {
  parseSemanticCommand,
  executeSemanticCommand,
  normalizeSemanticEntity,
} from "./semanticDispatcher";
import { runAdaptiveCommand } from "./adaptiveEnvironmentEngine";
import { renderCommandHelp } from "./autocomplete";

export function tokenizeCommandLine(input: string): string[] {
  const tokens: string[] = [];
  const regex = /[^\s"']+|"([^"]*)"|'([^']*)'/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(input)) !== null) {
    if (match[1] !== undefined) {
      tokens.push(match[1]);
    } else if (match[2] !== undefined) {
      tokens.push(match[2]);
    } else {
      tokens.push(match[0]);
    }
  }
  return tokens;
}

export async function executeShellLine(
  trimmed: string,
  rootDir: string = process.cwd(),
  llmPrompter?: LLMConfigurationPrompter,
): Promise<void> {
  if (!trimmed) return;

  const resolvedLine = resolveAlias(trimmed, rootDir);
  const paths = getProjectPaths(rootDir);
  const stateData = loadState(paths.statePath);

  const parts = tokenizeCommandLine(resolvedLine);
  if (parts.length === 0) return;
  const cmd = parts[0].toLowerCase();

  // Check if first token is a canonical or localized Semantic Entity
  const builtInCommands = new Set([
    "alias",
    "learn",
    "setup",
    "tier",
    "version",
    "question",
    "social",
    "socialmedia",
    "sn",
    "auth",
    "signin",
    "login",
    "signout",
    "threshold",
    "whoami",
    "user",
    "member",
    "device",
    "engine",
    "mastermind",
    "role",
    "principle",
    "behavior",
    "skill",
    "mcp",
    "llm",
    "node",
    "colmena",
    "forget",
    "correct",
    "export-training",
    "merge-training",
    "evolve",
    "sync",
    "serve",
    "api",
    "hub",
    "adapt",
    "adaptive",
    "key",
    "init",
    "bootstrap",
    "status",
    "gc",
    "browser",
    "chrome",
    "ai",
    "catalog",
    "need",
    "offer",
    "match",
    "detail",
    "answer",
    "test",
    "rollback",
    "help",
    "exit",
    "quit",
    "q",
    "bye",
    "goodbye",
    "chao",
    "chau",
    "adios",
    "ciao",
    "sayonara",
    "aufwiedersehen",
    "mode",
  ]);

  if (!builtInCommands.has(cmd) && normalizeSemanticEntity(cmd)) {
    const semanticPayload = parseSemanticCommand(parts);
    if (semanticPayload) {
      const handled = await executeSemanticCommand(semanticPayload, rootDir);
      if (handled) return;
    }
  }

  switch (cmd) {
    case "alias":
      runAliasCommand(parts.slice(1), rootDir);
      break;

    case "learn":
      await runLearnCommand(parts.slice(1), rootDir);
      break;

    case "setup":
      await runSetupCommand(parts.slice(1), rootDir, llmPrompter);
      break;

    case "tier":
      runTierCommand(parts.slice(1), rootDir);
      break;

    case "version":
    case "-v":
    case "--version":
      runVersionCommand(parts.slice(1), rootDir);
      break;

    case "question":
      runQuestionCommand(parts.slice(1), rootDir);
      break;

    case "social":
      runSocialCommand(parts.slice(1), rootDir);
      break;

    case "socialmedia":
    case "sn":
      runSocialMediaCommand(parts.slice(1), rootDir);
      break;

    case "auth":
      runAuthCommand(parts.slice(1), rootDir);
      break;

    case "signin":
    case "login":
      runAuthCommand(["signin", ...parts.slice(1)], rootDir);
      break;

    case "signout":
    case "logout":
      runAuthCommand(["signout"], rootDir);
      break;

    case "threshold":
      runThresholdCommand(parts.slice(1), rootDir);
      break;

    case "mode": {
      const modeValue = parts[1]?.toLowerCase();
      const debugValue = parts[2] ? Number(parts[2]) : undefined;
      if (modeValue === "debug" && debugValue !== undefined) {
        setDebugLevel(debugValue, rootDir);
        break;
      }
      if (modeValue === "succinct") {
        const enabled = parts[2]
          ? !/^(off|false|0|disable|disabled)$/.test(parts[2].toLowerCase())
          : true;
        setSuccinctMode(enabled, rootDir);
        break;
      }
      if (modeValue === "promptme" || modeValue === "promptme") {
        setOperatingMode("promptMe", rootDir);
        break;
      }
      if (modeValue === "letmeserveyou" || modeValue === "let-me-serve-you") {
        setOperatingMode("letMeServeYou", rootDir);
        break;
      }
      setOperatingMode(modeValue || "promptMe", rootDir);
      break;
    }

    case "whoami":
      runWhoamiCommand(rootDir);
      break;

    case "user":
      if (parts[1]?.toLowerCase() === "set") {
        runUserSetCommand(parts.slice(2), rootDir);
      } else {
        runWhoamiCommand(rootDir);
      }
      break;

    case "member":
      runMemberCommand(parts.slice(1), rootDir);
      break;

    case "device":
      runDeviceCommand(parts.slice(1), rootDir);
      break;

    case "engine":
      runEngineCommand(parts.slice(1), rootDir);
      break;

    case "mastermind":
      runMasterMindCommand(parts.slice(1), rootDir);
      break;

    case "role":
      runRoleCommand(parts.slice(1), rootDir);
      break;

    case "principle":
      runPrincipleCommand(parts.slice(1), rootDir);
      break;

    case "behavior":
      runBehaviorCommand(parts.slice(1), rootDir);
      break;

    case "skill":
      runSkillCommand(parts.slice(1), rootDir);
      break;

    case "mcp":
      runMCPCommand(parts.slice(1), rootDir);
      break;

    case "llm":
      await runLLMCommand(parts.slice(1), rootDir, llmPrompter);
      break;

    case "node":
      runNodeCommand(parts.slice(1), rootDir);
      break;

    case "colmena":
      runColmenaCommand(parts.slice(1), rootDir);
      break;

    case "forget":
      runForgetCommand(parts.slice(1), rootDir);
      break;

    case "correct":
      if (parts[1] && parts[2]) {
        processUserCorrection(parts[1], parts.slice(2).join(" "), rootDir);
      } else {
        writeOutput(
          OutputChannelEnum.USER_REPLY,
          "Usage: correct <topic> <learned_directive_rule>",
        );
      }
      break;

    case "export-training":
      exportTrainingData(rootDir);
      break;

    case "merge-training":
      mergeTrainingData(rootDir);
      break;

    case "evolve":
      await runEvolveCommand(parts.slice(1).join(" "), rootDir);
      break;

    case "sync":
      runSelectiveSyncCommand(parts.slice(1), rootDir);
      break;

    case "serve":
    case "api":
    case "hub":
      const port = parts[1]
        ? parseInt(parts[1], 10)
        : parseInt(process.env.PORT || "8765", 10);
      const host = process.env.HOST || "0.0.0.0";
      const { ApiServer } = require("../api");
      const apiServer = new ApiServer(port, host, rootDir);
      console.log(
        `Starting iNoU Cloud Relay Hub & API Gateway on http://${host === "0.0.0.0" ? "127.0.0.1" : host}:${port}...`,
      );
      await apiServer.start();
      console.log(
        `✔ [Cloud Relay Hub Active] Server listening on http://${host === "0.0.0.0" ? "127.0.0.1" : host}:${port}`,
      );
      break;

    case "adapt":
    case "adaptive":
      await runAdaptiveCommand(parts.slice(1), rootDir);
      break;

    case "key":
      if (!parts[1]) {
        const storedKey = getStoredApiKey(rootDir);
        writeOutput(
          OutputChannelEnum.USER_REPLY,
          `Current Gemini API Key: ${storedKey ? "Connected (****" + storedKey.slice(-4) + ")" : "Not Set"}`,
        );
      } else {
        saveApiKey(parts[1], rootDir);
        writeOutput(
          OutputChannelEnum.USER_REPLY,
          "✔ Successfully saved and connected Google Gemini API key!",
        );
      }
      break;

    case "init":
    case "bootstrap":
      runBootstrap(rootDir);
      break;

    case "status":
      runStatus(rootDir);
      break;

    case "gc":
    case "chrome":
    case "browser":
      runGCCommand(3000, rootDir);
      break;

    case "ai":
      await runAiCommand(parts.slice(1), rootDir);
      break;

    case "catalog":
      runCatalog(parts.slice(1), rootDir);
      break;

    case "need":
      runNeedCommand(parts.slice(1), rootDir);
      break;

    case "offer":
      runOfferCommand(parts.slice(1), rootDir);
      break;

    case "match":
      runMatchCommand(rootDir);
      break;

    case "detail":
      await runDetailCommand(parts.slice(1), rootDir);
      break;

    case "answer":
      runAnswerCommand(parts.slice(1), rootDir);
      break;

    case "test":
      runTest(parts[1], rootDir);
      break;

    case "rollback":
      if (!parts[1]) {
        writeOutput(
          OutputChannelEnum.USER_REPLY,
          "Usage: rollback <target_version>",
        );
      } else {
        runRollback(parts[1], rootDir);
      }
      break;

    case "help":
    case "?":
    case "ayuda":
    case "commands":
    case "comandos":
      writeOutput(OutputChannelEnum.USER_REPLY, renderCommandHelp());
      break;

    case "exit":
    case "quit":
    case "q":
    case "bye":
    case "goodbye":
    case "chao":
    case "chau":
    case "adios":
    case "ciao":
    case "sayonara":
    case "aufwiedersehen":
      writeOutput(
        OutputChannelEnum.USER_REPLY,
        `Exiting ${TOOL_NAME} shell. ¡Hasta luego! / Goodbye! / Chao!`,
      );
      process.exit(0);

    default:
      if (stateData?.operatingMode?.autoDetectLanguage) {
        const detectedLang = detectLanguage(trimmed);
        setInteractionLanguage(detectedLang, true, rootDir);
      }

      // Emergency & Manipulation Checks
      const activeUser = stateData?.activeUser;

      const emergencyAuth = authorizeEmergencyCommand(
        activeUser?.userId || "user_local",
        activeUser?.isFamilyMember || false,
        trimmed,
        rootDir,
      );

      if (!emergencyAuth.allowed) {
        writeOutput(OutputChannelEnum.USER_REPLY, emergencyAuth.reason);
        break;
      }

      const manipulationCheck = detectManipulationAttempt(
        trimmed,
        "UserInput",
        rootDir,
      );
      if (manipulationCheck.isManipulative) {
        writeOutput(
          OutputChannelEnum.USER_REPLY,
          `❌ [Manipulation Blocked] Security Engine rejected input prompt: ${manipulationCheck.explanation}`,
        );
        break;
      }

      // Format preference signal — handled locally, no LLM needed
      const userId = activeUser?.userId ?? "user_local";
      const lang = stateData?.operatingMode?.detectedLanguage ?? "en";
      if (handleFormatSignal(trimmed, userId, lang, rootDir)) break;

      const lowerTrimmed = trimmed.toLowerCase();
      if (
        lowerTrimmed === "?" ||
        lowerTrimmed === "¿?" ||
        lowerTrimmed === "help" ||
        lowerTrimmed === "ayuda" ||
        lowerTrimmed === "commands" ||
        lowerTrimmed === "comandos" ||
        lowerTrimmed.includes("show commands") ||
        lowerTrimmed.includes("list commands") ||
        lowerTrimmed.includes("available commands") ||
        lowerTrimmed.includes("comandos disponibles") ||
        lowerTrimmed.includes("que comandos") ||
        lowerTrimmed.includes("qué comandos") ||
        lowerTrimmed.includes("cuales son los comandos") ||
        lowerTrimmed.includes("cuáles son los comandos")
      ) {
        writeOutput(OutputChannelEnum.USER_REPLY, renderCommandHelp());
        break;
      }
      if (
        lowerTrimmed.includes("who are you") ||
        lowerTrimmed.includes("tell me about yourself") ||
        lowerTrimmed.includes("what are your principles") ||
        lowerTrimmed.includes(`what is ${TOOL_CMD}`) ||
        lowerTrimmed.includes("quien eres") ||
        lowerTrimmed.includes("quién eres")
      ) {
        const selfAwareness =
          await generateSelfAwarenessResponseWithLLMFallback(
            activeUser?.userId || "user_local",
            "User",
            trimmed,
            rootDir,
          );
        writeOutput(
          OutputChannelEnum.USER_REPLY,
          selfAwareness.generatedResponseText,
        );
        break;
      }

      const incoherence = detectPrincipleIncoherence(trimmed, rootDir);
      if (incoherence.hasIncoherence) {
        writeOutput(
          OutputChannelEnum.USER_REPLY,
          `❌ [Incoherence Detected] Execution Blocked! Prompt conflicts with Principle "${incoherence.conflictingPrincipleName}": ${incoherence.explanation}`,
        );
        break;
      }

      const currentDebug =
        stateData?.operatingMode?.debugLevel !== undefined
          ? stateData.operatingMode.debugLevel
          : 1;
      const result = await processNaturalLanguageIntent(trimmed, rootDir);

      if (result) {
        if (
          result.type === "COMMAND_SEQUENCE" ||
          (result.commandSequence && result.commandSequence.length > 0)
        ) {
          const seq = result.commandSequence || [];
          if (result.explanation) {
            writeOutput(OutputChannelEnum.USER_REPLY, result.explanation);
          }
          for (const cmdLine of seq) {
            await executeShellLine(cmdLine, rootDir, llmPrompter);
          }
        } else if (result.type === "NEED" && result.verb && result.object) {
          writeOutput(
            OutputChannelEnum.USER_REPLY,
            `✔ AI Parsed Need Intent: ${result.explanation || ""}`,
          );
          runNeedCommand(
            ["create", "--verb", result.verb, "--object", result.object],
            rootDir,
          );
        } else if (result.type === "OFFER" && result.verb && result.object) {
          writeOutput(
            OutputChannelEnum.USER_REPLY,
            `✔ AI Parsed Offer Intent: ${result.explanation || ""}`,
          );
          runOfferCommand(
            ["create", "--verb", result.verb, "--object", result.object],
            rootDir,
          );
        } else if (
          result.type === "DETAIL_PLAN" &&
          result.verb &&
          result.object
        ) {
          writeOutput(
            OutputChannelEnum.USER_REPLY,
            `✔ AI Parsed Detailing & Planning Goal: ${result.explanation || ""}`,
          );
          runNeedCommand(
            ["create", "--verb", result.verb, "--object", result.object],
            rootDir,
          );
          await runDetailCommand(["1", "decompose", trimmed], rootDir);
        } else if (result.type === "ANSWER" && result.answerText) {
          writeOutput(
            OutputChannelEnum.USER_REPLY,
            `✔ AI Parsed Knowledge Answer: ${result.explanation || ""}`,
          );
          runAnswerCommand(
            [result.targetIdOrCode || "1", result.answerText],
            rootDir,
          );
        } else if (result.type === "CORRECTION" && result.correctionText) {
          writeOutput(
            OutputChannelEnum.USER_REPLY,
            `✔ AI Parsed User Correction: ${result.explanation || ""}`,
          );
          processUserCorrection(
            result.correctionTopic || "General",
            result.correctionText,
            rootDir,
          );
        } else if (result.type === "EVOLVE") {
          const goal = result.goalText || result.object || trimmed;
          writeOutput(
            OutputChannelEnum.USER_REPLY,
            `\x1b[36m✔ AI Identified Self-Evolution Goal: "${goal}"\x1b[0m`,
          );
          await runEvolveCommand(goal, rootDir);
        } else if (result.type === "LEARN") {
          const goal = result.goalText || result.object || trimmed;
          writeOutput(
            OutputChannelEnum.USER_REPLY,
            `\x1b[36m✔ AI Identified Skill Learning Goal: "${goal}"\x1b[0m`,
          );
          await runLearnCommand(goal.split(/\s+/), rootDir);
        } else if (result.type === "EXIT") {
          writeOutput(
            OutputChannelEnum.USER_REPLY,
            result.explanation || `Exiting ${TOOL_NAME} shell. ¡Hasta luego!`,
          );
          process.exit(0);
        } else if (result.explanation) {
          writeOutput(OutputChannelEnum.USER_REPLY, result.explanation);
        }
      }
      break;
  }
}

export function startInteractiveShell(rootDir: string = process.cwd()): void {
  const syncRes = checkAndApplySyncProtocol(rootDir);
  const inuoVer = calculateInuoVersion(rootDir);
  const version = inuoVer.fullVersionString;

  // Initialize Split-Pane Terminal UI (TUI)
  const tui = new INUOTerminalUI({
    version,
    rootDir,
    onCommand: async (cmd: string, prompter?: LLMConfigurationPrompter) => {
      await executeShellLine(cmd, rootDir, prompter);
    },
  });

  tui.start();
}

export async function dispatchSingleCommand(
  args: string[],
  rootDir: string = process.cwd(),
): Promise<void> {
  checkAndApplySyncProtocol(rootDir);
  const line = args
    .map((arg) =>
      arg.includes(" ") && !arg.startsWith('"') && !arg.startsWith("'")
        ? `"${arg}"`
        : arg,
    )
    .join(" ");
  const needsPrompter =
    args[0]?.toLowerCase() === "llm" && args[1]?.toLowerCase() === "add";
  const prompter = needsPrompter
    ? createTerminalLLMConfigurationPrompter()
    : undefined;
  try {
    await executeShellLine(line, rootDir, prompter);
  } finally {
    prompter?.close?.();
  }
}
