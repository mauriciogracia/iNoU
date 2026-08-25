import fs from "fs";
import path from "path";
import { executeAiCall } from "./aiClient";
import { registerTrainingPair, registerLearnedSkill } from "./learnEngine";
import { processUserCorrection } from "./learningEngine";
import { writeOutput } from "./outputRouter";
import { OutputChannelEnum } from "../enums/OutputChannelEnum";
import { SkillDefinition } from "../interfaces/SkillDefinition";

export interface ChatLearningResult {
  success: boolean;
  extractedCorrections: number;
  extractedTrainingPairs: number;
  extractedSkills: number;
  message: string;
}

/**
 * Searches for available local transcript and chat history files in the workspace or data directory.
 */
export function findChatHistoryFiles(rootDir: string = process.cwd()): string[] {
  const candidates = [
    path.join(rootDir, "data", "chat_history.json"),
    path.join(rootDir, "data", "transcript.jsonl"),
    path.join(rootDir, ".inuo-history.json"),
    path.join(rootDir, "chat_history.json"),
  ];

  const found = candidates.filter((c) => fs.existsSync(c));

  // Check subdirectories in data/
  const dataDir = path.join(rootDir, "data");
  if (fs.existsSync(dataDir)) {
    const files = fs.readdirSync(dataDir);
    for (const f of files) {
      if (f.endsWith(".jsonl") || f.endsWith("_history.json") || f.endsWith("_chat.txt")) {
        const full = path.join(dataDir, f);
        if (!found.includes(full)) found.push(full);
      }
    }
  }

  return found;
}

/**
 * Parses raw chat transcript content (JSONL, JSON, or Plaintext) into a normalized transcript text.
 */
export function parseRawTranscriptContent(raw: string): string {
  const lines = raw.split("\n");
  const extractedMessages: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Try parsing as JSON / JSONL step
    try {
      const obj = JSON.parse(trimmed);
      if (obj.content) {
        const role = obj.type === "USER_INPUT" || obj.source === "USER_EXPLICIT" ? "User" : "Assistant";
        extractedMessages.push(`[${role}]: ${obj.content}`);
      } else if (obj.role && obj.text) {
        extractedMessages.push(`[${obj.role}]: ${obj.text}`);
      } else if (obj.prompt) {
        extractedMessages.push(`[User Prompt]: ${obj.prompt}`);
      }
    } catch {
      // Plain text line
      extractedMessages.push(trimmed);
    }
  }

  return extractedMessages.length > 0 ? extractedMessages.join("\n") : raw;
}

/**
 * Analyzes conversation history using the AI Architect, extracts preferences, corrections,
 * training pairs, and newly identified skills, and commits them to the knowledge vaults.
 */
export async function extractKnowledgeFromChatHistory(
  transcriptText: string,
  rootDir: string = process.cwd(),
): Promise<ChatLearningResult> {
  const cleanTranscript = transcriptText.trim();
  if (!cleanTranscript) {
    return {
      success: false,
      extractedCorrections: 0,
      extractedTrainingPairs: 0,
      extractedSkills: 0,
      message: "❌ Transcript is empty. Nothing to learn from.",
    };
  }

  writeOutput(
    OutputChannelEnum.USER_REPLY,
    `\x1b[36m=== iNoU Chat History & Transcript Learning Engine ===\x1b[0m\n⏳ Analyzing conversation history for user preferences, corrections, and training pairs...`,
  );

  const prompt = `You are the iNoU Knowledge Distillation & Transcript Learning Architect.
Analyze the following conversation transcript between the User and iNoU / Assistant.

Identify:
1. "corrections": Any rules, preferences, formatting directives, or corrections given by the user (e.g. "don't waste tokens", "use succinct mode", "respond in Spanish", "format as list").
2. "trainingPairs": Clear intent examples with verified (User Prompt -> Need/Offer/Query).
3. "newSkills": Any new API integration goals or skills discussed in the chat.

TRANSCRIPT:
${cleanTranscript.slice(0, 15000)}

Respond ONLY with a valid JSON object matching this schema:
{
  "corrections": [
    { "topic": "TokenGovernance", "ruleText": "Always prioritize free tier before asking for paid model consent" }
  ],
  "trainingPairs": [
    {
      "prompt": "User query in transcript",
      "expectedNeed": { "verb": "Verb", "object": "Object" },
      "category": "intent_parsing"
    }
  ],
  "newSkills": [
    {
      "name": "DiscoveredSkillName",
      "category": "api_integration",
      "description": "Skill description",
      "atomicFormula": "NEED = (Verb) + (Object)"
    }
  ]
}`;

  let plan: any;
  try {
    const aiResponse = await executeAiCall(prompt, rootDir);
    const cleanJson = aiResponse
      .replace(/```json/gi, "")
      .replace(/```/gi, "")
      .trim();
    plan = JSON.parse(cleanJson);
  } catch (err: any) {
    writeOutput(
      OutputChannelEnum.USER_REPLY,
      `\x1b[31m❌ Failed to parse chat knowledge: ${err.message}\x1b[0m`,
    );
    return {
      success: false,
      extractedCorrections: 0,
      extractedTrainingPairs: 0,
      extractedSkills: 0,
      message: `Failed to extract knowledge: ${err.message}`,
    };
  }

  let correctionsCount = 0;
  let pairsCount = 0;
  let skillsCount = 0;

  // 1. Process Corrections
  if (Array.isArray(plan.corrections)) {
    for (const c of plan.corrections) {
      if (c.topic && c.ruleText) {
        processUserCorrection(c.topic, c.ruleText, rootDir);
        correctionsCount++;
      }
    }
  }

  // 2. Register Curated Training Pairs
  if (Array.isArray(plan.trainingPairs)) {
    for (const tp of plan.trainingPairs) {
      if (tp.prompt) {
        registerTrainingPair(
          {
            prompt: tp.prompt,
            category: tp.category || "chat_history_distillation",
            expectedNeed: tp.expectedNeed || null,
            expectedOffer: tp.expectedOffer || null,
          },
          rootDir,
        );
        pairsCount++;
      }
    }
  }

  // 3. Register New Skills
  if (Array.isArray(plan.newSkills)) {
    for (const sk of plan.newSkills) {
      if (sk.name && sk.atomicFormula) {
        const def: SkillDefinition = {
          id: `skill_chat_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          name: sk.name,
          category: sk.category || "workflow",
          description: sk.description || "Learned from chat transcript",
          atomicFormula: sk.atomicFormula,
          learnedAt: new Date().toISOString(),
          version: "00.03.70",
        };
        registerLearnedSkill(def, rootDir);
        skillsCount++;
      }
    }
  }

  const successMsg = [
    `✔ Successfully learned and distilled knowledge from chat history!`,
    `• Learned User Corrections / Preferences: +${correctionsCount}`,
    `• Ingested Few-Shot Training Pairs: +${pairsCount}`,
    `• Registered New Skills & Formulas: +${skillsCount}`,
    `• Updated Dataset: [data/training_dataset.json](file:///d:/repos/iNoU/data/training_dataset.json)`,
  ].join("\n");

  writeOutput(OutputChannelEnum.USER_REPLY, `\x1b[32m${successMsg}\x1b[0m`);

  return {
    success: true,
    extractedCorrections: correctionsCount,
    extractedTrainingPairs: pairsCount,
    extractedSkills: skillsCount,
    message: successMsg,
  };
}

/**
 * Command entry point to learn from all chat history or specific file.
 */
export async function learnFromChatHistory(
  options: { sourcePath?: string; all?: boolean } = {},
  rootDir: string = process.cwd(),
): Promise<ChatLearningResult> {
  let transcriptText = "";

  if (options.sourcePath) {
    const full = path.isAbsolute(options.sourcePath)
      ? options.sourcePath
      : path.join(rootDir, options.sourcePath);
    if (!fs.existsSync(full)) {
      writeOutput(
        OutputChannelEnum.USER_REPLY,
        `❌ Specified chat history file not found: ${options.sourcePath}`,
      );
      return {
        success: false,
        extractedCorrections: 0,
        extractedTrainingPairs: 0,
        extractedSkills: 0,
        message: "File not found",
      };
    }
    const raw = fs.readFileSync(full, "utf8");
    transcriptText = parseRawTranscriptContent(raw);
  } else {
    const files = findChatHistoryFiles(rootDir);
    if (files.length === 0) {
      // Fallback: Check for existing corrections & state to generate synthetic baseline
      transcriptText = "User: Always prioritize free tier before asking for paid model consent\nAssistant: Understood. Free models waterfall active.\nUser: Technical errors need to have a natural language representation\nAssistant: Configured errorEngine localization.";
    } else {
      const contents = files.map((f) => parseRawTranscriptContent(fs.readFileSync(f, "utf8")));
      transcriptText = contents.join("\n\n---\n\n");
    }
  }

  return await extractKnowledgeFromChatHistory(transcriptText, rootDir);
}
