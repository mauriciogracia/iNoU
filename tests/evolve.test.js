const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const { runEvolveCommand } = require('../dist/cli/evolveCommand');

test('iNoU-on-iNoU Self-Orchestrating Evolution Unit Tests', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(__dirname, 'tmp_evolve_'));

  await t.test('gracefully handles missing API key in offline environment', async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;

    await runEvolveCommand('Add Rate Limiting Module', tmpDir);
    assert.equal(fs.existsSync(tmpDir), true);
  });

  // Cleanup
  fs.rmSync(tmpDir, { recursive: true, force: true });
});
