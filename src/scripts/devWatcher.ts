import { spawn, ChildProcess, execSync } from "child_process";
import fs from "fs";
import path from "path";
import { TOOL_NAME } from "../cli/brand";

// args after the script name are forwarded to the child process (e.g. "web 3000")
const childArgs = process.argv.slice(2);

let appProcess: ChildProcess | null = null;
let isBuilding = false;

// compiled output lives in dist/scripts/ → root is 2 levels up
const rootDir = path.join(__dirname, "../..");
const srcDir = path.join(rootDir, "src");
const browserDir = path.join(rootDir, "browser");

const tscBin = path.join(rootDir, "node_modules", "typescript", "bin", "tsc");

function getSystemVersion(): string {
  try {
    const manifestPath = path.join(rootDir, "inuo-manifest.json");
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
        SPEC_VERSION?: string;
      };
      if (manifest.SPEC_VERSION) return manifest.SPEC_VERSION;
    }
  } catch {
    /* fall through to default */
  }
  return "00.03.70";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function killProcess(proc: ChildProcess | null): Promise<void> {
  return new Promise((resolve) => {
    if (!proc || proc.killed || proc.exitCode !== null) {
      resolve();
      return;
    }

    let resolved = false;
    const finish = () => {
      if (!resolved) {
        resolved = true;
        resolve();
      }
    };

    const timer = setTimeout(finish, 1500);

    proc.once("close", () => {
      clearTimeout(timer);
      finish();
    });

    if (process.platform === "win32" && proc.pid) {
      try {
        execSync(`taskkill /pid ${proc.pid} /T /F`, { stdio: "ignore" });
      } catch {
        /* already dead */
      }
      finish();
    } else {
      try {
        proc.kill("SIGTERM");
      } catch {
        /* already dead */
      }
    }
  });
}

async function startApp(): Promise<void> {
  if (appProcess) {
    const oldProc = appProcess;
    appProcess = null;
    await killProcess(oldProc);
    // Allow OS to release socket binding
    await sleep(250);
  }
  const version = getSystemVersion();
  console.log(
    "\x1b[36m%s\x1b[0m",
    `\n⚡ [${TOOL_NAME} Live-Reload] Reloading latest ${TOOL_NAME} version (v${version})...\n`,
  );
  appProcess = spawn(
    process.execPath,
    [path.join(rootDir, "bin", "inuo.js"), ...childArgs],
    {
      cwd: rootDir,
      stdio: "inherit",
    },
  );
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function triggerRebuild(): void {
  if (isBuilding) return;
  isBuilding = true;

  const version = getSystemVersion();
  console.log(
    "\x1b[33m%s\x1b[0m",
    `\n🔄 [${TOOL_NAME} Dev Server] Source change detected! Recompiling & reloading ${TOOL_NAME} (v${version})...`,
  );
  const build = spawn(process.execPath, [tscBin], {
    cwd: rootDir,
    stdio: "ignore",
  });

  build.on("close", (code: number | null) => {
    if (code !== 0) {
      isBuilding = false;
      console.log(
        "\x1b[31m%s\x1b[0m",
        `\u274c [${TOOL_NAME} Dev Server] TypeScript Compilation Error! Fix error to trigger auto-reload...`,
      );
      return;
    }
    // Also rebuild browser assets after the main build succeeds
    const browserBuild = spawn(
      process.execPath,
      [tscBin, "--project", "tsconfig.browser.json"],
      {
        cwd: rootDir,
        stdio: "ignore",
      },
    );
    browserBuild.on("close", () => {
      isBuilding = false;
      void startApp();
    });
  });
}

function watchDirectory(dir: string): void {
  try {
    fs.watch(
      dir,
      { recursive: true },
      (_event: string, filename: string | null) => {
        if (
          filename &&
          (filename.endsWith(".ts") || filename.endsWith(".json"))
        ) {
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(triggerRebuild, 150);
        }
      },
    );
  } catch (err: unknown) {
    console.log(`[Watch Error] ${(err as Error).message}`);
  }
}

const currentVersion = getSystemVersion();
console.log(
  "\x1b[32m%s\x1b[0m",
  `🚀 [${TOOL_NAME} Dev Server] Live-Reload Active for v${currentVersion} (watching src/**/*.ts)...`,
);
console.log(
  "\x1b[90m%s\x1b[0m",
  `Any code change will automatically recompile and reload the latest ${TOOL_NAME} version.\n`,
);

const initialBuild = spawn(process.execPath, [tscBin], {
  cwd: rootDir,
  stdio: "inherit",
});
initialBuild.on("close", (code: number | null) => {
  if (code === 0) {
    void startApp();
    watchDirectory(srcDir);
    watchDirectory(browserDir);
  }
});
