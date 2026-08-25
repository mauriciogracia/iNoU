import { createContext } from './context';
import { recalculateAndSyncVersion } from './versionEngine';

export function runStatus(rootDir: string = process.cwd()): void {
  recalculateAndSyncVersion(rootDir);
  const ctx = createContext(rootDir);

  console.log('\x1b[36m%s\x1b[0m', '=== iNoU Platform Status ===');

  if (ctx.manifest) {
    console.log(`\x1b[1mSPEC_VERSION:\x1b[0m ${ctx.manifest.SPEC_VERSION}`);
    console.log(`\x1b[1mCLI Version:\x1b[0m  ${ctx.manifest.cliVersion}`);
    console.log(`\x1b[1mLast Synced:\x1b[0m  ${ctx.manifest.lastSyncedAt}`);
    console.log(`\x1b[1mMapped Verbs:\x1b[0m ${ctx.manifest.moduleMappings.length} module pairs`);
  } else {
    console.log('\x1b[31m%s\x1b[0m', '✖ Manifest not found! Run "init" to bootstrap environment.');
  }

  console.log(`\x1b[1mActive Needs:\x1b[0m  ${ctx.needs.length}`);
  console.log(`\x1b[1mActive Offers:\x1b[0m ${ctx.offers.length}`);
  console.log(`\x1b[1mValid Matches:\x1b[0m ${ctx.matches.length}`);
}
