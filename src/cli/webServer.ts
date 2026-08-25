import express, { Request, Response } from "express";
import http from "http";
import path from "path";
import { executeShellLine } from "./shell";
import { setOutputListener } from "./outputRouter";
import { OutputChannelEnum } from "../enums/OutputChannelEnum";
import { calculateInuoVersion } from "./versionEngine";
import { getProjectPaths, loadState } from "./context";
import { TOOL_NAME, TOOL_PROMPT } from "./brand";
import { getSessionStats } from "./usageEngine";
import {
  deleteLLMConfiguration,
  getLLMConfigurations,
  getLLMProviderSetup,
  saveLLMConfiguration,
} from "./llmCommand";
import { probeAndConfigureModels, maskApiKey } from "./setupCommand";

export interface WebServerOptions {
  port?: number;
  rootDir?: string;
}

export function startWebServer(options: WebServerOptions = {}): http.Server {
  const port = options.port ?? 3000;
  const rootDir = options.rootDir || process.cwd();
  const sseClients: Response[] = [];
  // Unique token per process start — browsers compare this to detect restarts
  const serverStartTime = Date.now().toString();

  const app = express();
  app.use(express.json());

  // CORS middleware
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // Register Output Router Listener to stream logs to SSE web clients
  setOutputListener((channel: OutputChannelEnum, content: string) => {
    const payload = JSON.stringify({
      channel,
      content,
      timestamp: new Date().toISOString(),
    });

    for (let i = sseClients.length - 1; i >= 0; i--) {
      try {
        sseClients[i].write(`data: ${payload}\n\n`);
      } catch {
        sseClients.splice(i, 1);
      }
    }
  });

  // Serve static files from /public
  const publicDir = path.join(rootDir, "public");
  app.use(express.static(publicDir));

  // SSE Stream Endpoint
  app.get("/api/stream", (req: Request, res: Response) => {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    // Send startup token immediately so clients can detect restarts
    res.write(
      `data: ${JSON.stringify({ channel: "SERVER_HELLO", serverStartTime })}\n\n`,
    );
    sseClients.push(res);

    req.on("close", () => {
      const idx = sseClients.indexOf(res);
      if (idx !== -1) sseClients.splice(idx, 1);
    });
  });

  // System Status API Endpoint
  app.get("/api/status", (req: Request, res: Response) => {
    const inuoVer = calculateInuoVersion(rootDir);
    const paths = getProjectPaths(rootDir);
    const state = loadState(paths.statePath);

    // Resolve language — migrate from operatingMode if still present, else default to 'es'
    const lang =
      (state as any).operatingMode?.detectedLanguage ||
      (state.preferences as any)?.lang ||
      "es";

    // Resolve debug level — migrate from operatingMode if still present
    const debugLevel =
      (state as any).operatingMode?.debugLevel !== undefined
        ? (state as any).operatingMode.debugLevel
        : 1;

    // Resolve style from UserPreferenceProfile for the active user
    const activeUserId = state.activeUser?.userId ?? "user_local";
    const userPref = (state.userPreferences ?? []).find(
      (p) => p.userId === activeUserId,
    );
    const userStyle = userPref?.interactionStyle;
    const succinct =
      userStyle === "succinct" ||
      (state as any).operatingMode?.isSuccinctMode === true;

    res.json({
      version: inuoVer.fullVersionString,
      lang,
      succinct,
      debugLevel,
      userStyle,
      aiUsage: (({ requestCount, totalTokens }) => ({
        requestCount,
        totalTokens,
      }))(getSessionStats()),
    });
  });

  app.get("/api/llm/configurations", (req: Request, res: Response) => {
    res.json({ configurations: getLLMConfigurations(rootDir) });
  });

  app.post("/api/llm/configurations", (req: Request, res: Response) => {
    try {
      const forbiddenField = Object.keys(req.body || {}).find((key) =>
        /api.?key|secret|token|password|credential/i.test(key),
      );
      if (forbiddenField) {
        res.status(400).json({
          error: `Secret field "${forbiddenField}" is not accepted. Configure credentials in the provider environment.`,
        });
        return;
      }

      const configuration = saveLLMConfiguration(
        {
          configurationName: String(req.body.configurationName || ""),
          engineName: String(req.body.engineName || ""),
          model: String(req.body.model || ""),
          baseUrl: req.body.baseUrl ? String(req.body.baseUrl) : undefined,
          supportsPlanMode: req.body.supportsPlanMode === true,
          supportsExecuteMode: req.body.supportsExecuteMode === true,
        },
        rootDir,
      );
      res.status(201).json({ status: "created", configuration });
    } catch (error) {
      const message = (error as Error).message;
      res.status(message.includes("already exists") ? 409 : 400).json({
        error: message,
      });
    }
  });

  app.delete(
    "/api/llm/configurations/:configurationName",
    (req: Request, res: Response) => {
      const configurationName = req.params.configurationName;
      if (!deleteLLMConfiguration(configurationName, rootDir)) {
        res.status(404).json({
          error: `LLM configuration "${configurationName}" not found.`,
        });
        return;
      }
      res.json({ status: "removed", configurationName });
    },
  );

  app.post("/api/setup/llm", async (req: Request, res: Response) => {
    try {
      const apiKey = req.body?.apiKey;
      if (!apiKey || typeof apiKey !== "string") {
        res.status(400).json({ error: "Missing or invalid 'apiKey' field in request body." });
        return;
      }
      const result = await probeAndConfigureModels(apiKey, rootDir);
      res.json({
        success: result.success,
        workingFree: result.workingFree,
        workingPaid: result.workingPaid,
        maskedKey: maskApiKey(apiKey),
        message: result.message,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to configure LLM setup." });
    }
  });

  // Command Execution POST Endpoint
  app.post("/api/command", async (req: Request, res: Response) => {
    try {
      const command = (req.body.command || "").trim();
      if (command) {
        const payload = JSON.stringify({
          channel: OutputChannelEnum.USER_REPLY,
          content: `${TOOL_PROMPT} ${command}`,
          timestamp: new Date().toISOString(),
        });
        for (const client of sseClients) {
          client.write(`data: ${payload}\n\n`);
        }

        const interactiveAdd = /^llm\s+add\s+([A-Za-z0-9._-]+)$/i.exec(command);
        if (req.body.uiMode === true && interactiveAdd) {
          res.json({
            status: "input_required",
            uiAction: {
              type: "LLM_CONFIGURATION",
              setup: getLLMProviderSetup(interactiveAdd[1]),
            },
          });
          return;
        }

        await executeShellLine(command, rootDir);
      }
      res.json({ status: "ok" });
    } catch (err: any) {
      const errPayload = JSON.stringify({
        channel: OutputChannelEnum.DEBUG,
        content: `[Command Execution Error] ${err.message}`,
        timestamp: new Date().toISOString(),
      });
      for (const client of sseClients) client.write(`data: ${errPayload}\n\n`);
      res.status(500).json({ error: err.message });
    }
  });

  const server = http.createServer(app);
  server.listen(port, () => {
    const inuoVer = calculateInuoVersion(rootDir);
    const address = server.address();
    const activePort =
      typeof address === "object" && address ? address.port : port;
    console.log(
      "\x1b[32m%s\x1b[0m",
      `\n🚀 [iNoU Express Web Server] Light Web UI active at http://localhost:${activePort}`,
    );
    console.log(
      "\x1b[36m%s\x1b[0m",
      `   Version: v${inuoVer.fullVersionString} | SSE Stream: http://localhost:${activePort}/api/stream\n`,
    );
  });

  return server;
}
