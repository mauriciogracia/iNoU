import { startInteractiveShell, dispatchSingleCommand } from "./shell";
import { ApiServer } from "../api";
import { calculateInuoVersion } from "./versionEngine";

const args = process.argv.slice(2);
const rootDir = process.cwd();

if (["serve", "api", "hub", "server", "web", "ui"].includes(args[0]?.toLowerCase())) {
  const port = parseInt(args[1] || process.env.PORT || "8765", 10);
  const host = process.env.HOST || "0.0.0.0";
  const apiServer = new ApiServer(port, host, rootDir);
  const inuoVer = calculateInuoVersion(rootDir);

  apiServer.start().then(({ port: activePort, host: activeHost, url }) => {
    console.log(
      "\x1b[32m%s\x1b[0m",
      `\n🚀 [INUO Cloud Relay Hub & API Gateway] Live at ${url} (binding ${activeHost}:${activePort})`
    );
    console.log(
      "\x1b[36m%s\x1b[0m",
      `   Version: v${inuoVer.fullVersionString} | REST API: ${url}/api/v1/* | SSE: ${url}/api/stream | Health: ${url}/health\n`
    );

    const shutdown = () => {
      apiServer.stop().finally(() => process.exit(0));
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  }).catch((err) => {
    console.error("\x1b[31m[INUO Server Error]\x1b[0m", err.message);
    process.exit(1);
  });
} else if (args.length === 0) {
  startInteractiveShell(rootDir);
} else {
  void dispatchSingleCommand(args, rootDir);
}
