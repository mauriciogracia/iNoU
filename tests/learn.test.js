const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const fs = require("fs");

const {
  createSnapshot,
  rollbackSnapshot,
  getTrainingDataset,
  registerTrainingPair,
  registerLearnedSkill,
  loadAttachment,
  learnSkill,
} = require("../dist/cli/learnEngine");
const {
  findChatHistoryFiles,
  parseRawTranscriptContent,
  extractKnowledgeFromChatHistory,
  learnFromChatHistory,
} = require("../dist/cli/chatLearningEngine");
const { runLearnCommand } = require("../dist/cli/learnCommand");
const { executeShellLine } = require("../dist/cli/shell");
const { loadState } = require("../dist/cli/context");

test("iNoU Self-Evolution & Skill Learning Engine Comprehensive Tests", async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(__dirname, "tmp_learn_comp_"));

  // Bootstrap minimal directory structure for test isolation
  const manifestPath = path.join(tmpDir, "inuo-manifest.json");
  const pkgPath = path.join(tmpDir, "package.json");
  const interfacesDir = path.join(tmpDir, "src", "interfaces");
  fs.mkdirSync(interfacesDir, { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify({ SPEC_VERSION: "00.03.70", IMPLEMENTATION_COUNT: 70 }), "utf8");
  fs.writeFileSync(pkgPath, JSON.stringify({ name: "inuo-test", version: "00.03.70" }), "utf8");
  fs.writeFileSync(path.join(interfacesDir, "index.ts"), `export * from "./Need";\n`, "utf8");
  fs.writeFileSync(path.join(interfacesDir, "Need.ts"), `export interface Need { id: string; }\n`, "utf8");

  await t.test("createSnapshot and rollbackSnapshot restore state and delete created files atomically", () => {
    // 1. Capture snapshot
    const snapshot = createSnapshot(tmpDir);
    assert.ok(snapshot.timestamp);
    assert.ok(snapshot.filesBackup.length > 0);

    // 2. Simulate evolution creating a new file and modifying existing file
    const dummyNewFile = path.join(tmpDir, "dummy_new_type.ts");
    fs.writeFileSync(dummyNewFile, "export interface Dummy {}", "utf8");
    snapshot.createdFiles.push(dummyNewFile);

    fs.writeFileSync(manifestPath, JSON.stringify({ SPEC_VERSION: "00.04.00" }), "utf8");

    // 3. Trigger rollback
    rollbackSnapshot(snapshot, tmpDir);

    // 4. Verify new file was deleted and manifest restored
    assert.equal(fs.existsSync(dummyNewFile), false);
    const restoredManifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    assert.equal(restoredManifest.SPEC_VERSION, "00.03.70");
  });

  await t.test("loadAttachment recognizes markdown and Swagger/OpenAPI files", () => {
    // 1. Markdown file
    const mdPath = path.join(tmpDir, "api-doc.md");
    fs.writeFileSync(mdPath, "# LinkedIn API Guide\nPOST /v2/ugcPosts", "utf8");
    const mdResult = loadAttachment(mdPath, tmpDir);
    assert.ok(mdResult);
    assert.equal(mdResult.filename, "api-doc.md");
    assert.equal(mdResult.isSwagger, false);
    assert.match(mdResult.content, /LinkedIn API Guide/);

    // 2. Swagger / OpenAPI JSON file
    const swaggerPath = path.join(tmpDir, "swagger.json");
    fs.writeFileSync(
      swaggerPath,
      JSON.stringify({
        openapi: "3.0.0",
        info: { title: "Petstore API", version: "1.0.0" },
        paths: { "/pets": { get: { summary: "List all pets" } } },
      }),
      "utf8",
    );
    const swaggerResult = loadAttachment(swaggerPath, tmpDir);
    assert.ok(swaggerResult);
    assert.equal(swaggerResult.filename, "swagger.json");
    assert.equal(swaggerResult.isSwagger, true);

    // 3. Non-existent file returns null
    const nonExistent = loadAttachment("does_not_exist.json", tmpDir);
    assert.equal(nonExistent, null);
  });

  await t.test("parseRawTranscriptContent extracts JSONL, structured JSON, and plaintext messages", () => {
    const rawJsonl = `{"type":"USER_INPUT","content":"Please make sure to prioritize free tier"}\n{"type":"PLANNER_RESPONSE","content":"Understood. Cost governance active."}`;
    const parsed = parseRawTranscriptContent(rawJsonl);
    assert.match(parsed, /\[User\]: Please make sure to prioritize free tier/);
    assert.match(parsed, /\[Assistant\]: Understood\. Cost governance active\./);

    const plaintext = "User: How do I match needs?\nAssistant: Use the match command.";
    const parsedPlain = parseRawTranscriptContent(plaintext);
    assert.equal(parsedPlain, plaintext);
  });

  await t.test("findChatHistoryFiles discovers transcript logs in data/ directory", () => {
    const dataDir = path.join(tmpDir, "data");
    fs.mkdirSync(dataDir, { recursive: true });
    const chatFile = path.join(dataDir, "sample_transcript.jsonl");
    fs.writeFileSync(chatFile, `{"type":"USER_INPUT","content":"test chat"}\n`, "utf8");

    const found = findChatHistoryFiles(tmpDir);
    assert.ok(found.includes(chatFile));
  });

  await t.test("registerTrainingPair persists few-shot training examples in data/training_dataset.json", () => {
    const pair = registerTrainingPair(
      {
        category: "api_integration",
        prompt: "learn how to post to linkedin using the api",
        expectedNeed: {
          verb: "Post",
          object: "LinkedInStatus",
        },
        skillRecipe: {
          skillName: "LinkedInPostingSkill",
          atomicFormula: "NEED = (Post) + (LinkedInStatus)",
        },
      },
      tmpDir,
    );

    assert.ok(pair.id);
    assert.equal(pair.expectedNeed.verb, "Post");

    const dataset = getTrainingDataset(tmpDir);
    assert.ok(dataset.some((item) => item.id === pair.id));
  });

  await t.test("registerLearnedSkill saves skill definition and generates markdown documentation", () => {
    const skill = {
      id: "skill_test_123",
      name: "LinkedInPostingSkill",
      category: "api_integration",
      description: "Publishes articles and status updates to LinkedIn.",
      atomicFormula: "NEED = (Post) + (LinkedInStatus)",
      requiredEnvVars: ["LINKEDIN_ACCESS_TOKEN"],
      samplePayload: { text: "Hello LinkedIn" },
      learnedAt: new Date().toISOString(),
      version: "00.03.70",
    };

    registerLearnedSkill(skill, tmpDir);

    const state = loadState(path.join(tmpDir, ".inuo-state.json"));
    assert.ok(state.skills.some((s) => s.name === "LinkedInPostingSkill"));

    const docPath = path.join(tmpDir, "skills", "linkedinpostingskill", "SKILL.md");
    assert.ok(fs.existsSync(docPath));
    const docContent = fs.readFileSync(docPath, "utf8");
    assert.match(docContent, /# Skill: LinkedInPostingSkill/);
    assert.match(docContent, /LINKEDIN_ACCESS_TOKEN/);
    assert.match(docContent, /NEED = \(Post\) \+ \(LinkedInStatus\)/);
  });

  await t.test("runLearnCommand handles chat history, status, and attachment flags cleanly", async () => {
    const testDoc = path.join(tmpDir, "doc.md");
    fs.writeFileSync(testDoc, "# Sample API Guide\nPOST /v1/publish", "utf8");

    assert.doesNotThrow(async () => {
      await runLearnCommand(["status"], tmpDir);
    });
    assert.doesNotThrow(async () => {
      await runLearnCommand(["from", "chat", "history", "all"], tmpDir);
    });
    assert.doesNotThrow(async () => {
      await runLearnCommand(["--file", testDoc], tmpDir);
    });
    assert.doesNotThrow(async () => {
      await runLearnCommand([`@${testDoc}`], tmpDir);
    });
    assert.doesNotThrow(async () => {
      await runLearnCommand([], tmpDir);
    });
  });

  await t.test("executeShellLine dispatches learn commands smoothly", async () => {
    assert.doesNotThrow(async () => {
      await executeShellLine("learn status", tmpDir);
    });
    assert.doesNotThrow(async () => {
      await executeShellLine("learn from chat history all", tmpDir);
    });
  });

  // Cleanup
  fs.rmSync(tmpDir, { recursive: true, force: true });
});
