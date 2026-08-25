import fs from "fs";
import path from "path";
import { getProjectPaths, loadState } from "./context";
import { InuoVersionSpec } from "../interfaces/InuoVersionSpec";

export function formatInuoVersionString(
  deployedPercentage: number,
  specRevisionIndex: number,
  implementationPercentage: number,
): string {
  const sanitize = (n: number) =>
    String(Math.max(0, Math.min(100, Math.floor(n))));
  return `${sanitize(deployedPercentage)}.${sanitize(specRevisionIndex)}.${sanitize(implementationPercentage)}`;
}

export function parseInuoVersionString(versionStr: string): InuoVersionSpec {
  const parts = versionStr.split(".");
  const deployedPercentage = parseInt(parts[0] || "0", 10);
  const specRevisionIndex = parseInt(parts[1] || "0", 10);
  const implementationPercentage = parseInt(parts[2] || "0", 10);

  return {
    deployedPercentage,
    specRevisionIndex,
    implementationPercentage,
    fullVersionString: formatInuoVersionString(
      deployedPercentage,
      specRevisionIndex,
      implementationPercentage,
    ),
    calculatedAt: new Date().toISOString(),
  };
}

export function calculateInuoVersion(
  rootDir: string = process.cwd(),
): InuoVersionSpec {
  const paths = getProjectPaths(rootDir);

  // Deployed percentage (0% - nothing deployed to Firebase/cloud yet)
  const deployedPercentage = 0;

  // Spec revision 03 introduces adaptive memory and training governance.
  const specRevisionIndex = 3;

  // Implementation audit: ~75% of total master specifications reached.
  const implementationPercentage = 75;

  const fullVersionString = formatInuoVersionString(
    deployedPercentage,
    specRevisionIndex,
    implementationPercentage,
  );

  return {
    deployedPercentage,
    specRevisionIndex,
    implementationPercentage,
    fullVersionString,
    calculatedAt: new Date().toISOString(),
  };
}

/**
 * Recalculates iNoU (Deployed.SpecRevision.Implementation) version and automatically synchronizes
 * package.json, inuo-manifest.json, and INUO_SPEC.md from a single source of truth.
 */
export function recalculateAndSyncVersion(
  rootDir: string = process.cwd(),
): InuoVersionSpec {
  const ver = calculateInuoVersion(rootDir);
  const fullVer = ver.fullVersionString;

  // 1. Synchronize package.json
  const pkgPath = path.join(rootDir, "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const rawPkg = fs.readFileSync(pkgPath, "utf8");
      const pkg = JSON.parse(rawPkg);
      if (pkg.version !== fullVer) {
        pkg.version = fullVer;
        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
      }
    } catch {
      // Ignore write error if unparseable
    }
  }

  // 2. Synchronize inuo-manifest.json
  const manifestPath = path.join(rootDir, "inuo-manifest.json");
  if (fs.existsSync(manifestPath)) {
    try {
      const rawMan = fs.readFileSync(manifestPath, "utf8");
      const manifest = JSON.parse(rawMan);
      if (
        manifest.SPEC_VERSION !== fullVer ||
        manifest.cliVersion !== fullVer
      ) {
        manifest.SPEC_VERSION = fullVer;
        manifest.cliVersion = fullVer;
        manifest.lastSyncedAt = new Date().toISOString();
        fs.writeFileSync(
          manifestPath,
          JSON.stringify(manifest, null, 2) + "\n",
        );
      }
    } catch {
      // Ignore write error
    }
  }

  // 3. Synchronize specification files (tech-specs/main-specs-goals.md, docs/main-specs-goals.md, INUO_SPEC.md)
  const specFiles = [
    path.join("tech-specs", "main-specs-goals.md"),
    path.join("docs", "main-specs-goals.md"),
    "main-specs-goals.md",
    "INUO_SPEC.md",
  ];
  for (const fileName of specFiles) {
    const specPath = path.join(rootDir, fileName);
    if (fs.existsSync(specPath)) {
      try {
        let specText = fs.readFileSync(specPath, "utf8");
        if (!specText.includes(`"SPEC_VERSION": "${fullVer}"`)) {
          specText = specText.replace(
            /\* \*\*`SPEC_VERSION`\*\*: ".*?"/,
            `* **\`SPEC_VERSION\`**: "${fullVer}"`,
          );
          fs.writeFileSync(specPath, specText);
        }
      } catch {
        // Ignore write error
      }
    }
  }

  return ver;
}
