import { listEngines, inspectEngineBehaviors, registerEngine } from './engineRegistry';

export function runEngineCommand(args: string[], rootDir: string = process.cwd()): void {
  const sub = args[0]?.toLowerCase() || 'list';

  if (sub === 'list') {
    console.log('\x1b[36m%s\x1b[0m', '=== iNoU Engine Composition Registry (Behavior Groups) ===\n');
    const engines = listEngines(rootDir);

    if (engines.length === 0) {
      console.log('No engines registered.');
      return;
    }

    console.log(`\x1b[1m${'ENGINE ID'.padEnd(25)} | ${'ENGINE NAME'.padEnd(40)} | BEHAVIORS | IMMUTABLE\x1b[0m`);
    console.log(''.padEnd(95, '-'));

    engines.forEach((e) => {
      const immStr = e.isImmutable ? '\x1b[32mYes (MasterTrainer)\x1b[0m' : 'No';
      console.log(
        `${e.engineId.padEnd(25)} | \x1b[1m${e.engineName.padEnd(40)}\x1b[0m | ${e.behaviorIds.length.toString().padEnd(9)} | ${immStr}`
      );
    });
    return;
  }

  if (sub === 'inspect' || sub === 'show') {
    const query = args.slice(1).join(' ') || 'engine_trust';
    const { engine, behaviors } = inspectEngineBehaviors(query, rootDir);

    if (!engine) {
      console.log('\x1b[31m%s\x1b[0m', `Engine "${query}" not found in registry.`);
      return;
    }

    console.log('\x1b[36m%s\x1b[0m', `=== Engine Composition: "${engine.engineName}" [${engine.engineId}] ===`);
    console.log(`Description: ${engine.description}`);
    console.log(`Constituent Behaviors (${engine.behaviorIds.length}):`);

    if (behaviors.length === 0) {
      console.log(`  (Behavior IDs registered: ${engine.behaviorIds.join(', ')})`);
    } else {
      behaviors.forEach((b) => {
        console.log(`  • \x1b[1m${b.name}\x1b[0m [ID: ${b.id}] — ${b.skillIds.length} Skill ID(s): ${b.skillIds.join(', ')}`);
      });
    }

    return;
  }

  if (sub === 'register' || sub === 'create' || sub === 'add') {
    let name = '';
    let desc = 'Custom Engine Behavior Group';
    let behaviorsInput = '';

    for (let i = 1; i < args.length; i++) {
      if (args[i] === '--name' && args[i + 1]) name = args[i + 1];
      if (args[i] === '--description' && args[i + 1]) desc = args[i + 1];
      if (args[i] === '--behaviors' && args[i + 1]) behaviorsInput = args[i + 1];
    }

    if (!name && args[1] && !args[1].startsWith('-')) name = args[1];

    if (!name) {
      console.log('\x1b[33m%s\x1b[0m', 'Usage: engine register --name <Name> [--description <Desc>] [--behaviors B1,B2]');
      return;
    }

    const behaviorIds = behaviorsInput ? behaviorsInput.split(',').map((b) => b.trim()) : [];
    const engine = registerEngine(name, desc, behaviorIds, rootDir);

    console.log('\x1b[32m%s\x1b[0m', `✔ Registered Engine: "${engine.engineName}" [ID: ${engine.engineId}] with ${behaviorIds.length} behavior(s).`);
    return;
  }

  console.log('Unknown subcommand for engine. Supported: "engine list", "engine inspect <id>", "engine register --name <N>"');
}
