# Chat Feature Specification

| Property | Value |
| :--- | :--- |
| **Status** | `DRAFT — elicited 2026-08-17` |
| **Features** | Multiple Chats · Chat Merge · Chat Attachments |
| **Entities** | `chat`, `chat_message`, `chat_attachment` |
| **Dev Rules** | §7.1 Semantic Command Spec Parity · §7.2 UI Parity |

---

## 1. Multiple Chats

### 1.1 Concept

`chat` is a first-class iNoU entity — equivalent to `project`, `task`,
`preference`. It follows all entity lifecycle rules:

- Stored in local SQLite (`.inuo.db`) by default
- Syncable via Colmena like any other entity
- CRUD through `semanticDispatcher` + `shell.ts`
- Listed with IDs and human-friendly titles

Only **one chat is active at a time** (analogous to `activeProject`).
The active chat is where all prompts are executed. Each chat maintains its
own independent LLM context window.

If no chat is active when the user sends a message, iNoU auto-creates a new
chat with an AI-generated title and sets it as active.

---

### 1.2 CLI Command Surface (`chat` entity)

```
chat add [--title "<title>"]            — create a new chat (auto-title if omitted)
chat list                               — list all chats (active first)
chat open <id|title>                    — set a chat as active
chat rename <id|title> --title "<new>"  — rename a chat
chat remove <id|title>                  — delete a chat and its messages
chat export <id|title> [--format json|md]  — export chat history
chat check <id|title>                   — detect inconsistencies in a chat
chat merge <id1> <id2> [<id3>…]        — merge two or more chats
```

**Multilingual aliases** (normalised by `semanticDispatcher`):

| Token | Maps to |
|---|---|
| `chat` / `conversacion` / `conversation` / `gespräch` | `chat` entity |
| `open` / `abrir` / `ouvrir` | `enable` action |
| `rename` / `renombrar` / `renommer` | `update` action |
| `check` / `verificar` / `vérifier` | custom action `check` |
| `merge` / `combinar` / `fusionner` | custom action `merge` |

---

### 1.3 SQLite DDL

```sql
CREATE TABLE IF NOT EXISTS chats (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'Active',   -- Active | Archived
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  last_sync_at TEXT,
  sync_version INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id         TEXT PRIMARY KEY,
  chat_id    TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  role       TEXT NOT NULL,   -- 'user' | 'assistant' | 'system' | 'thinking' | 'diagnostic'
  content    TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON chat_messages(chat_id);
```

---

### 1.4 Web UI — Chat Panel (Right Side)

```
┌──────────────────────────────────────────────┐
│  🔍 Search chats by id or title  [input]     │
├──────────────────────────────────────────────┤
│ ☑ [ACTIVE] my-project-planning  2026-08-17  │  ← highlighted, pinned top
│ ☐  trip-to-colombia             2026-08-15  │
│ ☐  code-review-session          2026-08-14  │
│ ☐  architecture-discussion      2026-08-13  │
├──────────────────────────────────────────────┤
│  [+ New Chat]          [Merge ▼]            │  ← Merge enabled when ≥2 selected
└──────────────────────────────────────────────┘
```

- Panel is **collapsible** (toggle button at top-right of layout)
- Expanded by default
- Each row = one chat with: checkbox · title · last-updated date
- Active chat is always at top, highlighted in accent color
- **Search** autocompletes by ID or title (client-side filter)
- Clicking a non-active chat row switches active chat

---

## 2. Chat Merge

### 2.1 Semantics

Merge is a **history-preserving** operation on 2 or more chats.
It does **not** summarise, alter, or paraphrase message content.
It produces a new chat whose message history is the chronological
interleave of all source chat messages.

### 2.2 Merge Flow

1. User selects ≥ 2 chats via checkboxes in the right panel
2. **Merge** button activates
3. User clicks Merge → confirmation dialog:
   - Title for the merged chat (pre-filled: `merge of <title-a> + <title-b>`)
   - Toggle: **Keep originals** (default) or **Delete originals after merge**
4. New merged chat is created, set as active
5. Source chats archived or deleted per user choice

### 2.3 CLI Merge Command

```
chat merge <id1> <id2> [<id3>…] [--title "<title>"] [--delete-sources]
```

- `--delete-sources` mirrors the UI toggle
- Without the flag: sources are kept as `Archived`

### 2.4 Inconsistency Detection — `chat check`

Separate from merge. Runs an LLM-assisted analysis of a single chat to:

- Detect contradictory statements or facts within the conversation
- Flag unresolved decisions or open questions
- Report conflicts in a structured list (ID · severity · excerpt · turn)

```
chat check <id|title> [--format text|json]
```

Output example (text):
```
=== Chat Inconsistencies: "my-project-planning" ===

[INC-001] CONFLICT  — Turn 4 says "use SQLite only", Turn 12 says "use Postgres"
[INC-002] OPEN      — "Confirm jurisdiction for Colombia" was never answered
[INC-003] CONFLICT  — Attachment "schema-v2.sql" contradicts schema in Turn 7
```

Web UI: a **"Check"** icon button (⚠) on each chat row triggers the check
and displays the report as a panel below the chat header.

---

## 3. Chat Attachments

### 3.1 Concept

Attachments are **per-chat and persistent** — once a file is attached to a
chat, it stays in the chat's context for all future messages until the user
explicitly removes it.

Any file type is accepted. iNoU passes the file to the LLM for content
understanding and extraction. iNoU also detects if an incoming file is a
**new version** of a previously attached file (by filename similarity and
content embedding comparison).

### 3.2 Storage — Hybrid

| Layer | What is stored |
|---|---|
| **Disk** | Raw file at `.inuo/attachments/<chat_id>/<uuid>_<original_filename>` |
| **SQLite** | Metadata row: path, MIME type, LLM-extracted content summary, version lineage, uploaded_at |

```sql
CREATE TABLE IF NOT EXISTS chat_attachments (
  id               TEXT PRIMARY KEY,
  chat_id          TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  original_name    TEXT NOT NULL,
  storage_path     TEXT NOT NULL,   -- relative to workspace root
  mime_type        TEXT,
  size_bytes       INTEGER,
  content_summary  TEXT,            -- LLM-extracted summary
  previous_version TEXT REFERENCES chat_attachments(id),  -- version lineage
  uploaded_at      TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_attachments_chat_id ON chat_attachments(chat_id);
```

### 3.3 Version Detection

When a file is attached iNoU checks:
1. Name similarity to existing attachments in the same chat
2. If similar name found → LLM compares content summaries
3. If likely a new version → `previous_version` FK is set and user is notified:
   `"schema-v2.sql" looks like a new version of "schema-v1.sql". Linked as revision.`

### 3.4 CLI Command Surface

```
chat attach <file-path> [--chat <id>]    — attach file to active or named chat
chat attachments [--chat <id>]           — list attachments of a chat
chat detach <attachment-id>              — remove an attachment from a chat
```

### 3.5 Web UI Layout — Three-Zone Input Area

```
┌────────────────────────────────────────────────────────────────┐
│  CHAT HISTORY                                                  │
│  ...message bubbles...                                         │
├────────────────────────────────────────────────────────────────┤
│  ATTACHMENT CONTEXT BAR  (shown only when ≥1 attachment)       │
│  [📄 schema-v2.sql ×]  [🖼 mockup.png ×]  [📝 notes.md ×]      │
├────────────────────────────────────────────────────────────────┤
│  PROMPT INPUT                                                  │
│  iNoU >  [text input .............]  [📎]  [Send ▶]           │
│  (staged chips appear here while composing, removable with ×) │
└────────────────────────────────────────────────────────────────┘
```

- **📎 button** opens a file picker (any file type)
- Drag-and-drop onto the prompt area triggers attachment
- **Staged chips** (while composing): shown above the input, removable with `×`
- **Attachment context bar**: persistent chips for all files currently in chat context
- Chips are clickable to preview/download; `×` removes from chat context

---

## 4. Open Questions (resolve before implementation)

| # | Question |
|---|---|
| OQ-1 | Should `thinking` and `debug` output be stored as special-role messages in `chat_messages` (role = `thinking` / `diagnostic`)? |
| OQ-2 | Maximum attachment file size before warning? (Gemini Files API supports up to 2 GB) |
| OQ-3 | Should `chat export --format md` include attachment content summaries inline? |
| OQ-4 | When Colmena syncs chats, do attachment files sync too, or only metadata? |

---

## 5. Implementation Checklist (§7.2)

- [ ] `chat` entity added to `SemanticEntity` type
- [ ] `chat` custom actions (`open`, `rename`, `check`, `merge`, `attach`, `detach`) added to `SemanticAction` or handled via entity-specific switch
- [ ] `normalizeSemanticEntity` updated in `semanticDispatcher.ts` with multilingual aliases
- [ ] `executeChatAction` handler implemented in `semanticDispatcher.ts`
- [ ] `shell.ts` wired for `chat` as a top-level command
- [ ] `autocomplete.ts` updated — `chat` entity + all actions + flags
- [ ] `inouCommandsSemantics.md` §4.6 `chat` section added
- [ ] SQLite DDL: `chats`, `chat_messages`, `chat_attachments` tables + indexes
- [ ] `ChatRepository.ts` implemented (extends `BaseRepository`)
- [ ] Attachment pipeline: file save → LLM extract → version detect
- [ ] `aiClient.ts` updated to load active chat history as context window
- [ ] `aiClient.ts` updated to pass attachments as `inlineData` parts
- [ ] Web UI: right-panel chat list (search + rows + checkboxes + Merge button)
- [ ] Web UI: three-zone input area (history / attachment bar / prompt)
- [ ] Web UI: merge confirmation dialog
- [ ] Web UI: `chat check` inconsistency report panel (⚠ per row)
- [ ] `chat_attachments` added to `cloud_sync_journal` entity types
- [ ] `to-improve/` ticket opened for any deferred work
