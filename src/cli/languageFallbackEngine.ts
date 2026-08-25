import { getProjectPaths, loadState, saveState } from './context';
import { LanguageResolutionResult } from '../interfaces/LanguageResolutionResult';
import { detectLanguage } from './languageEngine';
import { getStoredApiKey, processNaturalLanguageIntent } from './aiClient';
import { NeedDoubt } from '../interfaces/NeedDoubt';

export async function resolveLanguageAndIntent(
  text: string,
  rootDir: string = process.cwd()
): Promise<LanguageResolutionResult> {
  const lang = detectLanguage(text);
  const paths = getProjectPaths(rootDir);
  const state = loadState(paths.statePath);

  // --- TIER 1: LLM Engine (Gemini AI API) ---
  const hasKey = !!getStoredApiKey(rootDir);
  if (hasKey) {
    try {
      const llmResult = await processNaturalLanguageIntent(text, rootDir);
      if (llmResult && (llmResult.type || llmResult.explanation)) {
        return {
          resolvedLanguage: lang,
          resolutionTier: 'LLM',
          parsedIntent: llmResult,
          confidence: 0.95,
          explanation: `✔ [Tier 1 LLM Engine] Intent resolved via LLM Engine. (${lang.toUpperCase()})`,
        };
      }
    } catch {
      // Fall through to Tier 2 if LLM API call fails
    }
  }

  // --- TIER 2: iNoU Catalog & Behavior Engine (Local Verb Pairing Matcher) ---
  const lower = text.toLowerCase();
  const catalogVerbs = state.customVerbs || [];
  const baselineVerbs = [
    { verb: 'Request', complementaryVerb: 'Donate' },
    { verb: 'Consult', complementaryVerb: 'Advise' },
    { verb: 'Deliver', complementaryVerb: 'Receive' },
    { verb: 'Store', complementaryVerb: 'Retrieve' },
  ];

  const allVerbs = [...baselineVerbs, ...catalogVerbs];
  for (const pairing of allVerbs) {
    if (lower.includes(pairing.verb.toLowerCase())) {
      const words = text.split(/\s+/);
      const verbIdx = words.findIndex((w) => w.toLowerCase() === pairing.verb.toLowerCase());
      const object = verbIdx !== -1 && words[verbIdx + 1] ? words.slice(verbIdx + 1).join(' ') : 'Service/Resource';

      return {
        resolvedLanguage: lang,
        resolutionTier: 'CatalogEngine',
        parsedIntent: {
          type: 'NEED',
          verb: pairing.verb,
          object,
          explanation: `Matched catalog verb "${pairing.verb}"`,
        },
        confidence: 0.8,
        explanation: `✔ [Tier 2 iNoU Catalog Engine] Matched dynamic catalog verb "${pairing.verb}". (${lang.toUpperCase()})`,
      };
    }
  }

  // --- TIER 3: MCP & Ecosystem API Bridge Integration ---
  const mcpServers = state.mcpServers || [];
  const activeMcp = mcpServers.find((m) => m.status === 'Connected');

  if (activeMcp) {
    return {
      resolvedLanguage: lang,
      resolutionTier: 'MCPIntegration',
      parsedIntent: {
        type: 'MCP_TOOL_EXECUTION',
        mcpServerId: activeMcp.id,
        toolName: 'mcp_fallback_tool',
        payload: text,
      },
      confidence: 0.7,
      explanation: `✔ [Tier 3 MCP Integration Engine] Routed prompt to connected MCP Server "${activeMcp.name}". (${lang.toUpperCase()})`,
    };
  }

  // --- TIER 4: Proactive Doubt Engine (NeedDoubt Clarification) ---
  const id = `doubt_fallback_${Date.now()}`;
  const doubtMessage =
    lang === 'es'
      ? `iNoU no logró interpretar con certeza el propósito de "${text}". ¿Desea crear una Necesidad (Request/Consult) o brindar una Oferta (Donate/Advise)?`
      : `iNoU could not parse intent for "${text}". Would you like to create a Need (Request/Consult) or an Offer (Donate/Advise)?`;

  const newDoubt: NeedDoubt = {
    id,
    needId: 'general_intent',
    question: doubtMessage,
  };

  if (!state.doubts) state.doubts = [];
  state.doubts.push(newDoubt);
  saveState(paths.statePath, state);

  return {
    resolvedLanguage: lang,
    resolutionTier: 'ProactiveDoubt',
    parsedIntent: {
      type: 'PROACTIVE_DOUBT',
      doubt: newDoubt,
    },
    confidence: 0.3,
    explanation: `❓ [Tier 4 Proactive Doubt Engine] Raised interactive doubt [${id}] for human clarification. (${lang.toUpperCase()})`,
  };
}
