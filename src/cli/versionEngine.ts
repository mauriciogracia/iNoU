import fs from "fs";
import path from "path";
import { getProjectPaths, loadState } from "./context";
import { InuoVersionSpec } from "../interfaces/InuoVersionSpec";

export function formatInuoVersionString(
  major: number,
  minor: number,
  iteration: number,
): string {
  const sanitize = (n: number) =>
    String(Math.max(0, Math.floor(n)));
  return `${sanitize(major)}.${sanitize(minor)}.${sanitize(iteration)}`;
}

export function parseInuoVersionString(versionStr: string): InuoVersionSpec {
  const parts = versionStr.split(".");
  const majorVersion = parseInt(parts[0] || "0", 10);
  const minorMilestone = parseInt(parts[1] || "0", 10);
  const buildIteration = parseInt(parts[2] || "0", 10);

  return {
    majorVersion,
    minorMilestone,
    buildIteration,
    deployedPercentage: majorVersion,
    specRevisionIndex: minorMilestone,
    implementationPercentage: buildIteration,
    fullVersionString: formatInuoVersionString(
      majorVersion,
      minorMilestone,
      buildIteration,
    ),
    calculatedAt: new Date().toISOString(),
  };
}

export function calculateInuoVersion(
  rootDir: string = process.cwd(),
): InuoVersionSpec {
  const paths = getProjectPaths(rootDir);

  // Major platform generation: 0 (Pre-cloud Alpha/Beta)
  const majorVersion = 0;

  // Milestone: 4 (Docker Hub, Production Ingress & Multi-Engine Orchestration)
  const minorMilestone = 4;

  // Continuous iteration / build counter
  const buildIteration = 76;

  const fullVersionString = formatInuoVersionString(
    majorVersion,
    minorMilestone,
    buildIteration,
  );

  return {
    majorVersion,
    minorMilestone,
    buildIteration,
    deployedPercentage: majorVersion,
    specRevisionIndex: minorMilestone,
    implementationPercentage: buildIteration,
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
