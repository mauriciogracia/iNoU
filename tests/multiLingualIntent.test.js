const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const fs = require("fs");

const {
  detectLanguage,
  getLocalizedHostGreeting,
} = require("../dist/cli/languageEngine");
const {
  generateSelfAwarenessResponse,
} = require("../dist/cli/selfAwarenessEngine");

test("Multi-Lingual Intent & Language Detection Unit Tests (4 Languages)", async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(__dirname, "tmp_multilang_"));

  await t.test(
    'detects Spanish language for "what can you do" and "who are you" intents',
    () => {
      assert.equal(detectLanguage("¿Qué puedes hacer tú?"), "es");
      assert.equal(detectLanguage("¿Qué hace iNoU?"), "es");
      assert.equal(detectLanguage("¿Qué me permites hacer?"), "es");
      assert.equal(detectLanguage("¿Quién eres?"), "es");
    },
  );

  await t.test(
    'detects French language for "what can you do" and "who are you" intents',
    () => {
      assert.equal(detectLanguage("Que peux-tu faire?"), "fr");
      assert.equal(detectLanguage("Que fait iNoU?"), "fr");
      assert.equal(detectLanguage("Qui es-tu?"), "fr");
    },
  );

  await t.test(
    'detects German language for "what can you do" and "who are you" intents',
    () => {
      assert.equal(detectLanguage("Was kannst du tun?"), "de");
      assert.equal(detectLanguage("Was macht iNoU?"), "de");
      assert.equal(detectLanguage("Wer bist du?"), "de");
    },
  );

  await t.test(
    'detects Portuguese language for "what can you do" and "who are you" intents',
    () => {
      assert.equal(detectLanguage("O que você pode fazer?"), "pt");
      assert.equal(detectLanguage("O que faz o iNoU?"), "pt");
      assert.equal(detectLanguage("Quem é você?"), "pt");
    },
  );

  await t.test(
    "provides localized host greetings across all 4 languages",
    () => {
      const esHost = getLocalizedHostGreeting("es", "Sofia");
      assert.match(esHost.greetingText, /iNoU/i);
      assert.match(esHost.greetingText, /Sofia|¿En qué puedo ayudarle/i);

      const frHost = getLocalizedHostGreeting("fr", "Jean");
      assert.match(frHost.greetingText, /iNoU/i);
      assert.match(frHost.greetingText, /Comment puis-je|Jean/i);

      const deHost = getLocalizedHostGreeting("de", "Klaus");
      assert.match(deHost.greetingText, /iNoU/i);
      assert.match(deHost.greetingText, /Wie kann ich Ihnen|Klaus/i);

      const ptHost = getLocalizedHostGreeting("pt", "Lucas");
      assert.match(ptHost.greetingText, /iNoU/i);
      assert.match(ptHost.greetingText, /Como posso ajudá|Lucas/i);
    },
  );

  await t.test(
    "generates self-awareness report describing system capabilities and formula",
    () => {
      const report = generateSelfAwarenessResponse(
        "user_local",
        "User",
        "Who are you?",
        tmpDir,
      );
      assert.match(report.generatedResponseText, /I am iNoU/);
      assert.match(
        report.generatedResponseText,
        /NEED = \(VERB\) \+ \(OBJECT\)/,
      );
    },
  );

  // Cleanup
  fs.rmSync(tmpDir, { recursive: true, force: true });
});
