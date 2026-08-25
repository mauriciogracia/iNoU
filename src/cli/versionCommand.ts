import { calculateInuoVersion } from './versionEngine';

export function runVersionCommand(args: string[], rootDir: string = process.cwd()): void {
  const ver = calculateInuoVersion(rootDir);

  console.log('\x1b[36m%s\x1b[0m', '=== iNoU Canonical Versioning System ===\n');
  console.log(`Full Version String:  \x1b[1m\x1b[32mv${ver.fullVersionString}\x1b[0m`);
  console.log(`  └─ \x1b[33mDeployed Production %:\x1b[0m     ${ver.deployedPercentage}%`);
  console.log(`  └─ \x1b[33mSpec Revision Index:\x1b[0m       ${ver.specRevisionIndex} (Revision ${ver.specRevisionIndex})`);
  console.log(`  └─ \x1b[33mImplementation Progress %:\x1b[0m ${ver.implementationPercentage}%`);
  console.log(`\nModel Structure: Deployed.SpecRevision.Implementation`);
}
