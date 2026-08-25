import * as blessed from "blessed";
import http from "http";
import path from "path";
import { startWebServer } from "./webServer";
import { TOOL_NAME, TOOL_PROMPT } from "./brand";

// compiled output lives in dist/cli/ → root is 2 levels up
const rootDir = path.join(__dirname, "../..");
const PORT = 3000;

try {
  startWebServer({ port: PORT, rootDir });
} catch {
  // server already running on PORT
}

interface SsePayload {
  channel: string;
  content: string;
}

const screen = blessed.screen({
  smartCSR: true,
  title: `${TOOL_NAME} ASCII Web Client`,
  cursor: {
    artificial: true,
    shape: "line",
    blink: true,
    color: "",
  },
});

const headerBox = blessed.box({
  top: 0,
  left: 0,
  width: "100%",
  height: 3,
  content: `{center}{bold}{cyan-fg}=== ${TOOL_NAME} ASCII Web Client (v00.03.70) ==={/cyan-fg}{/bold}\n{yellow-fg}http://localhost:3000/api/stream{/yellow-fg}{/center}`,
  tags: true,
  border: { type: "line" },
  style: { border: { fg: "#38bdf8" } },
});

const logBox = blessed.log({
  top: 3,
  left: 0,
  width: "100%",
  height: "100%-6",
  label: " Live Log & SSE Web Stream ",
  scrollable: true,
  scrollbar: {
    ch: " ",
    style: { bg: "cyan" },
  },
  border: { type: "line" },
  style: { border: { fg: "#64748b" } },
  tags: true,
});

const form = blessed.form({
  bottom: 0,
  left: 0,
  width: "100%",
  height: 3,
  label: " Command Input ",
  border: { type: "line" },
  style: { border: { fg: "#4ade80" } },
});

const input = blessed.textbox({
  parent: form,
  top: 0,
  left: 1,
  width: "100%-4",
  height: 1,
  inputOnFocus: true,
  keys: true,
  mouse: true,
  style: {
    fg: "white",
    focus: { fg: "cyan" },
  },
});

screen.append(headerBox);
screen.append(logBox);
screen.append(form);

logBox.log(
  `{yellow-fg}🚀 Connected to ${TOOL_NAME} Web Server at http://localhost:3000{/yellow-fg}`,
);
logBox.log(
  "{green-fg}Type commands or questions in the input box below and press Enter.{/green-fg}\n",
);

function connectSSE(): void {
  const req = http.get(
    new URL(`http://localhost:${PORT}/api/stream`),
    (res: http.IncomingMessage) => {
      let buffer = "";

      res.on("data", (chunk: Buffer) => {
        buffer += chunk.toString();
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6)) as SsePayload;
              const cleanText = (data.content ?? "").replace(
                /\x1b\[[0-9;]*m/g,
                "",
              );

              if (data.channel === "THINKING" || cleanText.includes("🧠")) {
                logBox.log(`{magenta-fg}${cleanText}{/magenta-fg}`);
              } else if (data.channel === "DEBUG" || cleanText.includes("⚙")) {
                logBox.log(`{grey-fg}${cleanText}{/grey-fg}`);
              } else if (cleanText.startsWith(TOOL_PROMPT)) {
                logBox.log(`{cyan-fg}${cleanText}{/cyan-fg}`);
              } else {
                logBox.log(`{green-fg}${cleanText}{/green-fg}`);
              }
              screen.render();
            } catch {
              /* malformed SSE frame — skip */
            }
          }
        }
      });

      res.on("end", () => {
        setTimeout(connectSSE, 1000);
      });
    },
  );

  req.on("error", () => {
    setTimeout(connectSSE, 1000);
  });
}

connectSSE();

input.on("submit", (val: string) => {
  const command = (val ?? "").trim();
  input.clearValue();
  input.focus();

  if (command) {
    if (command === "exit" || command === "quit" || command === "q") {
      process.exit(0);
    }

    const reqData = JSON.stringify({ command });
    const postReq = http.request(
      `http://localhost:${PORT}/api/command`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(reqData),
        },
      },
      () => {},
    );
    postReq.write(reqData);
    postReq.end();
  }
  screen.render();
});

screen.key(["C-c"], () => {
  process.exit(0);
});

input.focus();
screen.render();
