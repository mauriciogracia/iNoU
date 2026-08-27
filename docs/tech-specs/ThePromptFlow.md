# ThePromptFlow — iNoU Layer Architecture & Failure Map

> **Scope**: Traces the complete lifecycle of a user prompt from the Web UI through every layer of the iNoU stack down to the Gemini AI and the SQLite/JSON state storage, and back to the user via the SSE stream.

---

## 1. High-Level Layer Map

```
┌─────────────────────────────────────────────────────────┐
│  LAYER 0 · Web UI  (browser/app.ts + public/index.html) │
│  – HTML form, fetch() POST, EventSource SSE listener    │
└──────────────────────────┬──────────────────────────────┘
                           │  HTTP  /api/command  (POST)
                           ▼
┌─────────────────────────────────────────────────────────┐
│  LAYER 1 · API Gateway  (src/api/ApiServer.ts)          │
│  – Node.js http.Server, port 8765 (default)             │
│  – Bridges CLI OutputRouter → EventBus → SSE clients   │
└──────────────────────────┬──────────────────────────────┘
                           │  handleRequest()
                           ▼
┌─────────────────────────────────────────────────────────┐
│  LAYER 2 · Router  (src/api/routes/Router.ts)           │
│  Step A  CorsMiddleware         (preflight / headers)   │
│  Step B  SseStreamHandler       (/api/stream GET)       │
│  Step C  Static asset serving   (public/ files)         │
│  Step D  Body buffering         (readBody)              │
│  Step E  ManipulationDefense    (circuit breaker)       │
│  Step F  JSON parse             (bodyJson)              │
│  Step G  Route matrix dispatch  (/api/* /api/v1/*)      │
└──────────────────────────┬──────────────────────────────┘
                           │  executeShellLine(command)
                           ▼
┌─────────────────────────────────────────────────────────┐
│  LAYER 3 · Shell Dispatcher  (src/cli/shell.ts)         │
│  – Tokenises the command line                           │
│  – Alias resolution  (aliasCommand)                     │
│  – Keyword routing to individual command handlers       │
│  – Falls through to NL Intent (AI) if unrecognised      │
└──────────────────────────┬──────────────────────────────┘
                           │  processNaturalLanguageIntent()
                           │  OR  executeSemanticCommand()
                           ▼
┌─────────────────────────────────────────────────────────┐
│  LAYER 4 · Semantic Dispatcher  (semanticDispatcher.ts) │
│  – Normalises entity tokens (multilingual)              │
│  – Maps entity + action → specific command handler      │
│  – parseSemanticCommand / executeSemanticCommand        │
└──────────────────────────┬──────────────────────────────┘
                           │  AI path only
                           ▼
┌─────────────────────────────────────────────────────────┐
│  LAYER 5 · AI Client  (src/cli/aiClient.ts)             │
│  – Loads env (Gemini API key)                           │
│  – Cost Governance tier selection (costGovernanceEngine)│
│  – Builds structured prompt (language, prefs, mode)     │
│  – Calls @google/genai  →  Gemini model                 │
│  – Parses JSON response → ParsedIntentResult            │
│  – Emits output via OutputRouter (THINKING / USER_REPLY)│
└──────────────────────────┬──────────────────────────────┘
                           │  writeOutput()
                           ▼
┌─────────────────────────────────────────────────────────┐
│  LAYER 6 · Output Router  (src/cli/outputRouter.ts)     │
│  – In Web/API mode: fires activeOutputListener          │
│  – In CLI mode: writes to stdout / stderr               │
└──────────────────────────┬──────────────────────────────┘
                           │  publish() on EventBus
                           ▼
┌─────────────────────────────────────────────────────────┐
│  LAYER 7 · EventBus + SSE  (EventBus.ts / SseHandler)  │
│  – EventBus (singleton EventEmitter) buffers history    │
│  – SseStreamHandler pushes events to open /api/stream   │
│  – Browser EventSource receives and renders messages    │
└─────────────────────────────────────────────────────────┘
                           │  state persistence
                           ▼
┌─────────────────────────────────────────────────────────┐
│  LAYER 8 · Storage  (context.ts + sqliteStorageEngine)  │
│  – Primary: SQLite WAL (.inuo.db)                       │
│  – Fallback / legacy: .inuo-state.json (JSON flat file) │
│  – Repositories: Chat, Task, Project, Workspace…        │
└─────────────────────────────────────────────────────────┘
```

---

## 1.1 Compiler, Linter & Finite State Machine (FSM) Architecture

iNoU processes all natural language prompts and shell commands through a formal **Compiler & Deterministic Finite State Machine (FSM)** pipeline:

```
[ Raw Input String ]
        │
        ▼
[ 1. Lexer & Tokenizer ] ──────► Splits raw text into tokens & flags (`--verb`, `--object`, `sub-commands`)
        │
        ▼
[ 2. AST Parser ] ─────────────► Builds structured syntax tree: `NEED = (VERB) + (OBJECT) + Context`
        │
        ▼
[ 3. Semantic Linter ] ────────► Validates AST tokens against `GlobalCatalog` namespaces & typing rules
        │
        ▼
[ 4. Deterministic FSM ] ──────► Evaluates state transitions across multi-step workflows:
                                 `IDLE` ──► `INTAKE_STEP_1` ──► `INTAKE_STEP_N` ──► `COMPILED` ──► `EXECUTED`
```

1. **Lexical Analysis & AST Tokenization**:
   - The shell and SLM tokenizer parse commands and conversational prompts into formal Abstract Syntax Trees (AST).
2. **Semantic Linter & Catalog Validation**:
   - Every entity (`VERB`, `OBJECT`, `MODALITY`, `SCOPE`) is type-checked against the `GlobalCatalog` to prevent namespace collisions and hallucinations.
3. **Deterministic State Machine (DST / FSM)**:
   - Multi-step interactive workflows (e.g. `create job offer`, disambiguation, credential intake) are executed as deterministic state machine transitions persisted in the active chat session.

---

## 2. Detailed Step-by-Step Flow

### Step 1 — User types a command in the Web UI

**File**: `browser/app.ts`

1. `commandForm` `submit` event fires.
2. `sendCommand(command)` is called.
3. `showAnalyzing()` displays the ⏳ indicator in the log viewport.
4. `fetch("/api/command", { method: "POST", body: JSON.stringify({ command, uiMode: true }) })` is sent.
5. Concurrently, `EventSource("/api/stream")` is open, receiving SSE events pushed by the server.

---

### Step 2 — API Server receives the request

**File**: `src/api/ApiServer.ts`

1. `http.createServer` dispatches the request to `Router.handleRequest()`.
2. The server has already bridged `OutputRouter → EventBus` via `setOutputListener`, so any `writeOutput()` call inside the CLI layer automatically publishes to the EventBus and reaches all SSE clients.

---

### Step 3 — Router pipeline (7 sequential gates)

**File**: `src/api/routes/Router.ts`

| Gate | What happens |
|------|-------------|
| **A – CORS** | `CorsMiddleware.handle()` adds headers; OPTIONS preflight returns immediately. |
| **B – SSE** | `GET /api/stream` → `SseStreamHandler.handle()`, keeps connection open. |
| **C – Static** | `GET` requests resolved against `public/` directory. Path-traversal guard enforced. |
| **D – Body buffer** | `readBody()` accumulates all `data` chunks before processing. |
| **E – Manipulation Defense** | `ManipulationDefenseMiddleware.evaluate()` scans body for prompt-injection patterns. Blocked requests get HTTP 403. |
| **F – JSON parse** | Raw body is `JSON.parse()`'d; malformed payloads get HTTP 400. |
| **G – Route matrix** | Pattern-matched dispatch to controllers or inline handlers (`/api/command`, `/api/v1/*`). |

For `/api/command POST`:

- The command text is published to the EventBus as a `USER_REPLY` message (so the Web UI sees it echoed in the log).
- Special case: `llm add <provider>` in `uiMode: true` returns `status: "input_required"` + `uiAction: LLM_CONFIGURATION` — no AI call occurs, the browser opens the LLM config dialog instead.
- Otherwise: `executeShellLine(command, rootDir)` is called.

---

### Step 4 — Shell Dispatcher

**File**: `src/cli/shell.ts`

1. `tokenizeCommandLine()` splits the raw input respecting quoted strings.
2. Alias resolution: `resolveAlias()` expands user-defined shortcuts.
3. First token is matched against a large `switch`/`if` tree covering all known CLI keywords (`status`, `need`, `offer`, `match`, `llm`, `sync`, `member`, `node`, `sn`, `tier`, `learn`, `evolve`, `mastermind`, `device`, `mcp`, `emergency`, `auth`, `gc`, `ai`, `setup`, `alias`, `version`, `help`, `exit`, `format`, `mode`, `succinct`, `debug`, …).
4. **Unrecognised input** falls through to `processNaturalLanguageIntent()` in `aiClient.ts`.

---

### Step 5 — Semantic Dispatcher (REST path)

**File**: `src/cli/semanticDispatcher.ts`

Used by `POST /api/v1/command` (the structured REST command endpoint, separate from the Web UI `/api/command`).

1. `parseSemanticCommand()` tokenises and identifies `entity` + `action` tokens.
2. `normalizeSemanticEntity()` maps multilingual synonyms (EN/ES/PT/FR/DE) to a canonical `SemanticEntity`.
3. `executeSemanticCommand()` dispatches to the correct command handler.

---

### Step 6 — AI Client (Natural Language Path)

**File**: `src/cli/aiClient.ts`

1. `loadEnvironment()` reads `.env` for `GEMINI_API_KEY`.
2. `getCostGovernanceConfig()` decides which Gemini model tier to use (`FreeTierFirst` → tries `gemini-flash-latest`, falls back to paid models on exhaustion).
3. Builds a structured prompt that includes:
   - Detected interaction language
   - Succinct mode flag
   - User preference block
   - Critical output separation mandate (JSON with `explanation`, `thinkingDetails`, `debugDetails`)
4. Calls `@google/genai` → Gemini model.
5. Parses JSON response into `ParsedIntentResult`:
   - `explanation` → `writeOutput(USER_REPLY, …)` → shown in Conversation tab
   - `thinkingDetails` → `writeOutput(THINKING, …)` → shown in Thinking tab
   - `debugDetails` → `writeOutput(DEBUG, …)` → shown in Debug tab
6. Records token usage via `addSessionTokens()` in `usageEngine`.

---

### Step 7 — Output Router → EventBus → SSE → Browser

**Files**: `src/cli/outputRouter.ts` · `src/api/events/EventBus.ts` · `src/api/events/SseStreamHandler.ts`

1. `writeOutput(channel, content)` → because `activeOutputListener` is set in API mode, it calls it instead of writing to stdio.
2. The listener calls `EventBus.getInstance().publish("output.message", …)`.
3. `EventBus` stores the event in its rolling 1 000-event history and emits it to all registered listeners.
4. `SseStreamHandler` has a permanent listener on `"event"` for every open SSE client; it serialises the envelope and writes `data: …\n\n` to the response stream.
5. The browser's `EventSource.onmessage` receives the event, parses the JSON, and routes it to `appendLog(channel, content)` which renders it in the correct tab.

---

### Step 8 — Storage Layer

**Files**: `src/cli/context.ts` · `src/cli/sqliteStorageEngine.ts` · `src/repositories/`

- **Primary store**: SQLite in WAL mode (`.inuo.db`). Tables: `projects`, `workspaces`, `tasks`, `chats`, `integrations`, `preferences`, `collection_sync_meta`.
- **Legacy / fallback**: `.inuo-state.json` — JSON flat file, used when SQLite is unavailable or for fields not yet migrated.
- `loadState()` / `saveState()` manage the JSON file; `rehydrateStateFromSqlite()` / `persistStateToSqlite()` sync with SQLite.
- Path is configurable via `INUO_DATA_DIR` / `DATA_DIR` env vars.

---

## 3. Failure Points Catalogue

> **Tech Debts**: Failure points with no current fix or only a silent/partial guard have been extracted to [`tech-debts.md`](tech-debts.md) (9 items: TD-01 → TD-09). Only fully-mitigated failures are listed below.

### Layer 0 — Web UI

| # | Failure | Cause | Effect | Mitigation in code |
|---|---------|-------|--------|-------------------|
| F-01 | `fetch("/api/command")` network error | Server unreachable / port blocked | `catch` block fires; `appendErrorWithRetry()` rendered | Retry button in UI; user can re-send |
| F-02 | HTTP non-2xx response from `/api/command` | Server error, JSON parse failed, manipulation block | Error message logged in DEBUG tab | `appendErrorWithRetry()` with HTTP status detail |
| F-03 | `EventSource` disconnect / error | Server restart, network interruption | `onerror` fires; browser retries automatically via SSE spec | `SERVER_HELLO` restart detection triggers `window.location.reload()` |
| F-04 | `CLARIFICATION` payload malformed | Bad JSON from server | Falls through to `appendLog()` instead of rendering widget | `try/catch` around clarification parse |
| F-05 | LLM config dialog save fails | Network error or validation error | `llmFormError` element shows server error message | `finally` re-enables Save button |
| ~~F-06~~ | *(moved to [tech-debts.md TD-01](tech-debts.md))* | | | |

---

### Layer 1 — API Server

| # | Failure | Cause | Effect | Mitigation in code |
|---|---------|-------|--------|-------------------|
| F-07 | Port already in use | Another process on 8765 | `server.on("error")` fires; `reject(err)` propagates | Error surfaced to caller; process exits |
| F-08 | `setOutputListener` not called before first request | Race condition at startup | AI output goes to stdio, not SSE | `start()` sets listener before `server.listen()` |
| F-09 | `EventBus` history overflow | High-frequency output (>1 000 events) | Oldest events evicted, reconnecting clients miss them | `maxHistorySize = 1000`; use `Last-Event-ID` header to replay |

---

### Layer 2 — Router

| # | Failure | Cause | Effect | Mitigation in code |
|---|---------|-------|--------|-------------------|
| F-10 | Manipulation Defense false positive | Legitimate input matches injection pattern | HTTP 403 returned; user command blocked | Event published on EventBus (`trust.penalized`); pattern exposed in response |
| F-11 | JSON parse error on body | Client sends malformed JSON | HTTP 400 `Malformed JSON payload` | `try/catch` around `JSON.parse` |
| F-12 | Directory traversal attempt on static files | Path with `../` in URL | Guard `!filePath.startsWith(publicDir)` → `serveStatic` returns `false` | Falls to route matrix, likely 404 |
| F-13 | Missing route | Unknown path | HTTP 404 `Route not found` | Catch-all at bottom of `handleRequest` |
| F-14 | `readBody` stream error | Abruptly closed connection mid-request | `req.on("error")` → resolves with empty string | Empty body treated as no-op |
| F-15 | Secret field in LLM config POST | Caller sends `apiKey`, `secret`, etc. | HTTP 400, field name exposed in error | Regex check before `saveLLMConfiguration` |

---

### Layer 3 — Shell Dispatcher

| # | Failure | Cause | Effect | Mitigation in code |
|---|---------|-------|--------|-------------------|
| F-16 | Unrecognised command keyword | User types unknown verb | Falls through to AI NL intent (layer 5) | Graceful: AI handles it or explains |
| ~~F-17~~ | *(moved to [tech-debts.md TD-02](tech-debts.md))* | | | |
| F-18 | Command handler throws synchronously | Bug in a specific command module | Unhandled exception propagates to `Router.handleRequest` catch → HTTP 500 | `try/catch` in `/api/command` handler in Router |

---

### Layer 4 — Semantic Dispatcher

| # | Failure | Cause | Effect | Mitigation in code |
|---|---------|-------|--------|-------------------|
| F-19 | Unknown entity token | Input token not in multilingual synonym map | `normalizeSemanticEntity` returns `null` | Falls back to AI or returns an "unknown entity" message |
| F-20 | Unknown action token | Verb not in `SemanticAction` type | `parseSemanticCommand` cannot build a valid payload | Returns null payload → caller handles |
| F-21 | Missing required fields in payload | REST caller omits `entity` or `action` | Dispatch returns error to caller | Validation inside `parseSemanticCommand` |

---

### Layer 5 — AI Client (Gemini)

| # | Failure | Cause | Effect | Mitigation in code |
|---|---------|-------|--------|-------------------|
| F-22 | Missing Gemini API key | `.env` not configured or key deleted | `writeOutput(USER_REPLY, dict.errors.apiKeyMissing)` | Early return with i18n error message |
| F-23 | Gemini API returns non-JSON or malformed JSON | Model deviation, network truncation | `JSON.parse` throws; NL intent returns `null` | `try/catch` falls back gracefully |
| F-24 | Free-tier model exhausted (quota) | All free models return quota errors | `recordModelExhaustion()` tracks; `handleFreeTierExhaustion()` prompts consent for paid tier | `FreeTierFirst` → iterates `freeModelsPool`; promotes to paid on consent |
| F-25 | Paid-tier model exhausted | All paid models return quota/billing errors | No further fallback; user informed | Error surfaced via `writeOutput` |
| F-26 | Network timeout / Gemini unreachable | Connectivity issues | Promise rejection; `null` returned | `try/catch` with error output via `writeOutput(DEBUG, …)` |
| F-27 | Language detection mismatch | `modeConfig.detectedLanguage` stale or wrong | AI prompt targets wrong language; response in wrong locale | `languageEngine.detectLanguage()` re-evaluates on each input |
| ~~F-28~~ | *(moved to [tech-debts.md TD-03](tech-debts.md))* | | | |

---

### Layer 6 — Output Router

| # | Failure | Cause | Effect | Mitigation in code |
|---|---------|-------|--------|-------------------|
| F-29 | `activeOutputListener` null in API mode | Listener not set before first output | Output written to `stdout`/`stderr` instead of SSE | `ApiServer.start()` sets listener before `server.listen` |
| ~~F-30~~ | *(moved to [tech-debts.md TD-04](tech-debts.md))* | | | |

---

### Layer 7 — EventBus / SSE

| # | Failure | Cause | Effect | Mitigation in code |
|---|---------|-------|--------|-------------------|
| F-31 | SSE client disconnects mid-stream | Browser tab closed, network drop | `req.on("close")` removes EventBus listener cleanly | `bus.removeListener("event", listener)` |
| F-32 | Missed events after reconnect | Client reconnects after gap > history window | `Last-Event-ID` replay covers up to 1 000 events | `bus.getHistorySince(lastEventId)` replays on `SseStreamHandler.handle` |
| F-33 | EventBus singleton memory leak | Long-running server with high event volume (>1000) | Oldest events silently dropped | `maxHistorySize` cap with `shift()` |
| ~~F-34~~ | *(moved to [tech-debts.md TD-05](tech-debts.md))* | | | |

---

### Layer 8 — Storage

| # | Failure | Cause | Effect | Mitigation in code |
|---|---------|-------|--------|-------------------|
| F-35 | SQLite module unavailable | Node version < 22, missing build | `DatabaseSync = null`; graceful fallback to JSON file | Dynamic `require` wrapped in `try/catch` |
| F-36 | `.inuo-state.json` read error | Corrupted file, permission denied | `loadState` returns empty default state | `try/catch` returns `{}` cast to `StateData` |
| ~~F-37~~ | *(moved to [tech-debts.md TD-06](tech-debts.md))* | | | |
| ~~F-38~~ | *(moved to [tech-debts.md TD-07](tech-debts.md))* | | | |
| ~~F-39~~ | *(moved to [tech-debts.md TD-08](tech-debts.md))* | | | |
| ~~F-40~~ | *(moved to [tech-debts.md TD-09](tech-debts.md))* | | | |

---

## 4. Flow Summary Diagram (Prompt to Response)

```
User input
    │
    ▼  HTTP POST /api/command
[Router] ──CORS──► [ManipulationDefense] ──block?──► 403 Forbidden
    │                                                 ▲
    │ pass                                            │
    ▼                                            F-10 (false positive)
[executeShellLine]
    │
    ├─► known keyword ──► [Command Handler] ──► [Storage] ──► writeOutput
    │
    └─► unknown ──► [processNaturalLanguageIntent]
                          │
                          ├─ no API key ──► F-22 error message
                          │
                          ├─► [CostGovernance: pick model]
                          │        └─ exhausted ──► F-24/F-25 escalation
                          │
                          ├─► [Gemini API call]
                          │        └─ failure ──► F-23/F-26 error
                          │
                          └─► ParsedIntentResult
                                    │
                                    ▼
                             [writeOutput]
                                    │
                                    ▼
                             [OutputRouter listener]
                                    │
                                    ▼
                             [EventBus.publish]
                                    │
                                    ▼
                        [SseStreamHandler ──► Browser]
                                    │
                                    ▼
                          appendLog() renders response
```

---

## 5. Key Files Reference

| Layer | File(s) |
|-------|---------|
| Web UI | `browser/app.ts` · `browser/i18n.ts` |
| API Server | `src/api/ApiServer.ts` |
| Router | `src/api/routes/Router.ts` |
| Middleware | `src/api/middleware/CorsMiddleware.ts` · `src/api/middleware/ManipulationDefenseMiddleware.ts` |
| SSE / EventBus | `src/api/events/EventBus.ts` · `src/api/events/SseStreamHandler.ts` |
| Shell Dispatcher | `src/cli/shell.ts` |
| Semantic Dispatcher | `src/cli/semanticDispatcher.ts` |
| AI Client | `src/cli/aiClient.ts` |
| Cost Governance | `src/cli/costGovernanceEngine.ts` |
| Output Router | `src/cli/outputRouter.ts` |
| Context / State | `src/cli/context.ts` |
| SQLite Storage | `src/cli/sqliteStorageEngine.ts` |
| Repositories | `src/repositories/` |
| Enums | `src/enums/OutputChannelEnum.ts` · `src/enums/ManipulationCategoryEnum.ts` |

---

*Generated: 2026-08-17 — auto-documented from source traversal of the iNoU repository.*

