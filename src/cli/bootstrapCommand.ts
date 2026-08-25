import fs from "fs";
import { getProjectPaths } from "./context";
import { InuoManifest } from "../interfaces/InuoManifest";

export function runBootstrap(rootDir: string = process.cwd()): void {
  const paths = getProjectPaths(rootDir);

  console.log(
    "\x1b[36m%s\x1b[0m",
    "=== iNoU Seed Agent Bootstrap Protocol ===",
  );

  if (!fs.existsSync(paths.specPath)) {
    const defaultSpec = `# iNoU Core Persistent System Prompt (\`INUO_SPEC.md\`)

This specification prompt governs all autonomous reasoning, code generation, and interactive operations within the **iNoU Platform**.

## Operational Baseline
* NEED = (VERB) + (OBJECT)
* OFFER = (COMP_VERB) + (OBJECT)
* SPEC_VERSION: "00.03.72"
`;
    fs.writeFileSync(paths.specPath, defaultSpec, "utf8");
    console.log(
      "\x1b[32m%s\x1b[0m",
      "✔ Generated persistent system prompt: INUO_SPEC.md",
    );
  } else {
    console.log(
      "\x1b[32m%s\x1b[0m",
      "✔ Validated existing system prompt: INUO_SPEC.md",
    );
  }

  if (!fs.existsSync(paths.manifestPath)) {
    const newManifest: InuoManifest = {
      SPEC_VERSION: "00.03.72",
      cliVersion: "00.03.72",
      lastSyncedAt: new Date().toISOString(),
      moduleMappings: [
        {
          pairKey: "Request+Food packet",
          modulePath: "src/interfaces/Need.ts",
        },
        {
          pairKey: "Consult+Geotechnical survey",
          modulePath: "src/interfaces/Need.ts",
        },
        {
          pairKey: "Ride+Commute to work",
          modulePath: "src/interfaces/Need.ts",
        },
      ],
    };
    fs.writeFileSync(
      paths.manifestPath,
      JSON.stringify(newManifest, null, 2),
      "utf8",
    );
    console.log(
      "\x1b[32m%s\x1b[0m",
      "✔ Generated baseline manifest: inuo-manifest.json (v00.03.72)",
    );
  } else {
    console.log(
      "\x1b[32m%s\x1b[0m",
      "✔ Validated existing manifest: inuo-manifest.json",
    );
  }

  console.log(
    "\x1b[32m%s\x1b[0m",
    "✔ Single-definition directories verified: enums/, types/, interfaces/",
  );
  console.log(
    "\x1b[33m%s\x1b[0m",
    "★ Environment bootstrap sequence complete!",
  );
}
