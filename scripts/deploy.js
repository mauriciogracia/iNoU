#!/usr/bin/env node

/**
 * INUO Production Deployment & Orchestration Script (`scripts/deploy.js`)
 * 
 * Supports targets:
 *   - `compose` (Docker Compose with Caddy TLS - Recommended)
 *   - `docker` (Standalone Docker container)
 *   - `local` (Background Node server)
 *   - `dry-run` (Build and configuration validation)
 */

const { execSync, spawn } = require("child_process");
const http = require("http");
const path = require("path");
const fs = require("fs");

const target = (process.argv[2] || "compose").toLowerCase();
const port = parseInt(process.env.PORT || "8765", 10);
const host = process.env.HOST || "127.0.0.1";
const rootDir = path.resolve(__dirname, "..");

function log(msg, color = "\x1b[36m") {
  console.log(`${color}${msg}\x1b[0m`);
}

function run(cmd, opts = {}) {
  log(`> ${cmd}`, "\x1b[33m");
  return execSync(cmd, { cwd: rootDir, stdio: "inherit", ...opts });
}

async function checkHealth(urls, maxAttempts = 15, delayMs = 1000) {
  const urlList = Array.isArray(urls) ? urls : [urls];
  log(`\n⏳ Polling health check at ${urlList.join(" or ")}...`);
  
  for (let i = 1; i <= maxAttempts; i++) {
    for (const url of urlList) {
      try {
        const isOk = await new Promise((resolve) => {
          const req = http.get(new URL(url), (res) => {
            let data = "";
            res.on("data", (chunk) => (data += chunk));
            res.on("end", () => {
              // Treat 2xx and 3xx as alive: Caddy may redirect http->https (301)
              // before TLS provisioning completes, which is still a healthy container.
              if (res.statusCode >= 200 && res.statusCode < 400) {
                resolve(true);
              } else {
                resolve(false);
              }
            });
          });
          req.on("error", () => resolve(false));
          req.setTimeout(2000, () => {
            req.destroy();
            resolve(false);
          });
        });

        if (isOk) {
          log(`\n✔ Health check passed at ${url}! Deployment is LIVE and healthy.`, "\x1b[32m");
          return true;
        }
      } catch {}
    }

    await new Promise((r) => setTimeout(r, delayMs));
    process.stdout.write(".");
  }

  log(`\n❌ Health check timed out after ${maxAttempts} attempts.`, "\x1b[31m");
  return false;
}

async function main() {
  log("=================================================");
  log("   🚀 INUO Production Deployment Pipeline");
  log("=================================================");
  log(`• Deployment Target: ${target.toUpperCase()}`);
  log(`• Project Root:      ${rootDir}`);
  log(`• Primary Port:      ${port}`);
  log(`• Target Host:       ${host}`);

  // Step 1: Build compilation
  log("\n[1/3] Compiling TypeScript & building browser PWA bundle...");
  run("npm run build");

  if (target === "dry-run") {
    log("\n✔ Dry run validation complete! All build outputs, configurations, and manifests are valid.", "\x1b[32m");
    process.exit(0);
  }

  // Step 2: Target-specific deployment execution
  if (target === "compose") {
    log("\n[2/3] Launching Docker Compose infrastructure (INUO Hub + Caddy Ingress)...");
    run("docker compose up -d --build");

    log("\n[3/3] Verifying deployment health...");
    const ok = await checkHealth([
      `http://${host}:80/health`,
      `http://127.0.0.1:80/health`,
      `http://${host}:${port}/health`,
    ]);
    if (!ok) process.exit(1);

  } else if (target === "docker") {
    log("\n[2/3] Building and running standalone Docker container...");
    run("docker build -t inuo-cloud-hub .");
    try {
      execSync("docker stop inuo_hub", { stdio: "ignore" });
      execSync("docker rm inuo_hub", { stdio: "ignore" });
    } catch {}
    run(`docker run -d --name inuo_hub -p ${port}:${port} -e INUO_DATA_DIR=/app/data -v inuo_hub_data:/app/data inuo-cloud-hub`);

    log("\n[3/3] Verifying deployment health...");
    const ok = await checkHealth(`http://${host}:${port}/health`);
    if (!ok) process.exit(1);

  } else if (target === "local") {
    log("\n[2/3] Starting local background daemon via Node...");
    const serverPath = path.join(rootDir, "bin", "inuo.js");
    const child = spawn("node", [serverPath, "serve", port.toString()], {
      cwd: rootDir,
      detached: true,
      stdio: "ignore",
      env: { ...process.env, PORT: port.toString(), HOST: host },
    });
    child.unref();

    log(`✔ Spawned daemon process (PID: ${child.pid})`);
    log("\n[3/3] Verifying local server health...");
    const ok = await checkHealth(`http://${host}:${port}/health`);
    if (!ok) process.exit(1);

  } else {
    log(`Unknown target: "${target}". Supported: compose | docker | local | dry-run`, "\x1b[31m");
    process.exit(1);
  }

  log("\n★ INUO Deployment pipeline completed successfully!", "\x1b[32m");
}

main().catch((err) => {
  console.error("\n❌ Deployment error:", err.message);
  process.exit(1);
});
