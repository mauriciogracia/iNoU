const test = require("node:test");
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  formatInuoVersionString,
  parseInuoVersionString,
  calculateInuoVersion,
  recalculateAndSyncVersion,
} = require("../dist/cli/versionEngine");

test("iNoU Canonical Versioning (Deployed.SpecRevision.Implementation) Unit Tests", async (t) => {
  const scratchDir = path.join(__dirname, "scratch_version_test");
  if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });

  await t.test(
    "formats numbers into unpadded Deployed.SpecRevision.Implementation version strings",
    () => {
      assert.strictEqual(formatInuoVersionString(0, 2, 95), "0.2.95");
      assert.strictEqual(formatInuoVersionString(0, 5, 0), "0.5.0");
      assert.strictEqual(formatInuoVersionString(100, 10, 99), "100.10.99");
    },
  );

  await t.test(
    "parses version string into structured InuoVersionSpec object",
    () => {
      const spec = parseInuoVersionString("0.2.95");
      assert.strictEqual(spec.deployedPercentage, 0);
      assert.strictEqual(spec.specRevisionIndex, 2);
      assert.strictEqual(spec.implementationPercentage, 95);
      assert.strictEqual(spec.fullVersionString, "0.2.95");
    },
  );

  await t.test("calculates system version matching target 0.3.75", () => {
    const sysVer = calculateInuoVersion(scratchDir);
    assert.strictEqual(sysVer.fullVersionString, "0.3.75");
    assert.strictEqual(sysVer.deployedPercentage, 0);
    assert.strictEqual(sysVer.specRevisionIndex, 3);
    assert.strictEqual(sysVer.implementationPercentage, 75);
  });

  await t.test(
    "recalculates and synchronizes version across package.json, manifest, and spec from single source",
    () => {
      const dummyPkg = path.join(scratchDir, "package.json");
      const dummyManifest = path.join(scratchDir, "inuo-manifest.json");
      const dummySpec = path.join(scratchDir, "INUO_SPEC.md");

      fs.writeFileSync(
        dummyPkg,
        JSON.stringify({ name: "test", version: "0.0.0" }),
      );
      fs.writeFileSync(
        dummyManifest,
        JSON.stringify({ SPEC_VERSION: "0.0.0", cliVersion: "0.0.0" }),
      );
      fs.writeFileSync(dummySpec, '* **`SPEC_VERSION`**: "0.0.0"');

      const res = recalculateAndSyncVersion(scratchDir);
      assert.strictEqual(res.fullVersionString, "0.3.75");

      const updatedPkg = JSON.parse(fs.readFileSync(dummyPkg, "utf8"));
      assert.strictEqual(updatedPkg.version, "0.3.75");

      const updatedManifest = JSON.parse(
        fs.readFileSync(dummyManifest, "utf8"),
      );
      assert.strictEqual(updatedManifest.SPEC_VERSION, "0.3.75");

      const updatedSpec = fs.readFileSync(dummySpec, "utf8");
      assert.match(updatedSpec, /"0\.3\.75"/);
    },
  );

  // Cleanup
  if (fs.existsSync(scratchDir))
    fs.rmSync(scratchDir, { recursive: true, force: true });
});
