const test = require("node:test");
const assert = require("assert");
const http = require("http");
const path = require("path");
const fs = require("fs");

const {
  generateLocalizedCandidates,
  buildIdentityChoicePayload,
  formatIdentityChoiceMarker,
  saveGlobalIdentity
} = require("../dist/cli/identityEngine");
const { Router } = require("../dist/api/routes/Router");

test("iNoU Global Identity & Choice Onboarding Suite", async (t) => {
  const rootDir = path.resolve(__dirname, "..");

  await t.test("generates 4 localized Spanish gamer tags", () => {
    const candidates = generateLocalizedCandidates("es", 4);
    assert.strictEqual(candidates.length, 4);
    candidates.forEach((tag) => {
      assert.match(tag, /[0-9]{3,4}$/); // Ends with 3-4 digit number
    });
  });

  await t.test("generates 4 localized English gamer tags", () => {
    const candidates = generateLocalizedCandidates("en", 4);
    assert.strictEqual(candidates.length, 4);
    candidates.forEach((tag) => {
      assert.match(tag, /[0-9]{3,4}$/);
    });
  });

  await t.test("buildIdentityChoicePayload constructs 4 options + other write-in", () => {
    const payload = buildIdentityChoicePayload("es");
    assert.strictEqual(payload.type, "INTERACTIVE_CHOICE");
    assert.strictEqual(payload.isMultiSelect, false);
    assert.strictEqual(payload.options.length, 4);
    assert.strictEqual(payload.allowOther, true);
    assert.strictEqual(payload.otherIndex, 5);
  });

  await t.test("formatIdentityChoiceMarker produces valid <<<INOU_CHOICE:...>>> delimiter", () => {
    const marker = formatIdentityChoiceMarker("es");
    assert.match(marker, /^<<<INOU_CHOICE:\{.*\}>>>$/);
  });

  await t.test("HTTP API: GET /api/identity/candidates and POST /api/identity", async () => {
    const router = new Router(rootDir);
    const server = http.createServer((req, res) => {
      router.handleRequest(req, res);
    });

    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}`;

    try {
      // 1. GET candidates
      const candRes = await fetch(`${baseUrl}/api/identity/candidates?lang=es`);
      assert.strictEqual(candRes.status, 200);
      const candData = await candRes.json();
      assert.strictEqual(candData.options.length, 4);
      const chosenTag = candData.options[0].label;

      // 2. POST save chosen identity
      const saveRes = await fetch(`${baseUrl}/api/identity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: chosenTag, lang: "es" })
      });
      assert.strictEqual(saveRes.status, 200);
      const saveData = await saveRes.json();
      assert.strictEqual(saveData.success, true);
      assert.strictEqual(saveData.identity.globalHandle, chosenTag);

      // 3. GET check active identity
      const getRes = await fetch(`${baseUrl}/api/identity`);
      assert.strictEqual(getRes.status, 200);
      const getData = await getRes.json();
      assert.strictEqual(getData.identity.globalHandle, chosenTag);
    } finally {
      server.close();
    }
  });
});
