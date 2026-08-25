import fs from "fs";
import path from "path";
import { executeAiCall } from "./aiClient";
import { getProjectPaths, loadState, saveState } from "./context";
import { calculateInuoVersion, recalculateAndSyncVersion } from "./versionEngine";
import { runTest } from "./testCommand";
import { SkillDefinition } from "../interfaces/SkillDefinition";
import { TrainingPair } from "../interfaces/TrainingPair";
import { EvolutionSnapshot } from "../interfaces/EvolutionSnapshot";
import { writeOutput } from "./outputRouter";
import { OutputChannelEnum } from "../enums/OutputChannelEnum";

const CRITICAL_SNAPSHOT_FILES = [
  "package.json",
  "inuo-manifest.json",
  "INUO_SPEC.md",
  "src/interfaces/index.ts",
  "src/types/index.ts",
  "src/enums/index.ts",
  "data/training_dataset.json",
];

/**
 * Creates an atomic snapshot of critical project files prior to evolution/learning.
 */
export function createSnapshot(rootDir: string = process.cwd()): EvolutionSnapshot {
  const inuoVer = calculateInuoVersion(rootDir);
  const filesBackup: Array<{ relativePath: string; content: string | null }> = [];

  for (const rel of CRITICAL_SNAPSHOT_FILES) {
    const full = path.join(rootDir, rel);
    if (fs.existsSync(full)) {
      filesBackup.push({ relativePath: rel, content: fs.readFileSync(full, "utf8") });
    } else {
      filesBackup.push({ relativePath: rel, content: null });
    }
  }

  return {
    timestamp: new Date().toISOString(),
    preVersion: inuoVer.fullVersionString,
    filesBackup,
    createdFiles: [],
  };
}

/**
 * Atomically rolls back codebase and created files to the pre-evolution snapshot.
 */
export function rollbackSnapshot(
  snapshot: EvolutionSnapshot,
  rootDir: string = process.cwd(),
): void {
  // 1. Delete all newly created files
  for (const created of snapshot.createdFiles) {
    const full = path.isAbsolute(created) ? created : path.join(rootDir, created);
    if (fs.existsSync(full)) {
      try {
        fs.unlinkSync(full);
      } catch {
        // ignore
      }
    }
  }

  // 2. Restore all pre-existing files
  for (const item of snapshot.filesBackup) {
    const full = path.join(rootDir, item.relativePath);
    if (item.content !== null) {
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, item.content, "utf8");
    } else if (fs.existsSync(full)) {
      try {
        fs.unlinkSync(full);
      } catch {
        // ignore
      }
    }
  }
}

/**
 * Retrieves the curated training dataset from data/training_dataset.json.
 */
export function getTrainingDataset(rootDir: string = process.cwd()): TrainingPair[] {
  const file = path.join(rootDir, "data", "training_dataset.json");
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return [];
  }
}

/**
 * Appends a new verified training pair to data/training_dataset.json.
 */
export function registerTrainingPair(
  pairInput: Partial<TrainingPair>,
  rootDir: string = process.cwd(),
): TrainingPair {
  const dataset = getTrainingDataset(rootDir);
  const pair: TrainingPair = {
    id: pairInput.id || `train_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    category: pairInput.category || "skill_learning",
    prompt: pairInput.prompt || "",
    expectedNeed: pairInput.expectedNeed || null,
    expectedOffer: pairInput.expectedOffer || null,
    skillRecipe: pairInput.skillRecipe || null,
    createdAt: new Date().toISOString(),
  };

  dataset.push(pair);
  const file = path.join(rootDir, "data", "training_dataset.json");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(dataset, null, 2), "utf8");
  return pair;
}

/**
 * Saves a learned skill definition into iNoU state and skills repository.
 */
export function registerLearnedSkill(
  skill: SkillDefinition,
  rootDir: string = process.cwd(),
): void {
  const paths = getProjectPaths(rootDir);
  const state = loadState(paths.statePath);
  if (!state.skills) state.skills = [];

  // Check if skill exists
  const existingIdx = state.skills.findIndex((s: any) => s.name === skill.name || s.id === skill.id);
  if (existingIdx >= 0) {
    state.skills[existingIdx] = skill as any;
  } else {
    state.skills.push(skill as any);
  }
  saveState(paths.statePath, state);

  // Write markdown skill documentation in skills/ or .agents/skills/
  const skillDirName = skill.name.toLowerCase().replace(/[^a-z0-9_]/g, "_");
  const skillFile = path.join(rootDir, "skills", skillDirName, "SKILL.md");
  fs.mkdirSync(path.dirname(skillFile), { recursive: true });
  const md = [
    `# Skill: ${skill.name}`,
    `Category: ${skill.category}`,
    `Learned: ${skill.learnedAt} (Version: ${skill.version})`,
    `Formula: \`${skill.atomicFormula}\``,
    "",
    "## Description",
    skill.description,
    "",
    "## Environment Variables",
    (skill.requiredEnvVars || []).map((v) => `- \`${v}\``).join("\n") || "None required.",
    "",
    "## Sample Payload",
    "```json",
    JSON.stringify(skill.samplePayload || {}, null, 2),
    "```",
  ].join("\n");
  fs.writeFileSync(skillFile, md, "utf8");
}

export interface LearnResult {
  success: boolean;
  skill?: SkillDefinition;
  trainingPair?: TrainingPair;
  newVersion?: string;
  message: string;
  attachmentSource?: string;
  rolledBack?: boolean;
}

export interface LearnOptions {
  attachmentPath?: string;
  rawAttachmentContent?: string;
}

/**
 * Loads and prepares attachment content from file path (MD, JSON, Swagger/OpenAPI, YAML).
 */
export function loadAttachment(
  attachmentPath: string,
  rootDir: string = process.cwd(),
): { filename: string; content: string; isSwagger: boolean } | null {
  const fullPath = path.isAbsolute(attachmentPath)
    ? attachmentPath
    : path.join(rootDir, attachmentPath);

  if (!fs.existsSync(fullPath)) {
    return null;
  }

  const filename = path.basename(fullPath);
  const rawContent = fs.readFileSync(fullPath, "utf8");
  const isSwagger =
    /("swagger"|"openapi"|swagger:|openapi:|paths:)/i.test(rawContent) ||
    filename.includes("swagger") ||
    filename.includes("openapi");

  return {
    filename,
    content: rawContent,
    isSwagger,
  };
}

/**
 * Learns a new skill or integration from a natural language goal and optional attachment (Swagger/OpenAPI/MD),
 * synthesizes atomic formulas, creates DEV_RULES single-definition files, runs full test verification,
 * and either advances the version or executes an atomic rollback.
 */
export async function learnSkill(
  goalText: string,
  options?: LearnOptions,
  rootDir: string = process.cwd(),
): Promise<LearnResult> {
  const cleanGoal = goalText.trim();
  let attachmentInfo: { filename: string; content: string; isSwagger: boolean } | null = null;

  if (options?.attachmentPath) {
    attachmentInfo = loadAttachment(options.attachmentPath, rootDir);
    if (!attachmentInfo) {
      return {
        success: false,
        message: `❌ Attachment file not found: ${options.attachmentPath}`,
      };
    }
  } else if (options?.rawAttachmentContent) {
    attachmentInfo = {
      filename: "attached_content.json",
      content: options.rawAttachmentContent,
      isSwagger: /("swagger"|"openapi"|swagger:|openapi:|paths:)/i.test(options.rawAttachmentContent),
    };
  }

  if (!cleanGoal && !attachmentInfo) {
    return {
      success: false,
      message: "❌ Learning goal or attachment file must be provided.",
    };
  }

  const effectiveGoal = cleanGoal || (attachmentInfo ? `Integrate API from ${attachmentInfo.filename}` : "General API Integration");

  writeOutput(
    OutputChannelEnum.USER_REPLY,
    `\x1b[36m=== iNoU Self-Evolution & Skill Learning Lifecycle ===\x1b[0m\n🎯 Learning Goal: "${effectiveGoal}"${attachmentInfo ? `\n📎 Attached Source: ${attachmentInfo.filename} (${attachmentInfo.isSwagger ? "OpenAPI / Swagger Spec" : "Documentation"})` : ""}`,
  );

  // 1. Capture Pre-Evolution Snapshot
  writeOutput(
    OutputChannelEnum.USER_REPLY,
    `\x1b[36m[1/5] Capturing Pre-Evolution Snapshot...\x1b[0m`,
  );
  const snapshot = createSnapshot(rootDir);

  // 2. Synthesize with Cost-Governed AI Client
  writeOutput(
    OutputChannelEnum.USER_REPLY,
    `\x1b[36m[2/5] Synthesizing Skill & API Architecture (via Cost-Governed AI Waterfall)...\x1b[0m`,
  );

  const attachmentSnippet = attachmentInfo
    ? `\n--- ATTACHED ${attachmentInfo.isSwagger ? "SWAGGER / OPENAPI SPEC" : "DOCUMENTATION FILE"} (${attachmentInfo.filename}) ---\n${attachmentInfo.content.slice(0, 15000)}\n--- END OF ATTACHMENT ---\n`
    : "";

  const architectPrompt = `You are the iNoU Autonomous Skill & Integration Architect.
The user wants iNoU to learn the following skill or API integration: "${effectiveGoal}"
${attachmentSnippet}
Follow dev-rules.md strictly:
1. Formulate the canonical Atomic Need formula: NEED = (VERB) + (OBJECT).
2. Extract required endpoints, methods, and environment variables (e.g. LINKEDIN_ACCESS_TOKEN, API_KEY).
3. If new data structures or request payloads are needed, provide clean TypeScript interfaces adhering to single-definition rules (src/interfaces/...).

Respond ONLY with a valid JSON object matching this schema:
{
  "skillName": "LinkedInPostingSkill",
  "category": "api_integration",
  "description": "Publishes articles and status updates to LinkedIn via the REST Share API v2.",
  "atomicFormula": "NEED = (Post) + (LinkedInStatus)",
  "verb": "Post",
  "object": "LinkedInStatus",
  "requiredEnvVars": ["LINKEDIN_ACCESS_TOKEN"],
  "samplePayload": {
    "author": "urn:li:person:YOUR_URN",
    "lifecycleState": "PUBLISHED",
    "specificContent": {
      "com.linkedin.ugc.ShareContent": {
        "shareCommentary": { "text": "Hello world from iNoU!" },
        "shareMediaCategory": "NONE"
      }
    }
  },
  "newInterfaces": [
    {
      "filename": "LinkedInSharePayload.ts",
      "content": "export interface LinkedInSharePayload {\\n  author: string;\\n  text: string;\\n  visibility?: 'PUBLIC' | 'CONNECTIONS';\\n}"
    }
  ]
}`;

  let plan: any;
  try {
    const aiResponse = await executeAiCall(architectPrompt, rootDir);
    const cleanJson = aiResponse
      .replace(/```json/gi, "")
      .replace(/```/gi, "")
      .trim();
    plan = JSON.parse(cleanJson);
  } catch (err: any) {
    writeOutput(
      OutputChannelEnum.USER_REPLY,
      `\x1b[31m❌ AI Architect Synthesis Failed: ${err.message}\x1b[0m`,
    );
    return {
      success: false,
      message: `Failed to synthesize skill: ${err.message}`,
    };
  }

  // 3. Write synthesized interfaces adhering to dev-rules.md
  writeOutput(
    OutputChannelEnum.USER_REPLY,
    `\x1b[36m[3/5] Generating Types & Single-Definition Interface Files...\x1b[0m`,
  );

  if (Array.isArray(plan.newInterfaces)) {
    for (const iface of plan.newInterfaces) {
      const targetFile = path.join(rootDir, "src", "interfaces", iface.filename);
      fs.writeFileSync(targetFile, iface.content, "utf8");
      snapshot.createdFiles.push(targetFile);

      // Add to barrel export
      const indexPath = path.join(rootDir, "src", "interfaces", "index.ts");
      const exportName = iface.filename.replace(".ts", "");
      const indexContent = fs.readFileSync(indexPath, "utf8");
      if (!indexContent.includes(`./${exportName}`)) {
        fs.appendFileSync(indexPath, `export * from "./${exportName}";\n`, "utf8");
      }
      writeOutput(
        OutputChannelEnum.USER_REPLY,
        `✔ Created Interface: [src/interfaces/${iface.filename}](file:///d:/repos/iNoU/src/interfaces/${iface.filename})`,
      );
    }
  }

  // 4. Register Curated Training Pair
  const trainingPair = registerTrainingPair(
    {
      category: attachmentInfo?.isSwagger ? "swagger_api_integration" : "skill_learning",
      prompt: effectiveGoal,
      expectedNeed: {
        verb: plan.verb || "Post",
        object: plan.object || "LinkedInStatus",
      },
      skillRecipe: {
        skillName: plan.skillName,
        atomicFormula: plan.atomicFormula,
        samplePayload: plan.samplePayload,
        sourceAttachment: attachmentInfo?.filename,
      },
    },
    rootDir,
  );

  // 5. Automated Verification & Rollback Protection
  writeOutput(
    OutputChannelEnum.USER_REPLY,
    `\x1b[36m[4/5] Running Automated Verification Pipeline (build & test suites)...\x1b[0m`,
  );

  try {
    runTest(undefined, rootDir);
  } catch (testErr: any) {
    writeOutput(
      OutputChannelEnum.USER_REPLY,
      `\x1b[31m[Verification Failed] ${testErr.message}. Executing Atomic Rollback...\x1b[0m`,
    );
    rollbackSnapshot(snapshot, rootDir);
    writeOutput(
      OutputChannelEnum.USER_REPLY,
      `\x1b[33m✔ Atomic Rollback Complete. Codebase restored cleanly to pre-evolution state.\x1b[0m`,
    );
    return {
      success: false,
      message: `Verification failed (${testErr.message}). Atomic rollback performed.`,
      rolledBack: true,
    };
  }

  // 6. Finalize Skill & Bump Canonical Version
  writeOutput(
    OutputChannelEnum.USER_REPLY,
    `\x1b[36m[5/5] Finalizing Learned Skill & Advancing Canonical Version...\x1b[0m`,
  );

  const currentVer = calculateInuoVersion(rootDir);
  const skillDef: SkillDefinition = {
    id: `skill_${Date.now()}`,
    name: plan.skillName || "LearnedSkill",
    category: plan.category || "api_integration",
    description: plan.description || effectiveGoal,
    atomicFormula: plan.atomicFormula || `NEED = (${plan.verb || "Execute"}) + (${plan.object || "Task"})`,
    requiredEnvVars: plan.requiredEnvVars || [],
    samplePayload: plan.samplePayload || {},
    learnedAt: new Date().toISOString(),
    version: currentVer.fullVersionString,
  };

  registerLearnedSkill(skillDef, rootDir);
  recalculateAndSyncVersion(rootDir);
  const updatedVer = calculateInuoVersion(rootDir);

  const successMsg = [
    `★ Skill Learned & Integrated Successfully!`,
    `• Skill Name: ${skillDef.name} (${skillDef.category})`,
    `• Formula: ${skillDef.atomicFormula}`,
    `• Required Env: ${(skillDef.requiredEnvVars || []).join(", ") || "None"}`,
    attachmentInfo ? `• Ingested Attachment: ${attachmentInfo.filename}` : "",
    `• Training Pair ID: ${trainingPair.id}`,
    `• System Version Advanced: v${updatedVer.fullVersionString}`,
  ].filter(Boolean).join("\n");

  writeOutput(OutputChannelEnum.USER_REPLY, `\x1b[32m${successMsg}\x1b[0m`);

  return {
    success: true,
    skill: skillDef,
    trainingPair,
    attachmentSource: attachmentInfo?.filename,
    newVersion: updatedVer.fullVersionString,
    message: successMsg,
  };
}
