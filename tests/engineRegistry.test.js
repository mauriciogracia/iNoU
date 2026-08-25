const test = require('node:test');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { listEngines, inspectEngineBehaviors, registerEngine } = require('../dist/cli/engineRegistry');
const { runEngineCommand } = require('../dist/cli/engineCommand');
const { loadState } = require('../dist/cli/context');

test('Engine-as-Behavior Hierarchy & Composition Registry Unit Tests', async (t) => {
  const scratchDir = path.join(__dirname, 'scratch_engine_test');
  if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });

  const statePath = path.join(scratchDir, '.inuo-state.json');
  if (fs.existsSync(statePath)) fs.unlinkSync(statePath);

  await t.test('initializes baseline iNoU engines as behavior groups', () => {
    const engines = listEngines(scratchDir);
    assert.ok(engines.length >= 3);
    assert.ok(engines.some((e) => e.engineId === 'engine_trust'));
    assert.ok(engines.some((e) => e.engineId === 'engine_emergency'));
    assert.ok(engines.some((e) => e.engineId === 'engine_self_awareness'));
  });

  await t.test('registers custom engine composed of behavior groups', () => {
    const engine = registerEngine(
      'Custom Analytics Engine',
      'Engine governing interaction analytics behaviors',
      ['behavior_anti_manipulation', 'behavior_circuit_breaker'],
      scratchDir
    );
    assert.strictEqual(engine.engineName, 'Custom Analytics Engine');
    assert.strictEqual(engine.behaviorIds.length, 2);

    const state = loadState(statePath);
    assert.ok(state.engines.some((e) => e.engineName === 'Custom Analytics Engine'));
  });

  await t.test('inspects constituent behaviors and skills inside an engine', () => {
    runEngineCommand(['register', '--name', 'SecurityEngine', '--behaviors', 'behavior_anti_manipulation'], scratchDir);

    const { engine, behaviors } = inspectEngineBehaviors('SecurityEngine', scratchDir);
    assert.ok(engine);
    assert.strictEqual(engine.engineName, 'SecurityEngine');
  });

  // Cleanup
  if (fs.existsSync(statePath)) fs.unlinkSync(statePath);
  if (fs.existsSync(scratchDir)) fs.rmSync(scratchDir, { recursive: true, force: true });
});
