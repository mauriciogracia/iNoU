# iNoU Tech Debts

> Items extracted from [`ThePromptFlow.md`](ThePromptFlow.md) — failure points with **no current mitigation or only a partial/silent guard** that require active engineering work.

**Legend — Priority:**
- 🔴 **High** — data loss, uncaught crash, or security risk
- 🟡 **Medium** — silent degradation or incorrect behavior under edge case
- 🟢 **Low** — improvement / defensive hardening

---

## TD-01 · No null guards on DOM element lookups

| Field | Value |
|-------|-------|
| **Ref** | F-06 |
| **Priority** | 🟡 Medium |
| **Layer** | Layer 0 — Web UI |
| **File** | `browser/app.ts` |
| **Problem** | All `document.getElementById(…)` results are immediately cast with `as HTMLElement` / `as HTMLFormElement` etc., with no null check. A mismatch between the JS bundle and the HTML (e.g. after a partial deploy or cache issue) will produce a silent `null` dereference or a visible runtime crash. |
| **Suggested Fix** | Add a guard helper: `function requireEl<T extends HTMLElement>(id: string): T { const el = document.getElementById(id); if (!el) throw new Error(\`Missing required DOM element: #${id}\`); return el as T; }` and replace all raw `getElementById` + cast calls with it. |

---

## TD-02 · Alias resolution has no depth / cycle limit

| Field | Value |
|-------|-------|
| **Ref** | F-17 |
| **Priority** | 🟡 Medium |
| **Layer** | Layer 3 — Shell Dispatcher |
| **File** | `src/cli/aliasCommand.ts` |
| **Problem** | `resolveAlias()` expands aliases before dispatch but has no guard against a chain where alias A → alias B → alias A, which would cause an infinite loop or stack overflow. |
| **Suggested Fix** | Add a `visited: Set<string>` accumulator to `resolveAlias()`. If the same alias token is seen twice, break the chain and surface an error: `"Circular alias detected: <chain>"`. Cap expansion depth at e.g. 10 levels. |

---

## TD-03 · No token budget / context window guard before Gemini calls

| Field | Value |
|-------|-------|
| **Ref** | F-28 |
| **Priority** | 🟡 Medium |
| **Layer** | Layer 5 — AI Client |
| **File** | `src/cli/aiClient.ts` |
| **Problem** | The prompt sent to Gemini is constructed inline with no token pre-estimation or truncation. If user input or the preference block is very long, the request may exceed the model's context window, resulting in a Gemini 400 error or silent response truncation. |
| **Suggested Fix** | Before calling the API, estimate prompt token count (character-count heuristic: `chars / 4`). If the estimate exceeds a configurable `MAX_PROMPT_TOKENS` threshold, truncate the oldest parts of the preference/history block and log a `DEBUG` warning. |

---

## TD-04 · Output listener exceptions propagate silently

| Field | Value |
|-------|-------|
| **Ref** | F-30 |
| **Priority** | 🟡 Medium |
| **Layer** | Layer 6 — Output Router |
| **File** | `src/cli/outputRouter.ts` |
| **Problem** | When `activeOutputListener` is set (API/Web mode), `writeOutput()` calls it directly with no `try/catch`. If the listener (i.e. the `EventBus.publish` path) throws for any reason, the exception bubbles up to the CLI command handler and could crash an otherwise valid request. |
| **Suggested Fix** | Wrap the `activeOutputListener(channel, content)` call in a `try/catch` that falls back to `process.stderr.write` so output is never fully lost and the calling command is not interrupted. |

---

## TD-05 · `res.write` on already-closed SSE response

| Field | Value |
|-------|-------|
| **Ref** | F-34 |
| **Priority** | 🟡 Medium |
| **Layer** | Layer 7 — EventBus / SSE |
| **File** | `src/api/events/SseStreamHandler.ts` |
| **Problem** | `SseStreamHandler.sendEvent()` calls `res.write(…)` without checking whether the response is still writable. If the browser client has disconnected between the EventBus emit and the write call, Node.js emits an `Error: write after end` which, if unhandled, can crash the server process. |
| **Suggested Fix** | Guard each write with `if (!res.writableEnded && !res.destroyed)` before calling `res.write(…)`. Alternatively, wrap in a `try/catch` and silently swallow `ERR_HTTP_HEADERS_SENT` / `write after end` errors. |

---

## TD-06 · `.inuo-state.json` write failures are silent

| Field | Value |
|-------|-------|
| **Ref** | F-37 |
| **Priority** | 🔴 High |
| **Layer** | Layer 8 — Storage |
| **File** | `src/cli/context.ts` |
| **Problem** | `saveState()` writes the state JSON file with no error handling. A disk-full or permission-denied condition causes a thrown exception that is typically swallowed by the caller, resulting in silent state loss — the user's data appears saved but isn't. |
| **Suggested Fix** | Wrap the `fs.writeFileSync` call in a `try/catch`. On failure, emit a `writeOutput(DEBUG, …)` warning and also attempt a `writeOutput(USER_REPLY, …)` alert so the user knows persistence failed. Consider an atomic write via a `.tmp` rename pattern. |

---

## TD-07 · SQLite WAL lock contention not surfaced to the user

| Field | Value |
|-------|-------|
| **Ref** | F-38 |
| **Priority** | 🟡 Medium |
| **Layer** | Layer 8 — Storage |
| **File** | `src/cli/sqliteStorageEngine.ts` |
| **Problem** | SQLite in WAL mode with `synchronous = NORMAL` reduces lock contention but does not eliminate it. If two iNoU processes run against the same `.inuo.db` simultaneously (e.g. CLI + API server both writing), a `SQLITE_BUSY` error can occur. This is currently unhandled and would surface as an uncaught exception. |
| **Suggested Fix** | Set `PRAGMA busy_timeout = 3000;` on database open so SQLite waits up to 3 s before failing. Wrap all write operations in a `try/catch` and retry once on `SQLITE_BUSY`. Add a startup check that warns if another process holds a write lock. |

---

## TD-08 · Data directory creation failure is silently swallowed

| Field | Value |
|-------|-------|
| **Ref** | F-39 |
| **Priority** | 🔴 High |
| **Layer** | Layer 8 — Storage |
| **File** | `src/cli/context.ts`, `src/cli/sqliteStorageEngine.ts` |
| **Problem** | When `INUO_DATA_DIR` is set, both `getProjectPaths()` and `getDatabasePath()` call `fs.mkdirSync(resolvedDir, { recursive: true })` inside a bare `try/catch {}` with an empty catch body. If the directory cannot be created (bad path, no permissions), execution continues silently and all subsequent reads/writes to that path will fail with confusing errors. |
| **Suggested Fix** | Remove the silent catch. Instead, catch the error and immediately throw a descriptive `Error(\`Cannot create data directory '${resolvedDir}': ${err.message}\`)` so startup fails fast with a clear message rather than degrading silently. |

---

## TD-09 · No migration guard when `INUO_DATA_DIR` changes

| Field | Value |
|-------|-------|
| **Ref** | F-40 |
| **Priority** | 🔴 High |
| **Layer** | Layer 8 — Storage |
| **File** | `src/cli/context.ts` |
| **Problem** | If `INUO_DATA_DIR` is changed between runs (e.g. env var updated in production), the system silently starts with a blank state at the new path, while the real data remains at the old path. There is no detection, warning, or migration assistance. |
| **Suggested Fix** | On startup, store the resolved data path inside the state file itself (e.g. `state.dataDir`). On next load, compare the stored path against the resolved current path. If they differ, emit a prominent warning and prompt the user to confirm or run a migration command (`inuo migrate --from <old> --to <new>`). |

---

*Last updated: 2026-08-17 — extracted from `ThePromptFlow.md` failure catalogue.*

---

## To Implement

> Consolidated backlog of **not-yet-implemented** features and fixes extracted from across all project markdown files. Each item includes its source document, priority, and a brief description.

**Legend — Priority:**
- 🔴 **P0/P1** — Blocking or critical path; must be resolved before next milestone
- 🟡 **P2/P3** — Important; part of the next planned phase
- 🟢 **P4** — Nice-to-have / housekeeping

---

### ~~TI-01~~ · ✅ Fix Broken Internal Spec Links After `mv` — **RESOLVED 2026-08-17**

| Field | Value |
|-------|-------|
| **Source** | [`to-improve/0002`](../../to-improve/0002-broken-spec-links-after-mv.md) · [`docs/current-status.md`](../current-status.md) |
| **Priority** | ~~🔴 P0~~ → ✅ Resolved |
| **Resolution** | Updated all 15 occurrences of `file:///d:/repos/iNoU/tech-specs/` → `file:///d:/repos/iNoU/docs/tech-specs/` across 11 files: all `docs/tech-specs/*.specs.md` headers, `road-map.md`, `README.md`, `AGENTS.md`, and `skills/google-workspace-skill/SKILL.md`. |

---

### ~~TI-02~~ · ✅ Unified Canonical SQLite DDL — **RESOLVED 2026-08-17**

| Field | Value |
|-------|-------|
| **Source** | [`to-improve/0003`](../../to-improve/0003-unify-canonical-sqlite-ddl.md) · [`docs/current-status.md`](../current-status.md) |
| **Priority** | ~~🔴 P0~~ → ✅ Resolved |
| **Resolution** | `sqliteStorageEngine.ts` DDL synced to `sqlite_schema_and_indexes.specs.md` (canonical source). Added: `PRAGMA foreign_keys = ON`, `PRAGMA busy_timeout = 3000` (also fixes TD-07), `workflows` table with FK to `projects`, `CHECK` constraints on all enum columns (`status`, `scope`, `category`, `auth_type`, `dependency_type`, `sync_status`, `operation`, `entity_type`), FK constraints on `dependency_edges` and `tasks`, `semantic_path` column on `tasks`, and 3 missing indexes (`idx_tasks_semantic_path`, `idx_dependency_edges_workflow`, `idx_chats_owner`). |

---

### TI-03 · Missing Repositories: Workflow, Node, Memory

| Field | Value |
|-------|-------|
| **Source** | [`to-improve/0004`](../../to-improve/0004-missing-repositories-workflow-node-memory.md) · [`docs/current-status.md`](../current-status.md) |
| **Priority** | 🔴 P1 |
| **Description** | `src/repositories/` is missing `WorkflowRepository`, `NodeRepository`, and `MemoryRepository`. These are required to persist and query DAG workflow nodes and cognitive memory records via the standard repository pattern. |

---

### TI-04 · DAG Execution Engine (RunOrchestrator, CPM, AppModeManager)

| Field | Value |
|-------|-------|
| **Source** | [`to-improve/0005`](../../to-improve/0005-dag-execution-engine.md) · [`road-map.md` Phase 1](road-map.md) · [`main-specs-goals.md` §8](main-specs-goals.md) |
| **Priority** | 🔴 P1 |
| **Description** | The core DAG execution layer is unimplemented. Required components: `RunOrchestrator.ts` (task scheduling and status propagation), Critical Path Method (CPM) algorithm, `AppModeManager.ts` enforcing `EDIT_MODE` / `DRY_RUN_MODE` / `RUN_MODE`, Tarjan cycle detection, and the 3-Level Sliding Window Planning UI. |

---

### TI-05 · Copilot Runtime Integration (Provider Dispatch, Adapter, Fallback)

| Field | Value |
|-------|-------|
| **Source** | [`to-improve/0001`](../../to-improve/0001-integration-and-provider-runtime-gap.md) · [`integrateWithCoplito.md`](integrateWithCoplito.md) · [`docs/current-status.md`](../current-status.md) |
| **Priority** | 🟡 P2 |
| **Description** | Copilot profiles can be created and persisted, but no runtime AI dispatch exists. Three phases required: (1) provider-agnostic `invokeAI()` entry point with adapter registry keyed by `engineName`; (2) Copilot runtime adapter normalising responses to `{ text, inputTokens, outputTokens }`; (3) plan/execute capability policy enforcement and provider fallback chain. |

---

### TI-06 · Progressive Clarification Engine (Q-IDs, Elicitation Gating)

| Field | Value |
|-------|-------|
| **Source** | [`to-improve/0006`](../../to-improve/0006-clarification-engine.md) · [`road-map.md` Phase 3](road-map.md) · [`main-specs-goals.md` §8.3](main-specs-goals.md) |
| **Priority** | 🟡 P2 |
| **Description** | Implement `ContextElicitationManager.ts` with immutable question IDs (`ClarificationLedger.ts`), single-question delivery per turn, dual planning modes (`OVERVIEW` top-down vs. `GO_DEEP` recursive), and `GraphifyContextIndexer.ts` for k-hop subgraph extraction to minimise prompt tokens. |

---

### TI-07 · Adaptive User Format Preference Learning — Open Items

| Field | Value |
|-------|-------|
| **Source** | [`to-improve/0007`](../../to-improve/0007-adaptive-format-preference-learning.md) · [`docs/toImprove.md`](../toImprove.md) |
| **Priority** | 🟡 P2 |
| **Description** | The preference engine is partially implemented. Remaining open items: (1) tone preference detection (`preferFormalTone`); (2) expose current preferences in `mode status` output; (3) explicit CLI override commands (`mode format bullets`, `mode length brief`); (4) decay old signals over time (lower `signalCount` weight after N sessions); (5) scoped import, trust checks and consent enforcement in `mergeTrainingData()`. |

---

### TI-08 · AI Usage Tracking — Token Counts & Budget Limits

| Field | Value |
|-------|-------|
| **Source** | [`to-improve/0008`](../../to-improve/0008-ai-usage-tracking.md) · [`docs/toImprove.md`](../toImprove.md) |
| **Priority** | 🟡 P2 |
| **Description** | No per-session, per-command, or cumulative token visibility. Implement: `AiUsageRecord` and `AiUsageSummary` interfaces; `usageEngine.ts` (`recordUsage`, `getSummary`, `formatUsageDisplay`, `resetUsage`); capture `response.usageMetadata` after every Gemini call; `ai usage` CLI command; `usage-pill` in Web UI header; `aiUsage` field on `/api/status`. |

---

### TI-09 · Multi-AI Provider Configuration (OpenAI, Anthropic, Ollama)

| Field | Value |
|-------|-------|
| **Source** | [`to-improve/0009`](../../to-improve/0009-multi-ai-provider-configuration.md) · [`docs/toImprove.md`](../toImprove.md) |
| **Priority** | 🟡 P2 |
| **Description** | Only Gemini is supported; API key and model are partially hardcoded. Implement: `AIProvider` type union; `AIProviderConfig` interface with `costPerInputToken`/`costPerOutputToken`; provider-agnostic `invokeAI()` dispatch in `aiClient.ts`; adapter modules for `openai`, `anthropic`, `ollama`; `ai add/list/set-active/remove/budget/models` CLI commands; `agent generate` command producing `AGENTS.md` and `copilot-instructions.md`. |

---

### TI-10 · MCP Server — Tool Catalogue, STDIO/SSE Transport

| Field | Value |
|-------|-------|
| **Source** | [`to-improve/0010`](../../to-improve/0010-mcp-server.md) · [`road-map.md` Phase 4](road-map.md) · [`main-specs-goals.md` §8.4](main-specs-goals.md) |
| **Priority** | 🟡 P3 |
| **Description** | Implement `InouMcpServer.ts` exposing iNoU DAG workflows and Master Mind memory tools to VSCode, Antigravity, GitHub Copilot, and Cursor via the Model Context Protocol (MCP) over STDIO and SSE transports. |

---

### TI-11 · Document Compilation Pipeline (DOCX, PDF, XLSX)

| Field | Value |
|-------|-------|
| **Source** | [`to-improve/0011`](../../to-improve/0011-document-compilation-pipeline.md) · [`road-map.md` Phase 2](road-map.md) · [`main-specs-goals.md` §8.2](main-specs-goals.md) |
| **Priority** | 🟡 P3 |
| **Description** | Implement the document compilation pipeline: `pandoc` → DOCX, `typst`/Chrome → PDF, `exceljs` → XLSX. Required for workflow artifact export. |

---

### TI-12 · Autonomous Delta Sync & Git-Like 3-Way Merge

| Field | Value |
|-------|-------|
| **Source** | [`road-map.md` Phase 3](road-map.md) |
| **Priority** | 🟡 P2 |
| **Description** | Self-detecting bi-directional sync (`inou sync`) with 3-tier conflict resolution: Tier 1 fast-forward (clear newer timestamp), Tier 2 field-level merge (disjoint attributes), Tier 3 interactive diff prompt. Plus granular entity filtering (`--entities task,workspace`) and adaptive degradation (`--lightweight` on low bandwidth, offline store-and-forward queue). |

---

### TI-13 · Multi-Client Applications (PWA, Android, iOS, Colmena P2P)

| Field | Value |
|-------|-------|
| **Source** | [`road-map.md` Phase 5](road-map.md) |
| **Priority** | 🟡 P3 |
| **Description** | Four parallel clients not yet started: (1) **Web PWA** — WebAuthn passkey auth, SSE live task streaming, dark mode; (2) **Android** — Kotlin/Jetpack Compose, Room/SQLite, Android Biometrics, WorkManager sync, SMS/USSD fallback; (3) **iOS** — Swift/SwiftUI, CoreData, Secure Enclave FaceID/TouchID, APNs push; (4) **Colmena P2P Swarm** — peer discovery gossip, multi-party `TrustThresholdGate`. |

---

### TI-14 · Cloud Master Mind & LLM Context Caching (Phase 6)

| Field | Value |
|-------|-------|
| **Source** | [`road-map.md` Phase 6](road-map.md) |
| **Priority** | 🟡 P3 |
| **Description** | (1) Google Drive + encrypted cloud storage adapters for cross-device snapshot sync; (2) Gemini Context Caching integration — persistent `gemini-cache-*` tokens to eliminate token re-ingestion on cross-device plan resumption; (3) Delegated Incapacitation Trust Network with trusted-member emergency delegation protocols. |

---

### TI-15 · Technical Gaps from Main Specs (GAP-TECH-XXX)

| Field | Value |
|-------|-------|
| **Source** | [`main-specs-goals.md` §9.2](main-specs-goals.md) |
| **Priority** | 🟡 P2–P3 |
| **Description** | Four open spec-level gaps: **GAP-TECH-002** — LSP/DAP integration for live syntax diagnostics and breakpoint stepping (Medium); **GAP-TECH-003** — Artifact Storage Lifecycle with deduplication and GC for `.inou/artifacts/` (Medium); **GAP-TECH-004** — Worker sandbox isolation (Docker/gVisor) for `CLI_WORKER` sub-processes executing untrusted code (High 🔴); **GAP-TECH-006** — CRDT/OT collaborative sync for conflict-free multi-user `EDIT_MODE` (Low-Medium). |

---

### TI-16 · Business & Operational Gaps (GAP-BIZ-XXX)

| Field | Value |
|-------|-------|
| **Source** | [`main-specs-goals.md` §9.3](main-specs-goals.md) |
| **Priority** | 🟡 P2–P3 |
| **Description** | Four open business gaps: **GAP-BIZ-001** — Tiered commercial licensing boundary between open-core and enterprise features (High 🔴); **GAP-BIZ-002** — Regulatory compliance SLA and legal liability framework for AI-generated compliance artifacts (High 🔴); **GAP-BIZ-004** — Third-party connector ecosystem with cryptographic signing and marketplace certification; **GAP-BIZ-005** — Air-gapped/offline distribution packaging for classified enterprise environments. |

---

### TI-17 · Resolve `escenario_03.md` vs `scenario_03.md` Duplication

| Field | Value |
|-------|-------|
| **Source** | [`to-improve/0012`](../../to-improve/0012-resolve-scenario-03-duplication.md) · [`docs/current-status.md`](../current-status.md) |
| **Priority** | 🟢 P4 |
| **Description** | Both `docs/tech-specs/escenario_03.md` and `docs/tech-specs/scenario_03.md` exist and appear to describe overlapping content. One should be canonicalized and the other removed or marked as deprecated. |

---

*Last updated: 2026-08-17 — consolidated from `road-map.md`, `current-status.md`, `toImprove.md`, `integrateWithCoplito.md`, and `main-specs-goals.md`.*

