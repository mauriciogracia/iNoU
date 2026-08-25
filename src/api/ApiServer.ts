import http, { Server } from "http";
import { Router } from "./routes/Router";
import { EventBus } from "./events/EventBus";
import { setOutputListener } from "../cli/outputRouter";
import { OutputChannelEnum } from "../enums/OutputChannelEnum";

export class ApiServer {
  private server: Server | null = null;
  private router: Router;
  private port: number;
  private host: string;
  private rootDir: string;

  constructor(
    port?: number,
    host?: string,
    rootDir: string = process.cwd(),
  ) {
    this.port = port || parseInt(process.env.PORT || "8765", 10);
    this.host = host || process.env.HOST || "0.0.0.0";
    this.rootDir = rootDir;
    this.router = new Router(rootDir);
  }

  public start(): Promise<{ port: number; host: string; url: string }> {
    return new Promise((resolve, reject) => {
      // Bridge CLI Output Router events to EventBus for SSE clients
      setOutputListener((channel: OutputChannelEnum, content: string) => {
        EventBus.getInstance().publish("output.message", "preference", "update", {
          channel,
          content,
          timestamp: new Date().toISOString(),
        });
      });

      this.server = http.createServer((req, res) => {
        this.router.handleRequest(req, res);
      });

      this.server.on("error", (err) => {
        reject(err);
      });

      this.server.listen(this.port, this.host, () => {
        const url = `http://${this.host === "0.0.0.0" ? "127.0.0.1" : this.host}:${this.port}`;
        EventBus.getInstance().publish("system.started", "preference", "update", {
          service: "iNoU Cloud Relay Hub & API Gateway",
          url,
          port: this.port,
          host: this.host,
        });
        resolve({ port: this.port, host: this.host, url });
      });
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.server) {
        resolve();
        return;
      }
      this.server.close(() => {
        this.server = null;
        resolve();
      });
    });
  }

  public getRouter(): Router {
    return this.router;
  }
}
