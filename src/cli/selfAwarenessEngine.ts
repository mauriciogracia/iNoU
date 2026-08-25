import { getProjectPaths, loadState } from "./context";
import { getTrustRecord } from "./trustEngine";
import { SelfAwarenessReport } from "../interfaces/SelfAwarenessReport";
import { processNaturalLanguageIntent } from "./aiClient";
import { writeOutput } from "./outputRouter";
import { OutputChannelEnum } from "../enums/OutputChannelEnum";
import { TOOL_NAME } from "./brand";

export function generateSelfAwarenessResponse(
  callerEntityId: string = "user_local",
  callerEntityType: "User" | "PeerNode" | "MCPServer" | "ExternalAI" = "User",
  queryText: string = "Who are you?",
  rootDir: string = process.cwd(),
): SelfAwarenessReport {
  const paths = getProjectPaths(rootDir);
  const state = loadState(paths.statePath);
  const trust = getTrustRecord(callerEntityId, callerEntityType, rootDir);

  const specVersion = "00.03.70";

  // 1. Untrusted / Blacklisted Gate
  if (trust.isBlacklisted || trust.trustScore < 30) {
    return {
      callerEntityId,
      callerTrustLevel: trust.trustLevel,
      callerTrustScore: trust.trustScore,
      specVersion,
      disclosedCapabilities: [],
      redactedInformation: [
        "All platform specifications",
        "Principles",
        "Internal architecture",
      ],
      generatedResponseText: `❌ Access Revoked: Self-awareness information withheld due to low trust score (${trust.trustScore}/100, Level: ${trust.trustLevel}).`,
      timestamp: new Date().toISOString(),
    };
  }

  // 2. HighTrust / MasterTrainer Disclosure
  if (trust.trustScore >= 80 || state.currentRole === "MasterTrainer") {
    const principlesList = (state.principles || []).map(
      (p) => `"${p.name}": ${p.statement}`,
    );
    const deviceNames = (state.clientDevices || []).map(
      (d) => `${d.deviceName} (${d.deviceType})`,
    );

    const text = `I am ${TOOL_NAME} (v00.03.70) — an intent-matching platform built on the canonical formula NEED = (VERB) + (OBJECT).
I am running as Master Mind [${state.masterMindId || "primary"}].
[Governance]: Full Master Trainer access granted.
[Principles]: ${principlesList.join(" | ")}
[Fleet Devices]: ${deviceNames.length > 0 ? deviceNames.join(", ") : "Desktop CLI"}
[Peer Colmena Nodes]: ${(state.colmenaNodes || []).length} active node(s).`;

    return {
      callerEntityId,
      callerTrustLevel: trust.trustLevel,
      callerTrustScore: trust.trustScore,
      specVersion,
      disclosedCapabilities: [
        "Hierarchical Need Detailing (1.1, 1.2)",
        "Dynamic Catalog Verbs",
        "Interactive Knowledge Provider Engine",
        "Immutable Master Trainer Principles Governance",
        "Anti-Manipulation & Prompt Injection Defense Engine",
        "Millisecond Circuit Breaker",
        "Inter-iNoU Colmena Federation",
        "Multi-Device Client Fleet (Android, iOS, SmartTV, SmartWatch, DesktopCLI)",
      ],
      disclosedPrinciples: principlesList,
      disclosedDevices: deviceNames,
      generatedResponseText: text,
      timestamp: new Date().toISOString(),
    };
  }

  // 3. MediumTrust Disclosure
  if (trust.trustScore >= 50) {
    const text = `I am ${TOOL_NAME} (v00.03.70) — an intent-matching platform that connects Needs and Offers via canonical formulas NEED = (VERB) + (OBJECT).
I support multi-device interactions across Android, iOS, Smart TV, Smart Watch, and Desktop CLI.`;

    return {
      callerEntityId,
      callerTrustLevel: trust.trustLevel,
      callerTrustScore: trust.trustScore,
      specVersion,
      disclosedCapabilities: [
        "Hierarchical Need Detailing",
        "Dynamic Catalog Verbs",
        "Multi-Device Support",
      ],
      redactedInformation: [
        "Master Trainer Principles",
        "Colmena Peer Node Topology",
      ],
      generatedResponseText: text,
      timestamp: new Date().toISOString(),
    };
  }

  // 4. LowTrust Disclosure
  return {
    callerEntityId,
    callerTrustLevel: trust.trustLevel,
    callerTrustScore: trust.trustScore,
    specVersion,
    disclosedCapabilities: ["Basic Intent Matching"],
    redactedInformation: [
      "System specifications",
      "Principles",
      "Internal State",
    ],
    generatedResponseText: `I am ${TOOL_NAME} — an intent matching assistant.`,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Enhanced Self-Awareness Response Generator with LLM / External AI Fallback.
 * 1. Checks local Self-Awareness Engine disclosures (Trust score & governance role).
 * 2. If prompt requires multi-lingual synthesis or dynamic explanation, delegates to Gemini LLM.
 */
export async function generateSelfAwarenessResponseWithLLMFallback(
  callerEntityId: string = "user_local",
  callerEntityType: "User" | "PeerNode" | "MCPServer" | "ExternalAI" = "User",
  queryText: string = "Who are you?",
  rootDir: string = process.cwd(),
): Promise<SelfAwarenessReport> {
  const report = generateSelfAwarenessResponse(
    callerEntityId,
    callerEntityType,
    queryText,
    rootDir,
  );

  // Security gate: Untrusted callers cannot use LLM fallback to leak system internals
  if (report.callerTrustScore < 30) return report;

  writeOutput(
    OutputChannelEnum.DEBUG,
    `[Self-Awareness Report]\n${report.generatedResponseText}`,
    2,
  );

  report.generatedResponseText = `I am ${TOOL_NAME}, an intent-matching assistant that connects needs and offers.`;

  writeOutput(
    OutputChannelEnum.DEBUG,
    "[Self-Awareness Engine] Invoking Gemini LLM for multi-lingual synthesis...",
    2,
  );
  try {
    const aiResult = await processNaturalLanguageIntent(queryText, rootDir);
    if (aiResult?.explanation) {
      report.generatedResponseText = aiResult.explanation;
    }
  } catch {
    // Graceful fallback to static report if LLM unavailable
  }

  return report;
}
