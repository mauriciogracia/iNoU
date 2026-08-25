import { getProjectPaths, loadState, saveState } from './context';
import { MasterMindSyncProgress } from '../interfaces/MasterMindSyncProgress';
import { askInteractiveQuestion } from './questionEngine';

export function initiateProgressiveMasterMindSync(
  payloadSizeBytes: number = 500 * 1024 * 1024, // 500MB default
  currentSpeedMbps: number = 2, // 2 Mbps default connection
  rootDir: string = process.cwd()
): MasterMindSyncProgress {
  const paths = getProjectPaths(rootDir);
  const state = loadState(paths.statePath);

  // Calculate estimated download duration in minutes
  // (Bytes * 8 = bits) / (Mbps * 1,000,000) / 60 seconds = minutes
  const totalBits = payloadSizeBytes * 8;
  const bitsPerSecond = currentSpeedMbps * 1_000_000;
  const estimatedSeconds = totalBits / (bitsPerSecond || 1);
  const estimatedDurationMinutes = parseFloat((estimatedSeconds / 60).toFixed(1));

  const syncId = `sync_${Date.now()}`;
  const requiresUserAuthorization = estimatedDurationMinutes > 15;

  let status: 'PendingAuthorization' | 'Syncing' | 'Completed' | 'Deferred' = 'Syncing';
  let isUserAuthorized = false;

  if (requiresUserAuthorization) {
    status = 'PendingAuthorization';
  }

  const syncProgress: MasterMindSyncProgress = {
    syncId,
    essentialSkillsDownloaded: true, // Tier 0 essential skills always available immediately
    totalPayloadSizeBytes: payloadSizeBytes,
    estimatedSpeedMbps: currentSpeedMbps,
    estimatedDurationMinutes,
    requiresUserAuthorization,
    isUserAuthorized,
    status,
    startedAt: new Date().toISOString(),
  };

  if (!(state as any).progressiveSyncs) (state as any).progressiveSyncs = [];
  (state as any).progressiveSyncs.push(syncProgress);
  saveState(paths.statePath, state);

  if (requiresUserAuthorization) {
    askInteractiveQuestion(
      'SingleChoice',
      `Master Mind sync payload size is ${(payloadSizeBytes / (1024 * 1024)).toFixed(0)}MB (Est. ${estimatedDurationMinutes} mins at ${currentSpeedMbps} Mbps). How would you like to proceed?`,
      [
        'Download essential skills only now (Tier 0 offline basic operations)',
        'Authorize full download in background',
        'Defer download until connected to Wi-Fi',
      ],
      syncId,
      rootDir
    );
  }

  console.log('\x1b[36m%s\x1b[0m', '=== iNoU Progressive Master Mind Sync Engine ===\n');
  console.log(`✔ [Tier 0 Essential Skills]: Downloaded immediately for offline basic operations.`);
  console.log(`  Sync ID:                     ${syncId}`);
  console.log(`  Payload Size:                ${(payloadSizeBytes / (1024 * 1024)).toFixed(1)} MB`);
  console.log(`  Network Speed:               ${currentSpeedMbps} Mbps`);
  console.log(`  Estimated Duration:          ${estimatedDurationMinutes} minutes`);
  console.log(`  Status:                      ${status === 'PendingAuthorization' ? '\x1b[33mPending Authorization (>15 mins)\x1b[0m' : '\x1b[32mSyncing in background\x1b[0m'}`);

  return syncProgress;
}

export function authorizeProgressiveSync(
  syncId: string,
  allow: boolean,
  rootDir: string = process.cwd()
): MasterMindSyncProgress {
  const paths = getProjectPaths(rootDir);
  const state = loadState(paths.statePath);
  const syncs: MasterMindSyncProgress[] = (state as any).progressiveSyncs || [];

  const sync = syncs.find((s) => s.syncId.toLowerCase() === syncId.toLowerCase());
  if (!sync) {
    throw new Error(`Sync session "${syncId}" not found.`);
  }

  if (allow) {
    sync.isUserAuthorized = true;
    sync.status = 'Syncing';
    console.log('\x1b[32m%s\x1b[0m', `✔ [User Authorized Download] Granted background full sync for session [${syncId}].`);
  } else {
    sync.isUserAuthorized = false;
    sync.status = 'Deferred';
    console.log('\x1b[33m%s\x1b[0m', `⚠ [Sync Deferred] Full sync deferred. Tier 0 essential skills active for offline operations.`);
  }

  saveState(paths.statePath, state);
  return sync;
}
