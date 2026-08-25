import fs from "fs";
import path from "path";
import { learnSkill, getTrainingDataset } from "./learnEngine";
import { learnFromChatHistory } from "./chatLearningEngine";
import { getProjectPaths, loadState } from "./context";
import { writeOutput } from "./outputRouter";
import { OutputChannelEnum } from "../enums/OutputChannelEnum";

export async function runLearnCommand(
  args: string[],
  rootDir: string = process.cwd(),
): Promise<void> {
  const fullCmd = args.join(" ").trim().toLowerCase();
  const sub = (args[0] || "").toLowerCase();

  if (sub === "status" || sub === "list") {
    const paths = getProjectPaths(rootDir);
    const state = loadState(paths.statePath);
    const dataset = getTrainingDataset(rootDir);
    const skills = state.skills || [];

    const lines = [
      "=== iNoU Learned Skills & Training Knowledge Status ===",
      `• Total Learned Skills: ${skills.length}`,
      ...skills.map((s: any) => `  - [${s.name}] Category: ${s.category} | Formula: ${s.atomicFormula || s.id}`),
      `• Curated Training Pairs in Dataset: ${dataset.length}`,
      ...dataset.slice(-3).map((d) => `  - [${d.id}] "${d.prompt}" (${d.category})`),
      "",
      "Supported Learn Modes:",
      "  1. Chat History:  learn from chat history all",
      "  2. Natural Goal:  learn <how to do X using Y api>",
      "  3. Attachment:    learn <goal> --file <path/to/doc.md | swagger.json | openapi.yaml>",
      "  4. Direct File:   learn @<path/to/swagger.json> or learn <path/to/api.md>",
    ];
    writeOutput(OutputChannelEnum.USER_REPLY, lines.join("\n"));
    return;
  }

  // Detect "learn from chat history all" / "learn from chat" / "learn chat all" / "learn history"
  if (
    fullCmd.includes("chat history") ||
    fullCmd.startsWith("from chat") ||
    fullCmd.startsWith("chat") ||
    fullCmd.startsWith("history")
  ) {
    let sourcePath: string | undefined;
    for (let i = 0; i < args.length; i++) {
      if (args[i] === "--file" || args[i] === "-f") {
        sourcePath = args[i + 1];
        break;
      }
    }
    await learnFromChatHistory({ sourcePath, all: true }, rootDir);
    return;
  }

  let attachmentPath: string | undefined;
  const filteredArgs: string[] = [];

  // Parse arguments for --file, -f, or @prefix
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--file" || arg === "-f") {
      attachmentPath = args[i + 1];
      i++; // skip next
    } else if (arg.startsWith("@")) {
      attachmentPath = arg.slice(1);
    } else if (
      (arg.endsWith(".json") || arg.endsWith(".yaml") || arg.endsWith(".yml") || arg.endsWith(".md")) &&
      fs.existsSync(path.isAbsolute(arg) ? arg : path.join(rootDir, arg))
    ) {
      attachmentPath = arg;
    } else {
      filteredArgs.push(arg);
    }
  }

  const goal = filteredArgs.join(" ").trim();

  if (!goal && !attachmentPath) {
    writeOutput(
      OutputChannelEnum.USER_REPLY,
      "Usage: learn <goal> [--file <path/to/swagger.json|doc.md>]\nOr: learn from chat history all\nExample: learn how to post to linkedin --file docs/linkedin.md\nOr: learn @docs/swagger.json\nOr: learn status",
    );
    return;
  }

  await learnSkill(goal, { attachmentPath }, rootDir);
}
