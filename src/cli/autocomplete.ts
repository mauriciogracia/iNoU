/**
 * autocomplete.ts
 *
 * Tab-completion for the iNoU interactive shell.
 *
 * Design:
 *   - LEVEL 0: entity (project, workspace, task, memory, preference, ...)
 *   - LEVEL 1: action  (add, update, enable, disable, remove, list)
 *   - LEVEL 2: flag    (--name, --path, --title, …) — entity+action specific
 *
 * The `completer` function follows the Node.js readline completer contract:
 *   (line: string) => [hits: string[], line: string]
 */

// ---------------------------------------------------------------------------
// Command tree
// ---------------------------------------------------------------------------

/** All semantic entities understood by the dispatcher */
const ENTITIES = [
  "project",
  "workspace",
  "task",
  "memory",
  "preference",
  // Aliases / locale variants surfaced for discovery
  "proyecto",
  "tarea",
  "memoria",
  "preferencia",
  "espacio",
];

/** Standard CRUD actions every entity supports */
const ACTIONS = ["add", "update", "enable", "disable", "remove", "list"];

/** Standalone top-level commands that are NOT entity-action pairs */
const STANDALONE_COMMANDS = [
  "alias",
  "ai",
  "adapt",
  "adaptive",
  "answer",
  "auth",
  "behavior",
  "bootstrap",
  "catalog",
  "colmena",
  "correct",
  "debug",
  "detail",
  "device",
  "engine",
  "evolve",
  "export-training",
  "forget",
  "gc",
  "help",
  "?",
  "init",
  "key",
  "learn",
  "llm",
  "mastermind",
  "match",
  "mcp",
  "member",
  "merge-training",
  "mode",
  "need",
  "node",
  "offer",
  "principle",
  "promptme",
  "question",
  "role",
  "rollback",
  "setup",
  "skill",
  "sn",
  "social",
  "socialmedia",
  "status",
  "succinct",
  "sync",
  "test",
  "threshold",
  "tier",
  "user",
  "version",
  "whoami",
  "serve",
  "api",
  "hub",
  "exit",
  "quit",
];

/** All root-level completions (entities + standalone commands) */
const ROOT_COMPLETIONS = [...new Set([...ENTITIES, ...STANDALONE_COMMANDS])];

// ---------------------------------------------------------------------------
// Per-entity flag maps
// ---------------------------------------------------------------------------

interface FlagSpec {
  flag: string;
  hint?: string;
}

type EntityActionFlags = Record<string, Record<string, FlagSpec[]>>;

const FLAGS: EntityActionFlags = {
  project: {
    add: [
      { flag: "--name", hint: "<projectName>" },
      { flag: "--jurisdiction", hint: "<US-CA|CO-DC|GLOBAL>" },
    ],
    update: [
      { flag: "--name", hint: "<newName>" },
      { flag: "--jurisdiction", hint: "<code>" },
      { flag: "--status", hint: "<Active|Disabled>" },
    ],
    enable: [],
    disable: [],
    remove: [],
    list: [],
  },

  workspace: {
    add: [
      { flag: "--path", hint: "<dirPath>" },
      { flag: "--name", hint: "<workspaceName>" },
    ],
    update: [
      { flag: "--name", hint: "<newName>" },
      { flag: "--path", hint: "<newPath>" },
    ],
    enable: [],
    disable: [],
    remove: [],
    list: [],
  },

  task: {
    add: [
      { flag: "--title", hint: "<taskTitle>" },
      { flag: "--workflow", hint: "<workflowId>" },
      { flag: "--role", hint: "<engineName>" },
      { flag: "--type", hint: "<task|need|offer|workflow>" },
      { flag: "--verb", hint: "<Request|Buy|Consult>" },
      { flag: "--object", hint: "<objectName>" },
    ],
    update: [
      { flag: "--status", hint: "<Open|InProgress|Blocked|Fulfilled>" },
      { flag: "--title", hint: "<newTitle>" },
    ],
    enable: [],
    disable: [],
    remove: [],
    list: [{ flag: "--workflow", hint: "<workflowId>" }],
  },

  memory: {
    add: [
      { flag: "--topic", hint: "<topicName>" },
      { flag: "--content", hint: "<text>" },
      { flag: "--type", hint: "<skill|principle|behavior|correction>" },
      { flag: "--title", hint: "<title>" },
    ],
    update: [{ flag: "--content", hint: "<updatedText>" }],
    enable: [],
    disable: [],
    remove: [],
    list: [{ flag: "--type", hint: "<skill|principle|behavior>" }],
  },

  preference: {
    add: [
      { flag: "--key", hint: "<prefKey>" },
      { flag: "--value", hint: "<prefValue>" },
      { flag: "--project", hint: "<projectId>" },
      { flag: "--workspace", hint: "<workspaceId>" },
      { flag: "--task", hint: "<taskId>" },
    ],
    update: [
      { flag: "--key", hint: "<prefKey>" },
      { flag: "--value", hint: "<newValue>" },
    ],
    enable: [{ flag: "--key", hint: "<prefKey>" }],
    disable: [{ flag: "--key", hint: "<prefKey>" }],
    remove: [{ flag: "--key", hint: "<prefKey>" }],
    list: [],
  },
};

// Alias entries so localized entity names also get flags
const ENTITY_ALIAS_MAP: Record<string, string> = {
  proyecto: "project",
  projet: "project",
  projekt: "project",
  espacio: "workspace",
  tarea: "task",
  nodo: "task",
  node: "task",
  workflow: "task",
  need: "task",
  offer: "task",
  memoria: "memory",
  memoire: "memory",
  skill: "memory",
  principle: "memory",
  behavior: "memory",
  correction: "memory",
  preferencia: "preference",
  alias: "preference",
  mode: "preference",
  role: "preference",
  config: "preference",
  setting: "preference",
  pref: "preference",
};

function resolveEntity(token: string): string {
  return ENTITY_ALIAS_MAP[token] ?? token;
}

// ---------------------------------------------------------------------------
// Core completer
// ---------------------------------------------------------------------------

/**
 * readline-compatible completer.
 * Returns [completionHits, lineFragment].
 */
export function completer(line: string): [string[], string] {
  const tokens = line.trimStart().split(/\s+/);

  // ── LEVEL 0: completing the entity / command ─────────────────────────────
  if (tokens.length === 1) {
    const partial = tokens[0].toLowerCase();
    const hits = ROOT_COMPLETIONS.filter((c) => c.startsWith(partial));
    return [hits.length ? hits : ROOT_COMPLETIONS, line];
  }

  const entityRaw = tokens[0].toLowerCase();
  const isEntity = ENTITIES.includes(entityRaw) || entityRaw in ENTITY_ALIAS_MAP;

  // ── LEVEL 1: completing the action for a known entity ────────────────────
  if (isEntity && tokens.length === 2) {
    const partial = tokens[1].toLowerCase();
    const hits = ACTIONS.filter((a) => a.startsWith(partial));
    return [hits.map((h) => `${tokens[0]} ${h}`), line];
  }

  // ── LEVEL 2: completing flags ────────────────────────────────────────────
  if (isEntity && tokens.length >= 3) {
    const actionRaw = tokens[1].toLowerCase();
    const canonicalEntity = resolveEntity(entityRaw);
    const entityFlags = FLAGS[canonicalEntity]?.[actionRaw] ?? [];

    // Only suggest flags the user hasn't typed yet
    const usedFlags = new Set(tokens.filter((t) => t.startsWith("--")));
    const availableFlags = entityFlags
      .filter((f) => !usedFlags.has(f.flag))
      .map((f) => f.flag);

    const lastToken = tokens[tokens.length - 1];
    const partial = lastToken.startsWith("--") ? lastToken : "";

    const hits = partial
      ? availableFlags.filter((f) => f.startsWith(partial))
      : availableFlags;

    const prefix = tokens.slice(0, -1).join(" ");
    return [
      hits.map((h) => `${prefix} ${h}`),
      line,
    ];
  }

  // ── Standalone command sub-completions ───────────────────────────────────
  const subCompletions = getStandaloneSubCompletions(entityRaw, tokens);
  if (subCompletions.length > 0) {
    return [subCompletions, line];
  }

  return [[], line];
}

// ---------------------------------------------------------------------------
// Sub-completions for common standalone commands
// ---------------------------------------------------------------------------

const STANDALONE_SUBS: Record<string, string[]> = {
  alias: ["add", "list", "remove"],
  ai: ["usage", "status"],
  auth: ["signin", "signout", "status"],
  behavior: ["add", "enable", "disable", "list"],
  colmena: ["status", "sync", "peers"],
  device: ["list", "add", "remove", "sync"],
  engine: ["list", "add", "status"],
  forget: [],
  llm: ["add", "list", "remove", "status"],
  mastermind: ["status", "snapshot", "rollback"],
  mcp: ["start", "stop", "status"],
  member: ["add", "list", "remove"],
  mode: ["promptMe", "letMeServeYou", "succinct", "status", "debug"],
  need: ["create", "list"],
  node: ["add", "list", "update", "remove"],
  offer: ["create", "list"],
  principle: ["add", "list", "update", "remove"],
  role: ["Creator", "Auditor", "RegularUser", "Administrator"],
  setup: [],
  skill: ["register", "list", "activate", "deactivate"],
  sn: ["add", "list", "update", "remove", "broadcast"],
  socialmedia: ["add", "list", "update", "remove", "broadcast"],
  social: ["broadcast"],
  sync: ["--channel", "--entities", "--lightweight"],
  tier: ["status", "consent", "model", "reset"],
  user: ["set", "status"],
  version: [],
  learn: [],
  evolve: [],
};

function getStandaloneSubCompletions(cmd: string, tokens: string[]): string[] {
  const subs = STANDALONE_SUBS[cmd];
  if (!subs || tokens.length < 2) return [];
  const partial = tokens[1]?.toLowerCase() ?? "";
  const hits = subs.filter((s) => s.startsWith(partial));
  return hits.map((h) => `${cmd} ${h}`);
}

// ---------------------------------------------------------------------------
// Help hint renderer — used by `help` command
// ---------------------------------------------------------------------------

/**
 * Returns a formatted multi-line string describing the entity-action command
 * matrix, suitable for displaying in the shell.
 */
export function renderCommandHelp(): string {
  const lines: string[] = [];

  lines.push("\x1b[36m╔══════════════════════════════════════════════════════╗\x1b[0m");
  lines.push("\x1b[36m║        iNoU Semantic Command Reference               ║\x1b[0m");
  lines.push("\x1b[36m╚══════════════════════════════════════════════════════╝\x1b[0m");
  lines.push("");
  lines.push("\x1b[33mSyntax:\x1b[0m  <entity> <action> [--flag value …]");
  lines.push("\x1b[90mTip:     Type '?' or 'help' for command reference. Press TAB to autocomplete.\x1b[0m");
  lines.push("");

  lines.push("\x1b[1m── Semantic Entities & Actions ──────────────────────────\x1b[0m");

  const entityDefs: Record<string, string> = {
    project: "Top-level organizational container",
    workspace: "Local filesystem workspace",
    task: "DAG workflow node / need / offer",
    memory: "Adaptive memory, skill, principle, behavior",
    preference: "Scoped user setting, mode, alias, API key",
  };

  for (const [entity, desc] of Object.entries(entityDefs)) {
    lines.push(`\n  \x1b[32m${entity}\x1b[0m  \x1b[90m— ${desc}\x1b[0m`);
    lines.push(`    \x1b[36madd\x1b[0m | \x1b[36mupdate\x1b[0m | \x1b[36menable\x1b[0m | \x1b[36mdisable\x1b[0m | \x1b[36mremove\x1b[0m | \x1b[36mlist\x1b[0m`);
    const entityFlags = FLAGS[entity];
    const addFlags = entityFlags?.add ?? [];
    if (addFlags.length > 0) {
      const flagStr = addFlags.map((f) => `\x1b[35m${f.flag}\x1b[0m \x1b[90m${f.hint ?? ""}\x1b[0m`).join("  ");
      lines.push(`    Flags (add): ${flagStr}`);
    }
  }

  lines.push("");
  lines.push("\x1b[1m── Other Commands ───────────────────────────────────────\x1b[0m");
  lines.push(
    "  alias  ai  auth  behavior  colmena  correct  device  engine\n" +
    "  evolve  forget  gc  key  learn  llm  mastermind  match  mcp\n" +
    "  member  mode  need  node  offer  principle  role  setup  skill\n" +
    "  sn  social  status  sync  tier  version  whoami  exit",
  );
  lines.push("");
  lines.push("\x1b[90mMultilingual: project/proyecto/projet | task/tarea | memory/memoria\x1b[0m");

  return lines.join("\n");
}
