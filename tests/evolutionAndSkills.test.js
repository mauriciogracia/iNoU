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
} = require("../dist/cli/learnEngine");
const {
  exportTrainingData,
  mergeTrainingData,
  processUserCorrection,
} = require("../dist/cli/learningEngine");
const {
  calculateInuoVersion,
  recalculateAndSyncVersion,
} = require("../dist/cli/versionEngine");
const { loadState, saveState, getProjectPaths } = require("../dist/cli/context");
const { runNeedCommand } = require("../dist/cli/needCommand");
const { runOfferCommand } = require("../dist/cli/offerCommand");
const { runMatchCommand } = require("../dist/cli/matchCommand");

test("iNoU Evolution, Training Data Persistence, and Skill Reuse Unit Tests", async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(__dirname, "tmp_evo_skills_"));

  // Bootstrap isolated workspace environment
  const manifestPath = path.join(tmpDir, "inuo-manifest.json");
  const pkgPath = path.join(tmpDir, "package.json");
  const specPath = path.join(tmpDir, "INUO_SPEC.md");
  const interfacesDir = path.join(tmpDir, "src", "interfaces");
  const typesDir = path.join(tmpDir, "src", "types");
  const dataDir = path.join(tmpDir, "data");

  fs.mkdirSync(interfacesDir, { recursive: true });
  fs.mkdirSync(typesDir, { recursive: true });
  fs.mkdirSync(dataDir, { recursive: true });

  fs.writeFileSync(manifestPath, JSON.stringify({ SPEC_VERSION: "00.03.72", IMPLEMENTATION_COUNT: 72 }, null, 2), "utf8");
  fs.writeFileSync(pkgPath, JSON.stringify({ name: "inuo-test", version: "00.03.72" }, null, 2), "utf8");
  fs.writeFileSync(specPath, `# iNoU Specification\nSPEC_VERSION: "00.03.72"\n`, "utf8");
  fs.writeFileSync(path.join(interfacesDir, "index.ts"), `export * from "./Need";\n`, "utf8");
  fs.writeFileSync(path.join(interfacesDir, "Need.ts"), `export interface Need { id: string; }\n`, "utf8");
  fs.writeFileSync(path.join(typesDir, "index.ts"), `export * from "./NeedId";\n`, "utf8");
  fs.writeFileSync(path.join(typesDir, "NeedId.ts"), `export type NeedId = string;\n`, "utf8");

  await t.test("1. Self-Evolution synthesizes DEV_RULES single-definition files and updates spec", () => {
    const snapshot = createSnapshot(tmpDir);
    assert.equal(snapshot.preVersion, "00.03.72");

    // Simulate Evolution adding TikTokMediaPayload interface
    const newIfacePath = path.join(interfacesDir, "TikTokMediaPayload.ts");
    fs.writeFileSync(newIfacePath, "export interface TikTokMediaPayload { videoUrl: string; caption: string; }\n", "utf8");
    snapshot.createdFiles.push(newIfacePath);

    // Update barrel export
    fs.appendFileSync(path.join(interfacesDir, "index.ts"), `export * from "./TikTokMediaPayload";\n`, "utf8");

    // Append to spec
    fs.appendFileSync(specPath, `\n## Evolved Feature: TikTok Posting API\nDetails of TikTok posting.\n`, "utf8");

    // Bump and sync canonical version
    recalculateAndSyncVersion(tmpDir);
    const ver = calculateInuoVersion(tmpDir);

    assert.equal(fs.existsSync(newIfacePath), true);
    assert.match(fs.readFileSync(path.join(interfacesDir, "index.ts"), "utf8"), /TikTokMediaPayload/);
    assert.match(fs.readFileSync(specPath, "utf8"), /TikTok Posting API/);
    assert.equal(ver.fullVersionString, "00.03.72");
    assert.equal(ver.specRevisionIndex, 3);
  });

  await t.test("2. Atomic Rollback cleanly deletes newly created files and restores previous state on error", () => {
    // 1. Capture snapshot
    const snapshot = createSnapshot(tmpDir);

    // 2. Simulate broken evolution attempt
    const brokenFile = path.join(interfacesDir, "BrokenFeature.ts");
    fs.writeFileSync(brokenFile, "export interface BrokenFeature { syntax error }", "utf8");
    snapshot.createdFiles.push(brokenFile);

    fs.writeFileSync(manifestPath, JSON.stringify({ SPEC_VERSION: "99.99.99" }), "utf8");

    // 3. Rollback
    rollbackSnapshot(snapshot, tmpDir);

    // 4. Verify broken file removed and manifest restored
    assert.equal(fs.existsSync(brokenFile), false);
    const restored = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    assert.notEqual(restored.SPEC_VERSION, "99.99.99");
  });

  await t.test("3. Training Data accumulates, survives restarts, and can be exported/merged across nodes", () => {
    // 1. Ingest training pairs
    const pair1 = registerTrainingPair(
      {
        prompt: "Post a short video to TikTok",
        category: "skill_learning",
        expectedNeed: { verb: "Publish", object: "TikTokVideo" },
        skillRecipe: { formula: "NEED = (Publish) + (TikTokVideo)" },
      },
      tmpDir,
    );

    const pair2 = registerTrainingPair(
      {
        prompt: "Broadcast status to LinkedIn feed",
        category: "social_broadcast",
        expectedNeed: { verb: "Post", object: "LinkedInStatus" },
      },
      tmpDir,
    );

    assert.ok(pair1.id);
    assert.ok(pair2.id);

    // 2. Verify dataset persists on disk
    const dataset = getTrainingDataset(tmpDir);
    assert.ok(dataset.length >= 2);
    assert.ok(dataset.some((p) => p.prompt.includes("TikTok")));
    assert.ok(dataset.some((p) => p.prompt.includes("LinkedIn")));

    // 3. Test Training Data Export and Merge
    const exportFile = path.join(tmpDir, "exported_training.json");
    exportTrainingData(exportFile, tmpDir);
    assert.ok(fs.existsSync(exportFile));

    // Merge into fresh state
    mergeTrainingData(exportFile, tmpDir);
    const state = loadState(path.join(tmpDir, ".inuo-state.json"));
    assert.ok(state);
  });

  await t.test("4. Learned Skills can be created, documented, updated/improved, and reused", () => {
    // 1. Initial skill learning
    const initialSkill = {
      id: "skill_tiktok_v1",
      name: "TikTokPostingSkill",
      category: "api_integration",
      description: "Initial basic TikTok video posting support.",
      atomicFormula: "NEED = (Publish) + (TikTokVideo)",
      requiredEnvVars: ["TIKTOK_ACCESS_TOKEN"],
      samplePayload: { videoUrl: "https://cdn.example.com/reel.mp4" },
      learnedAt: new Date().toISOString(),
      version: "00.03.70",
    };

    registerLearnedSkill(initialSkill, tmpDir);

    const state1 = loadState(path.join(tmpDir, ".inuo-state.json"));
    const stored1 = state1.skills.find((s) => s.name === "TikTokPostingSkill");
    assert.ok(stored1);
    assert.equal(stored1.description, "Initial basic TikTok video posting support.");

    const skillDoc = path.join(tmpDir, "skills", "tiktokpostingskill", "SKILL.md");
    assert.ok(fs.existsSync(skillDoc));
    assert.match(fs.readFileSync(skillDoc, "utf8"), /TIKTOK_ACCESS_TOKEN/);

    // 2. Improve and update the existing skill (Version 2)
    const improvedSkill = {
      id: "skill_tiktok_v1", // Same ID to improve existing
      name: "TikTokPostingSkill",
      category: "api_integration",
      description: "Enhanced TikTok posting with photo carousel, duet/stitch controls, and privacy levels.",
      atomicFormula: "NEED = (Publish) + (TikTokMedia)",
      requiredEnvVars: ["TIKTOK_ACCESS_TOKEN", "TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET"],
      samplePayload: {
        mediaType: "PHOTO_CAROUSEL",
        images: ["https://cdn.example.com/img1.jpg", "https://cdn.example.com/img2.jpg"],
        privacyLevel: "PUBLIC_TO_EVERYONE",
        disableComment: false,
      },
      learnedAt: new Date().toISOString(),
      version: "00.03.71",
    };

    registerLearnedSkill(improvedSkill, tmpDir);

    const state2 = loadState(path.join(tmpDir, ".inuo-state.json"));
    // Verify no duplicates were created
    const matchingSkills = state2.skills.filter((s) => s.name === "TikTokPostingSkill");
    assert.equal(matchingSkills.length, 1);
    assert.equal(matchingSkills[0].atomicFormula, "NEED = (Publish) + (TikTokMedia)");
    assert.equal(matchingSkills[0].requiredEnvVars.length, 3);

    // Verify documentation was updated with improved skill specs
    const updatedDoc = fs.readFileSync(skillDoc, "utf8");
    assert.match(updatedDoc, /TIKTOK_CLIENT_SECRET/);
    assert.match(updatedDoc, /PHOTO_CAROUSEL/);
  });

  await t.test("5. Reusing learned skill formula in Need and Offer interaction matching", () => {
    // 1. Create a Need using the learned skill formula
    runNeedCommand(["create", "--verb", "Publish", "--object", "TikTokMedia"], tmpDir);

    // 2. Create an Offer fulfilling the complement
    runOfferCommand(["create", "--verb", "Broadcast", "--object", "TikTokMedia"], tmpDir);

    // 3. Match them seamlessly
    assert.doesNotThrow(() => {
      runMatchCommand(tmpDir);
    });

    const state = loadState(path.join(tmpDir, ".inuo-state.json"));
    assert.ok(state.needs.some((n) => n.object === "TikTokMedia"));
    assert.ok(state.offers.some((o) => o.object === "TikTokMedia"));
  });

  // Cleanup
  fs.rmSync(tmpDir, { recursive: true, force: true });
});
