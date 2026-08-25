const test = require("node:test");
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  setOperatingMode,
  setInteractionLanguage,
  initiateHostGreeting,
} = require("../dist/cli/hostServiceEngine");
const {
  detectLanguage,
  getLocalizedHostGreeting,
} = require("../dist/cli/languageEngine");
const { loadState } = require("../dist/cli/context");

test("Dual Operating Modes & Dynamic Language Determination Unit Tests", async (t) => {
  const scratchDir = path.join(__dirname, "scratch_mode_test");
  if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });

  const statePath = path.join(scratchDir, ".inuo-state.json");
  if (fs.existsSync(statePath)) fs.unlinkSync(statePath);

  await t.test(
    "switches operating mode to letMeServeYou host concierge mode",
    () => {
      const config = setOperatingMode("letMeServeYou", scratchDir);
      assert.strictEqual(config.currentMode, "letMeServeYou");
      assert.strictEqual(config.authRequiredOnStart, true);

      const state = loadState(statePath);
      assert.strictEqual(state.operatingMode.currentMode, "letMeServeYou");
    },
  );

  await t.test(
    "detects input language automatically across multi-lingual cues",
    () => {
      assert.strictEqual(
        detectLanguage("Hola buenos dias necesito ayuda"),
        "es",
      );
      assert.strictEqual(detectLanguage("Bonjour merci beaucoup"), "fr");
      assert.strictEqual(detectLanguage("Hallo guten Tag wer bist du"), "de");
      assert.strictEqual(detectLanguage("Olá bom dia obrigado"), "pt");
      assert.strictEqual(
        detectLanguage("Hello create a new need for water"),
        "en",
      );
    },
  );

  await t.test(
    "generates localized host greetings in Spanish and French",
    () => {
      setInteractionLanguage("es", true, scratchDir);

      const hostEs = initiateHostGreeting(scratchDir);
      assert.match(hostEs.greeting, /iNoU/i);
      assert.match(hostEs.promptMessage, /Ingrese|comando|consulta/i);

      const greetingFr = getLocalizedHostGreeting("fr", "Sofia");
      assert.match(greetingFr.greetingText, /iNoU/i);
      assert.match(greetingFr.greetingText, /Comment puis-je|Sofia/i);
    },
  );

  await t.test("switches back cleanly to promptMe passive mode", () => {
    const config = setOperatingMode("promptMe", scratchDir);
    assert.strictEqual(config.currentMode, "promptMe");
    assert.strictEqual(config.authRequiredOnStart, false);
  });

  // Cleanup
  if (fs.existsSync(statePath)) fs.unlinkSync(statePath);
  if (fs.existsSync(scratchDir))
    fs.rmSync(scratchDir, { recursive: true, force: true });
});
