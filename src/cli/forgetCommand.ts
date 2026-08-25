import { getProjectPaths, loadState, saveState } from './context';

export function runForgetCommand(args: string[], rootDir: string = process.cwd()): void {
  const targetType = args[0]?.toLowerCase();
  const query = args[1];

  if (!targetType || !query) {
    console.log('\x1b[33m%s\x1b[0m', 'Usage: forget <behavior|skill|correction> <id_or_name>');
    console.log('Examples:');
    console.log('  forget behavior PlanningBehavior');
    console.log('  forget skill skill_decompose');
    console.log('  forget correction correction_12345');
    return;
  }

  const paths = getProjectPaths(rootDir);
  const state = loadState(paths.statePath);

  if (targetType === 'behavior') {
    if (!state.behaviors) state.behaviors = [];
    const idx = state.behaviors.findIndex(
      (b) => b.id.toLowerCase() === query.toLowerCase() || b.name.toLowerCase() === query.toLowerCase()
    );

    if (idx === -1) {
      console.log('\x1b[31m%s\x1b[0m', `Behavior "${query}" not found.`);
      return;
    }

    const removed = state.behaviors.splice(idx, 1)[0];
    saveState(paths.statePath, state);
    console.log('\x1b[32m%s\x1b[0m', `✔ iNoU Forgot Behavior: "${removed.name}" [ID: ${removed.id}]`);
    return;
  }

  if (targetType === 'skill') {
    if (!state.skills) state.skills = [];
    const idx = state.skills.findIndex(
      (s) => s.id.toLowerCase() === query.toLowerCase() || s.name.toLowerCase() === query.toLowerCase()
    );

    if (idx === -1) {
      console.log('\x1b[31m%s\x1b[0m', `Skill "${query}" not found.`);
      return;
    }

    const removed = state.skills.splice(idx, 1)[0];

    // Unlink from behaviors
    if (state.behaviors) {
      state.behaviors.forEach((b) => {
        b.skillIds = b.skillIds.filter((sId) => sId !== removed.id && sId !== removed.name);
      });
    }

    saveState(paths.statePath, state);
    console.log('\x1b[32m%s\x1b[0m', `✔ iNoU Forgot Skill: "${removed.name}" [ID: ${removed.id}]`);
    return;
  }

  if (targetType === 'correction') {
    if (!state.learnedCorrections) state.learnedCorrections = [];
    const idx = state.learnedCorrections.findIndex(
      (c) => c.id.toLowerCase() === query.toLowerCase() || c.topic.toLowerCase() === query.toLowerCase()
    );

    if (idx === -1) {
      console.log('\x1b[31m%s\x1b[0m', `Learned Correction "${query}" not found.`);
      return;
    }

    const removed = state.learnedCorrections.splice(idx, 1)[0];
    saveState(paths.statePath, state);
    console.log('\x1b[32m%s\x1b[0m', `✔ iNoU Forgot Learned Correction: "${removed.topic}" [ID: ${removed.id}]`);
    return;
  }

  console.log('\x1b[33m%s\x1b[0m', 'Unknown forget target. Supported targets: "behavior", "skill", "correction"');
}
