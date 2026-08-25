const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const fs = require("fs");
const { runBootstrap } = require("../dist/cli/bootstrapCommand");
const { checkAndApplySyncProtocol } = require("../dist/cli/syncEngine");
const { loadManifest } = require("../dist/cli/context");

test("Sync Engine Automated Detection & Verification Unit Tests", async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(__dirname, "tmp_sync_"));
  const manifestPath = path.join(tmpDir, "inuo-manifest.json");
  const specPath = path.join(tmpDir, "INUO_SPEC.md");

  runBootstrap(tmpDir);

  await t.test("detects when manifest and spec are synchronized", () => {
    const result = checkAndApplySyncProtocol(tmpDir);
    assert.equal(result.status, "Synced");
    assert.equal(result.currentManifestVersion, "00.03.72");
  });

  await t.test(
    'detects spec version upgrade (e.g. SPEC_VERSION: "00.03.00") and applies verification update',
    () => {
      // Simulate updating SPEC_VERSION in INUO_SPEC.md to 00.03.00
      const newSpecContent = `# iNoU Core Persistent System Prompt (\`INUO_SPEC.md\`)
SPEC_VERSION: "00.03.00"
`;
      fs.writeFileSync(specPath, newSpecContent, "utf8");

      const result = checkAndApplySyncProtocol(tmpDir);
      assert.equal(result.status, "VerificationPassed");
      assert.equal(result.currentManifestVersion, "00.03.00");

      // Verify manifest updated
      const manifest = loadManifest(manifestPath);
      assert.equal(manifest.SPEC_VERSION, "00.03.00");
    },
  );

  await t.test("executes autonomous bi-directional sync with entity filters and lightweight mode", () => {
    const { runSelectiveSyncCommand } = require("../dist/cli/syncEngine");
    assert.doesNotThrow(() => {
      runSelectiveSyncCommand(["--entities", "task,workspace", "--workflow", "RoadWF", "--target", "google-drive"], tmpDir);
    });
    assert.doesNotThrow(() => {
      runSelectiveSyncCommand(["--entities", "project,task", "--source", "google-drive", "--lightweight"], tmpDir);
    });
    assert.doesNotThrow(() => {
      runSelectiveSyncCommand([], tmpDir);
    });
  });

  await t.test("Auto-sync interval configuration and interactive prompt buttons (Sync / Later / Disable)", () => {
    const {
      setAutoSyncConfig,
      getAutoSyncConfig,
      checkAndPromptAutoSyncDue,
      handleAutoSyncChoice,
    } = require("../dist/cli/syncEngine");

    setAutoSyncConfig(10, true, tmpDir);
    const cfg = getAutoSyncConfig(tmpDir);
    assert.equal(cfg.intervalMinutes, 10);
    assert.equal(cfg.promptEnabled, true);

    // Simulate elapsed time (20 minutes ago) -> prompt is due
    const { getProjectPaths, loadState, saveState } = require("../dist/cli/context");
    const paths = getProjectPaths(tmpDir);
    const state = loadState(paths.statePath);
    state.preferences = state.preferences || {};
    state.preferences.lastSyncAt = { value: new Date(Date.now() - 20 * 60 * 1000).toISOString(), enabled: true, updatedAt: new Date().toISOString() };
    saveState(paths.statePath, state);

    const promptCheck = checkAndPromptAutoSyncDue(tmpDir);
    assert.equal(promptCheck.isDue, true);
    assert.ok(promptCheck.options.some((o) => o.includes("Sync Now")));
    assert.ok(promptCheck.options.some((o) => o.includes("Later")));
    assert.ok(promptCheck.options.some((o) => o.includes("Disable")));

    // Handle user clicking "Sync Now" button [1]
    const syncRes = handleAutoSyncChoice("1", tmpDir);
    assert.equal(syncRes.action, "synced");

    // Handle user clicking "Later" button [2]
    const laterRes = handleAutoSyncChoice("2", tmpDir);
    assert.equal(laterRes.action, "deferred");

    // Handle user clicking "Disable" button [3]
    const disableRes = handleAutoSyncChoice("3", tmpDir);
    assert.equal(disableRes.action, "disabled");
    assert.equal(getAutoSyncConfig(tmpDir).intervalMinutes, 0);
  });

  // Cleanup
  fs.rmSync(tmpDir, { recursive: true, force: true });
});


