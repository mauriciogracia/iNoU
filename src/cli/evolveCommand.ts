import fs from "fs";
import path from "path";
import { executeAiCall } from "./aiClient";
import { runNeedCommand } from "./needCommand";
import { runTest } from "./testCommand";
import { loadManifest } from "./context";
import { createSnapshot, rollbackSnapshot } from "./learnEngine";
import { calculateInuoVersion, recalculateAndSyncVersion } from "./versionEngine";
import { writeOutput } from "./outputRouter";
import { OutputChannelEnum } from "../enums/OutputChannelEnum";

export async function runEvolveCommand(
  goalInput: string,
  rootDir: string = process.cwd(),
): Promise<void> {
  const cleanGoal = (goalInput || "").trim();
  if (!cleanGoal) {
    writeOutput(
      OutputChannelEnum.USER_REPLY,
      "Usage: evolve <feature or capability goal>\nExample: evolve add support for OAuth2 authentication in auth command",
    );
    return;
  }

  writeOutput(
    OutputChannelEnum.USER_REPLY,
    `\x1b[36m=== iNoU-on-iNoU Self-Orchestrating Dev Lifecycle ===\x1b[0m\n\x1b[1mPO Intent (The Need):\x1b[0m "${cleanGoal}"\n`,
  );

  const manifestPath = path.join(rootDir, "inuo-manifest.json");
  const mainSpec = path.join(rootDir, "main-specs-goals.md");
  const fallbackSpec = path.join(rootDir, "INUO_SPEC.md");
  const specPath = fs.existsSync(mainSpec) ? mainSpec : fallbackSpec;

  // 1. Transaction Snapshot
  const snapshot = createSnapshot(rootDir);

  try {
    const prompt = `You are the iNoU-on-iNoU Self-Orchestration Architect.
The Product Owner has given the following feature goal: "${cleanGoal}"

Your task is to evolve the iNoU codebase AND specification following dev-rules.md:
1. Decompose the goal into Atomic Needs: NEED = (VERB) + (OBJECT).
2. Every type, enum, and interface MUST be in its own single-definition file under src/interfaces/, src/types/, or src/enums/.
3. Write a markdown specification snippet describing this new feature to be appended to main-specs-goals.md.

Return ONLY a raw JSON object with NO markdown formatting matching this structure:
{
  "summary": "High-level evolution description",
  "specSnippet": "### Feature Specification Title\\nMarkdown documentation of new spec...",
  "atomicNeeds": [
    { "verb": "VerbName", "object": "ObjectName" }
  ],
  "newInterfaces": [
    {
      "filename": "InterfaceName.ts",
      "content": "export interface InterfaceName {\\n  id: string;\\n}"
    }
  ],
  "newTypes": [
    {
      "filename": "TypeName.ts",
      "content": "export type TypeName = string;"
    }
  ]
}`;

    writeOutput(
      OutputChannelEnum.USER_REPLY,
      `\x1b[36m[Semantic Decomposition] LLM Architect synthesizing codebase expansion...\x1b[0m`,
    );

    const responseText = await executeAiCall(prompt, rootDir);
    const cleanJson = responseText
      .replace(/```json/gi, "")
      .replace(/```/gi, "")
      .trim();
    const plan = JSON.parse(cleanJson);

    writeOutput(
      OutputChannelEnum.USER_REPLY,
      `\x1b[32m✔ Evolution Plan Generated:\x1b[0m ${plan.summary}\n`,
    );

    if (Array.isArray(plan.atomicNeeds)) {
      for (const n of plan.atomicNeeds) {
        runNeedCommand(
          ["create", "--verb", n.verb || "Evolve", "--object", n.object || cleanGoal],
          rootDir,
        );
      }
    }

    if (Array.isArray(plan.newInterfaces)) {
      for (const item of plan.newInterfaces) {
        const filePath = path.join(rootDir, "src", "interfaces", item.filename);
        fs.writeFileSync(filePath, item.content, "utf8");
        snapshot.createdFiles.push(filePath);

        const indexPath = path.join(rootDir, "src", "interfaces", "index.ts");
        const exportName = item.filename.replace(".ts", "");
        const indexContent = fs.readFileSync(indexPath, "utf8");
        if (!indexContent.includes(`./${exportName}`)) {
          fs.appendFileSync(
            indexPath,
            `export * from "./${exportName}";\n`,
            "utf8",
          );
        }
        writeOutput(
          OutputChannelEnum.USER_REPLY,
          `✔ Generated Interface: [src/interfaces/${item.filename}](file:///d:/repos/iNoU/src/interfaces/${item.filename})`,
        );
      }
    }

    if (Array.isArray(plan.newTypes)) {
      for (const item of plan.newTypes) {
        const filePath = path.join(rootDir, "src", "types", item.filename);
        fs.writeFileSync(filePath, item.content, "utf8");
        snapshot.createdFiles.push(filePath);

        const indexPath = path.join(rootDir, "src", "types", "index.ts");
        const exportName = item.filename.replace(".ts", "");
        const indexContent = fs.readFileSync(indexPath, "utf8");
        if (!indexContent.includes(`./${exportName}`)) {
          fs.appendFileSync(
            indexPath,
            `export * from "./${exportName}";\n`,
            "utf8",
          );
        }
        writeOutput(
          OutputChannelEnum.USER_REPLY,
          `✔ Generated Type Alias: [src/types/${item.filename}](file:///d:/repos/iNoU/src/types/${item.filename})`,
        );
      }
    }

    writeOutput(
      OutputChannelEnum.USER_REPLY,
      `\n\x1b[36m[Verification] Verifying generated evolution code across test suites...\x1b[0m`,
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
        `\x1b[33m✔ Automated Rollback Complete! Restored state to previous working version.\x1b[0m`,
      );
      return;
    }

    // Update spec snippet
    if (plan.specSnippet && fs.existsSync(specPath)) {
      let specContent = fs.readFileSync(specPath, "utf8");
      specContent += `\n\n## Evolved Feature: ${cleanGoal}\n${plan.specSnippet}\n`;
      fs.writeFileSync(specPath, specContent, "utf8");
    }

    recalculateAndSyncVersion(rootDir);
    const updatedVer = calculateInuoVersion(rootDir);

    writeOutput(
      OutputChannelEnum.USER_REPLY,
      `\x1b[32m✔ [Spec & Code Evolution] Codebase synthesized and advanced to version v${updatedVer.fullVersionString}!\x1b[0m`,
    );
    writeOutput(
      OutputChannelEnum.USER_REPLY,
      `\x1b[33m★ iNoU-on-iNoU Self-Evolution Complete! Specification & Codebase synchronized.\x1b[0m`,
    );
  } catch (err: any) {
    writeOutput(
      OutputChannelEnum.USER_REPLY,
      `\x1b[31m[Self-Evolution Error] ${err.message}\x1b[0m`,
    );
    rollbackSnapshot(snapshot, rootDir);
  }
}
