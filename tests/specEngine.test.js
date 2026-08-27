const test = require("node:test");
const assert = require("assert");
const path = require("path");
const fs = require("fs");

const { processSpecIntakeTurn } = require("../dist/cli/specEngine");
const { getProjectPaths, loadState } = require("../dist/cli/context");

test("iNoU Spec-Engineering & 1-by-1 Job Intake Suite", async (t) => {
  const rootDir = path.resolve(__dirname, "..");

  await t.test("executes complete 5-step job specification intake interview", () => {
    // Step 1: Start interview
    const turn1 = processSpecIntakeTurn(rootDir, null);
    assert.strictEqual(turn1.isComplete, false);
    assert.strictEqual(turn1.session.currentStep, 1);
    assert.match(turn1.output, /Paso 1\/5/);
    assert.match(turn1.output, /<<<INOU_CHOICE:\{.*\}>>>/);

    // Step 2: Answer Step 1 (Role)
    const turn2 = processSpecIntakeTurn(rootDir, turn1.session, "Senior TypeScript / Node.js Engineer");
    assert.strictEqual(turn2.isComplete, false);
    assert.strictEqual(turn2.session.currentStep, 2);
    assert.match(turn2.output, /Paso 2\/5/);

    // Step 3: Answer Step 2 (Stack)
    const turn3 = processSpecIntakeTurn(rootDir, turn2.session, "TypeScript, React, Node.js, PostgreSQL");
    assert.strictEqual(turn3.isComplete, false);
    assert.strictEqual(turn3.session.currentStep, 3);
    assert.match(turn3.output, /Paso 3\/5/);

    // Step 4: Answer Step 3 (Modality)
    const turn4 = processSpecIntakeTurn(rootDir, turn3.session, "100% Remoto");
    assert.strictEqual(turn4.isComplete, false);
    assert.strictEqual(turn4.session.currentStep, 4);
    assert.match(turn4.output, /Paso 4\/5/);

    // Step 5: Answer Step 4 (Budget)
    const turn5 = processSpecIntakeTurn(rootDir, turn4.session, "Senior ($4,000 - $6,000 USD/mes)");
    assert.strictEqual(turn5.isComplete, false);
    assert.strictEqual(turn5.session.currentStep, 5);
    assert.match(turn5.output, /Paso 5\/5/);

    // Final: Answer Step 5 (Milestones) -> Complete
    const finalTurn = processSpecIntakeTurn(rootDir, turn5.session, "Arquitectura, API Core, Despliegue CI/CD");
    assert.strictEqual(finalTurn.isComplete, true);
    assert.strictEqual(finalTurn.session, null);
    assert.match(finalTurn.output, /Especificación Técnica de Empleo Compilada/);
    assert.match(finalTurn.output, /Senior TypeScript \/ Node\.js Engineer/);
    assert.match(finalTurn.output, /Recruit \+ Senior TypeScript \/ Node\.js Engineer/);

    assert.ok(finalTurn.jobSpec);
    assert.strictEqual(finalTurn.jobSpec.role, "Senior TypeScript / Node.js Engineer");
    assert.strictEqual(finalTurn.jobSpec.modality, "100% Remoto");

    // Verify canonical Need was persisted in state
    const paths = getProjectPaths(rootDir);
    const state = loadState(paths.statePath);
    const need = (state.needs || []).find((n) => n.id === finalTurn.jobSpec.needId);
    assert.ok(need);
    assert.strictEqual(need.verb, "Recruit");
    assert.strictEqual(need.object, "Senior TypeScript / Node.js Engineer");
  });
});
