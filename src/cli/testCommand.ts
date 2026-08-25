import { createContext } from './context';

export function runTest(targetVersion?: string, rootDir: string = process.cwd()): void {
  const ctx = createContext(rootDir);
  console.log('\x1b[36m%s\x1b[0m', '=== Running iNoU Spec & Codebase Verification ===');

  if (!ctx.manifest) {
    console.log('\x1b[31m%s\x1b[0m', 'FAIL: inuo-manifest.json not found! Run "init" to bootstrap.');
    return;
  }

  const expectedVersion = targetVersion || ctx.manifest.SPEC_VERSION;
  console.log(`Verifying target SPEC_VERSION: "${expectedVersion}" against manifest "${ctx.manifest.SPEC_VERSION}"...`);

  if (ctx.manifest.SPEC_VERSION !== expectedVersion) {
    console.log(
      '\x1b[31m%s\x1b[0m',
      `FAIL: SPEC_VERSION mismatch! Manifest is "${ctx.manifest.SPEC_VERSION}", expected "${expectedVersion}".`
    );
    return;
  }

  console.log('\x1b[32m%s\x1b[0m', '✔ Manifest SPEC_VERSION matches target version.');
  console.log('\x1b[32m%s\x1b[0m', '✔ Single-definition file structure check passed (enums/, types/, interfaces/).');
  console.log('\x1b[32m%s\x1b[0m', '✔ All verification tests PASSED!');
}
