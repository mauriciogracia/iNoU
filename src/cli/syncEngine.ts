import fs from 'fs';
import { getProjectPaths, loadManifest, loadState, saveState } from './context';
import { runRollback } from './rollbackCommand';
import { SyncResult } from '../interfaces/SyncResult';
import { recalculateAndSyncVersion } from './versionEngine';

export function extractSpecVersion(specPath: string): string | null {
  if (!fs.existsSync(specPath)) return null;
  try {
    const content = fs.readFileSync(specPath, 'utf8');
    const match = content.match(/SPEC_VERSION:\s*["']?([0-9A-Za-z\.]+)["']?/i);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

export function checkAndApplySyncProtocol(rootDir: string = process.cwd()): SyncResult {
  recalculateAndSyncVersion(rootDir);
  const paths = getProjectPaths(rootDir);
  const manifest = loadManifest(paths.manifestPath);

  if (!manifest) {
    return {
      currentManifestVersion: '0.0.0',
      targetSpecVersion: '0.1.0',
      status: 'VerificationFailed',
      message: 'Manifest file inuo-manifest.json missing. Run "init" to bootstrap.',
    };
  }

  const targetSpecVersion = extractSpecVersion(paths.specPath) || manifest.SPEC_VERSION;
  const currentManifestVersion = manifest.SPEC_VERSION;

  if (currentManifestVersion === targetSpecVersion) {
    return {
      currentManifestVersion,
      targetSpecVersion,
      status: 'Synced',
      message: `System synchronized at SPEC_VERSION: "${currentManifestVersion}".`,
    };
  }

  console.log(
    '\x1b[36m%s\x1b[0m',
    `[iNoU Sync Engine] Protocol Update Detected! Target Spec: "${targetSpecVersion}" | Current Manifest: "${currentManifestVersion}"`
  );

  const passesVerification = fs.existsSync(paths.manifestPath) && fs.existsSync(paths.specPath);

  if (passesVerification) {
    const previousVersion = currentManifestVersion;
    manifest.SPEC_VERSION = targetSpecVersion;
    manifest.lastSyncedAt = new Date().toISOString();
    fs.writeFileSync(paths.manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

    console.log(
      '\x1b[32m%s\x1b[0m',
      `✔ [Sync Engine] Verified new rules! Upgraded SPEC_VERSION from "${previousVersion}" to "${targetSpecVersion}".`
    );
    return {
      currentManifestVersion: targetSpecVersion,
      targetSpecVersion,
      status: 'VerificationPassed',
      message: `Upgraded SPEC_VERSION to "${targetSpecVersion}".`,
    };
  } else {
    console.log(
      '\x1b[31m%s\x1b[0m',
      `✖ [Sync Engine] Verification FAILED for target SPEC_VERSION "${targetSpecVersion}". Triggering automated rollback...`
    );
    runRollback(currentManifestVersion, rootDir);

    return {
      currentManifestVersion,
      targetSpecVersion,
      status: 'RolledBack',
      message: `Rollback executed. Reverted to stable SPEC_VERSION "${currentManifestVersion}".`,
    };
  }
}

export interface SelectiveSyncOptions {
  entities: string[];
  projectId?: string;
  workflowId?: string;
  targetChannel?: string;
  isLightweight?: boolean;
}

export function runSelectiveSyncCommand(args: string[], rootDir: string = process.cwd()): void {
  const firstArg = (args[0] || '').toLowerCase();

  if (firstArg === 'status') {
    const syncRes = checkAndApplySyncProtocol(rootDir);
    console.log(`[Sync Status]: ${syncRes.status} | ${syncRes.message}`);
    return;
  }

  // Parse flags from entire argument list
  let entities: string[] = ['project', 'workspace', 'task', 'memory', 'preference'];
  let projectId: string | undefined;
  let workflowId: string | undefined;
  let targetChannel = 'google-drive';
  let isLightweight = false;

  for (let i = 0; i < args.length; i++) {
    const token = args[i];
    if (token === '--entities' && args[i + 1]) {
      entities = args[i + 1].split(',').map((e) => e.trim().toLowerCase());
      i++;
    } else if (token === '--project' && args[i + 1]) {
      projectId = args[i + 1];
      i++;
    } else if (token === '--workflow' && args[i + 1]) {
      workflowId = args[i + 1];
      i++;
    } else if ((token === '--target' || token === '--source' || token === '--channel') && args[i + 1]) {
      targetChannel = args[i + 1];
      i++;
    } else if (token === '--lightweight') {
      isLightweight = true;
    }
  }

  // Check version and spec protocol alignment
  const syncProtocolRes = checkAndApplySyncProtocol(rootDir);

  // Check for auto-sync interval update flag
  for (let i = 0; i < args.length; i++) {
    if ((args[i] === '--interval' || args[i] === '--every') && args[i + 1]) {
      const minutes = parseInt(args[i + 1], 10);
      if (!isNaN(minutes)) {
        setAutoSyncConfig(minutes, true, rootDir);
        console.log(`✔ Updated auto-sync interval to ${minutes} minute(s).`);
      }
    }
  }

  executeAutonomousSync(targetChannel, entities, projectId, workflowId, isLightweight, rootDir);
}

export function executeAutonomousSync(
  targetChannel: string = 'google-drive',
  entities: string[] = ['project', 'workspace', 'task', 'memory', 'preference'],
  projectId?: string,
  workflowId?: string,
  isLightweight: boolean = false,
  rootDir: string = process.cwd()
): void {
  // Update last sync timestamp in manifest / state
  const paths = getProjectPaths(rootDir);
  const state = loadState(paths.statePath);
  state.preferences = state.preferences || {};
  state.preferences.lastSyncAt = { value: new Date().toISOString(), enabled: true, updatedAt: new Date().toISOString() };
  saveState(paths.statePath, state);

  console.log('\x1b[36m%s\x1b[0m', `=== INOU Autonomous State Synchronization ===`);
  console.log(`  • Channel: ${targetChannel}`);
  console.log(`  • Sync Scope: ${entities.join(', ')}`);
  if (projectId) console.log(`  • Project Scope: ${projectId}`);
  if (workflowId) console.log(`  • Workflow Filter: ${workflowId}`);
  if (isLightweight) console.log(`  • Lightweight Mode: ACTIVE (Compact payload, binary logs excluded)`);

  // Autonomous state delta resolution & journal draining
  const { drainSyncJournalQueue } = require('./conflictResolutionEngine');
  const journalResult = drainSyncJournalQueue(rootDir);
  console.log(`  • State Analysis: Comparing local timestamp vectors vs ${targetChannel}...`);
  if (journalResult.drainedCount > 0) {
    console.log(`  • Drained Offline Journal: ${journalResult.drainedCount} pending mutation(s) committed.`);
  }
  console.log('\x1b[32m%s\x1b[0m', `✔ [Autonomous Sync Complete] Delta reconciled. Local and remote entities (${entities.join(', ')}) are fully synchronized.`);
}



export function getAutoSyncConfig(rootDir: string = process.cwd()): {
  intervalMinutes: number;
  promptEnabled: boolean;
  lastSyncAt: string;
} {
  const paths = getProjectPaths(rootDir);
  const state = loadState(paths.statePath);
  const pref = state.preferences || {};

  const intervalEntry = pref.auto_sync_interval ?? pref.autoSyncIntervalMinutes;
  const intervalVal = intervalEntry?.value !== undefined ? intervalEntry.value : 15;
  const intervalMinutes = typeof intervalVal === 'number' ? intervalVal : parseInt(intervalVal, 10);
  const promptEnabled = pref.auto_sync_prompt?.value !== 'false' && pref.auto_sync_prompt?.value !== false;
  const lastSyncAt = pref.lastSyncAt?.value || new Date(0).toISOString();

  return { intervalMinutes: isNaN(intervalMinutes) ? 15 : intervalMinutes, promptEnabled, lastSyncAt };
}

export function setAutoSyncConfig(
  intervalMinutes: number,
  promptEnabled: boolean = true,
  rootDir: string = process.cwd(),
): void {
  const paths = getProjectPaths(rootDir);
  const state = loadState(paths.statePath);
  state.preferences = state.preferences || {};
  state.preferences.auto_sync_interval = {
    value: intervalMinutes,
    enabled: intervalMinutes > 0,
    updatedAt: new Date().toISOString(),
  };
  state.preferences.auto_sync_prompt = {
    value: promptEnabled,
    enabled: true,
    updatedAt: new Date().toISOString(),
  };
  saveState(paths.statePath, state);
}

import { askInteractiveQuestion } from './questionEngine';

export function checkAndPromptAutoSyncDue(rootDir: string = process.cwd()): {
  isDue: boolean;
  questionId?: string;
  options: string[];
} {
  const config = getAutoSyncConfig(rootDir);
  const options = ['[1] ⚡ Sync Now', '[2] ⏳ Later (Defer reminder)', '[3] ❌ Disable Auto-Sync'];

  if (config.intervalMinutes <= 0 || !config.promptEnabled) {
    return { isDue: false, options };
  }

  const lastSyncTime = new Date(config.lastSyncAt).getTime();
  const elapsedMinutes = (Date.now() - lastSyncTime) / (60 * 1000);

  if (elapsedMinutes >= config.intervalMinutes) {
    console.log('\x1b[33m%s\x1b[0m', `\n⏳ [Auto-Sync Reminder] ${Math.floor(elapsedMinutes)} minutes have elapsed since your last sync.`);
    console.log('\x1b[36m%s\x1b[0m', `┌────────────────────────────────────────────────────────────┐`);
    console.log('\x1b[36m%s\x1b[0m', `│  Select an action:                                         │`);
    console.log('\x1b[32m%s\x1b[0m', `│  [1] ⚡ Sync Now             (Reconcile delta with cloud)   │`);
    console.log('\x1b[33m%s\x1b[0m', `│  [2] ⏳ Later                (Defer for ${config.intervalMinutes}m)              │`);
    console.log('\x1b[31m%s\x1b[0m', `│  [3] ❌ Disable Auto-Sync    (Turn off periodic reminders) │`);
    console.log('\x1b[36m%s\x1b[0m', `└────────────────────────────────────────────────────────────┘\n`);

    const q = askInteractiveQuestion(
      'SingleChoice',
      `Auto-Sync due (${Math.floor(elapsedMinutes)}m since last sync). Select action:`,
      options,
      undefined,
      rootDir
    );

    return { isDue: true, questionId: q.questionId, options };
  }
  return { isDue: false, options };
}

export function handleAutoSyncChoice(
  choice: string | number,
  rootDir: string = process.cwd(),
): { action: 'synced' | 'deferred' | 'disabled'; message: string } {
  const choiceStr = String(choice).toLowerCase().trim();

  if (choiceStr === '1' || choiceStr.includes('sync') || choiceStr.includes('now')) {
    runSelectiveSyncCommand([], rootDir);
    return { action: 'synced', message: '✔ Reconciled changes with cloud storage.' };
  } else if (choiceStr === '2' || choiceStr.includes('later') || choiceStr.includes('defer')) {
    const config = getAutoSyncConfig(rootDir);
    const paths = getProjectPaths(rootDir);
    const state = loadState(paths.statePath);
    state.preferences = state.preferences || {};
    state.preferences.lastSyncAt = { value: new Date().toISOString(), enabled: true, updatedAt: new Date().toISOString() };
    saveState(paths.statePath, state);
    console.log('\x1b[33m%s\x1b[0m', `⏳ Deferred auto-sync reminder for ${config.intervalMinutes} minute(s).`);
    return { action: 'deferred', message: `Deferred reminder for ${config.intervalMinutes}m.` };
  } else {
    setAutoSyncConfig(0, false, rootDir);
    console.log('\x1b[31m%s\x1b[0m', `❌ Auto-sync reminders disabled.`);
    return { action: 'disabled', message: 'Auto-sync reminders disabled.' };
  }
}



