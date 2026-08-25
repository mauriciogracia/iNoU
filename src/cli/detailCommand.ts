import { getProjectPaths, loadState, saveState, StateData } from './context';
import { Need } from '../interfaces/Need';
import { NeedDoubt } from '../interfaces/NeedDoubt';
import { findNeedByIdOrCode, computeHierarchicalIds, updateParentNeedStates } from './needCommand';
import { getComplementForVerb } from './catalogCommand';
import { GoogleGenAI } from '@google/genai';
import { loadEnvironment } from './environment';

export async function runDetailCommand(args: string[], rootDir: string = process.cwd()): Promise<void> {
  const query = args[0];
  const paths = getProjectPaths(rootDir);
  const state = loadState(paths.statePath);

  computeHierarchicalIds(state.needs);
  updateParentNeedStates(state.needs);

  if (!query) {
    console.log('\x1b[33m%s\x1b[0m', 'Usage: detail <need_id_or_code> [optional: "decompose" or natural language guidance]');
    console.log('Example: detail 1');
    console.log('Example: detail 1 decompose');
    return;
  }

  const targetNeed = findNeedByIdOrCode(query, state);
  if (!targetNeed) {
    console.log('\x1b[31m%s\x1b[0m', `Need "${query}" not found.`);
    return;
  }

  const action = args[1]?.toLowerCase();

  if (action === 'decompose' || action === 'plan' || args.length > 1) {
    const extraGuidance = args.slice(1).join(' ');
    await decomposeNeedWithAI(targetNeed, extraGuidance, state, rootDir);
    saveState(paths.statePath, state);
    return;
  }

  // Display details of targetNeed
  displayNeedTreeAndDetails(targetNeed, state);
}

export function displayNeedTreeAndDetails(targetNeed: Need, state: StateData): void {
  console.log('\x1b[36m%s\x1b[0m', `=== Need Details [Code: ${targetNeed.hierarchicalId || 'N/A'}] ===`);
  console.log(`\x1b[1mID:\x1b[0m ${targetNeed.id}`);
  console.log(`\x1b[1mCanonical Formula:\x1b[0m NEED = (${targetNeed.verb}) + (${targetNeed.object})`);
  console.log(`\x1b[1mComplement Offer Verb:\x1b[0m ${targetNeed.complementVerb}`);
  console.log(`\x1b[1mStatus:\x1b[0m ${targetNeed.status} | \x1b[1mModel:\x1b[0m ${targetNeed.modelType} | \x1b[1mType:\x1b[0m ${targetNeed.isAtomic ? 'Atomic' : 'Macro'}`);

  if (targetNeed.details) {
    console.log(`\x1b[1mDetailed Spec:\x1b[0m\n  ${targetNeed.details}`);
  }

  // Show Knowledge Provider Notes
  if (targetNeed.knowledgeNotes && targetNeed.knowledgeNotes.length > 0) {
    console.log('\n\x1b[32m%s\x1b[0m', '=== User Knowledge Provider Notes ===');
    targetNeed.knowledgeNotes.forEach((note, i) => {
      console.log(`  [Note ${i + 1}] ${note}`);
    });
  }

  // Show Pending Doubts
  const doubts = (state.doubts || []).filter((d) => d.needId === targetNeed.id && !d.answer);
  if (doubts.length > 0 || (targetNeed.doubts && targetNeed.doubts.length > 0)) {
    console.log('\n\x1b[33m%s\x1b[0m', '=== Pending Clarification Doubts (iNoU asks user) ===');
    doubts.forEach((d) => {
      console.log(`  [Doubt ID: ${d.id}] ${d.question}`);
    });
    if (targetNeed.doubts) {
      targetNeed.doubts.forEach((q, i) => console.log(`  [Question ${i + 1}] ${q}`));
    }
    console.log('\x1b[36m%s\x1b[0m', 'To answer a doubt and become Knowledge Provider, type: answer <doubtId_or_code> <your_details>');
  }

  // Show Sub-Needs Hierarchy
  const children = state.needs.filter((n) => n.parentNeedId === targetNeed.id);
  console.log('\n\x1b[36m%s\x1b[0m', '=== Hierarchical Sub-Needs Breakdown ===');
  if (children.length === 0) {
    console.log('  No sub-needs yet. Type "detail ' + (targetNeed.hierarchicalId || targetNeed.id) + ' decompose" to recursively plan sub-steps.');
  } else {
    children.forEach((c) => {
      console.log(
        `  [${c.hierarchicalId || c.id}] NEED = (${c.verb}) + (${c.object}) | Status: ${c.status} | Type: ${c.isAtomic ? 'Atomic' : 'Macro'}`
      );
    });
  }
}

export async function decomposeNeedWithAI(
  parentNeed: Need,
  guidance: string,
  state: StateData,
  rootDir: string = process.cwd()
): Promise<void> {
  const env = loadEnvironment(rootDir);
  if (!env.geminiApiKey) {
    console.log('\x1b[33m%s\x1b[0m', '[iNoU Detailing] Google Gemini API Key required for recursive breakdown.');
    console.log('Connect your key by typing: key <YOUR_GEMINI_API_KEY>');
    return;
  }

  console.log('\x1b[36m%s\x1b[0m', `[Gemini AI Architect] Decomposing Need [${parentNeed.hierarchicalId || parentNeed.id}] (${parentNeed.verb} ${parentNeed.object})...`);

  try {
    const ai = new GoogleGenAI({ apiKey: env.geminiApiKey });
    const prompt = `You are the iNoU Recursive Detailing & Planning Engine.
Parent Need: NEED = (${parentNeed.verb}) + (${parentNeed.object})
Parent Details/Context: ${parentNeed.details || 'None'}
Additional User Guidance: "${guidance}"

Your task:
1. Break down this Need into 2 to 4 concrete sub-needs. Each sub-need MUST be formulated as NEED = (VERB) + (OBJECT).
2. Identify 1 to 2 doubts or missing details where iNoU needs user clarification to execute the project accurately.

Return ONLY a raw JSON object with NO markdown formatting matching this structure:
{
  "summary": "High-level summary of the breakdown",
  "subNeeds": [
    {
      "verb": "Consult|Request|Search|Buy|Deliver|etc",
      "object": "Sub task description",
      "isAtomic": true|false,
      "details": "Optional detailed specs"
    }
  ],
  "doubts": [
    "Question asking user for key detail (e.g., location, budget, specifications)"
  ]
}`;

    const response = await ai.models.generateContent({
      model: env.defaultModel,
      contents: prompt,
    });

    const text = response.text?.trim() || '';
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(cleanJson);

    parentNeed.isAtomic = false;
    parentNeed.status = 'Blocked';

    if (Array.isArray(result.subNeeds)) {
      for (const item of result.subNeeds) {
        const subNeed: Need = {
          id: `need_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          verb: item.verb || 'Request',
          object: item.object || 'Sub task',
          complementVerb: getComplementForVerb(item.verb || 'Request', rootDir),
          modelType: parentNeed.modelType,
          status: 'Open',
          isAtomic: item.isAtomic !== undefined ? item.isAtomic : true,
          parentNeedId: parentNeed.id,
          prerequisiteNeedIds: [],
          details: item.details,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        state.needs.push(subNeed);
      }
    }

    if (Array.isArray(result.doubts)) {
      if (!state.doubts) state.doubts = [];
      if (!parentNeed.doubts) parentNeed.doubts = [];

      for (const q of result.doubts) {
        const doubt: NeedDoubt = {
          id: `doubt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          needId: parentNeed.id,
          question: q,
        };
        state.doubts.push(doubt);
        parentNeed.doubts.push(q);
      }
    }

    computeHierarchicalIds(state.needs);
    updateParentNeedStates(state.needs);

    console.log(`\x1b[32m✔ Successfully decomposed Need [${parentNeed.hierarchicalId || parentNeed.id}]:\x1b[0m ${result.summary || ''}`);
    displayNeedTreeAndDetails(parentNeed, state);
  } catch (err: any) {
    console.log('\x1b[31m%s\x1b[0m', `[Detailing Error] ${err.message}`);
  }
}

export function runAnswerCommand(args: string[], rootDir: string = process.cwd()): void {
  const paths = getProjectPaths(rootDir);
  const state = loadState(paths.statePath);

  computeHierarchicalIds(state.needs);

  const query = args[0];
  const answerText = args.slice(1).join(' ');

  if (!query || !answerText) {
    console.log('\x1b[33m%s\x1b[0m', 'Usage: answer <need_id_or_code_or_doubt_id> <your_detail_answer>');
    return;
  }

  // Check if query matches a doubtId
  let doubt = state.doubts?.find((d) => d.id === query);
  let targetNeed: Need | undefined;

  if (doubt) {
    targetNeed = state.needs.find((n) => n.id === doubt!.needId);
  } else {
    targetNeed = findNeedByIdOrCode(query, state);
    if (targetNeed && state.doubts) {
      doubt = state.doubts.find((d) => d.needId === targetNeed!.id && !d.answer);
    }
  }

  if (!targetNeed) {
    console.log('\x1b[31m%s\x1b[0m', `Target Need or Doubt "${query}" not found.`);
    return;
  }

  if (doubt) {
    doubt.answer = answerText;
    doubt.answeredAt = new Date().toISOString();
  }

  if (!targetNeed.knowledgeNotes) targetNeed.knowledgeNotes = [];
  targetNeed.knowledgeNotes.push(answerText);

  // Remove answered doubt from parentNeed.doubts array if present
  if (targetNeed.doubts) {
    if (doubt) {
      targetNeed.doubts = targetNeed.doubts.filter((q) => q !== doubt!.question);
    } else {
      targetNeed.doubts.shift();
    }
  }

  saveState(paths.statePath, state);

  console.log('\x1b[32m%s\x1b[0m', `✔ User Knowledge Provider input recorded for Need [${targetNeed.hierarchicalId || targetNeed.id}]!`);
  console.log(`\x1b[1mKnowledge Note:\x1b[0m "${answerText}"`);
}
