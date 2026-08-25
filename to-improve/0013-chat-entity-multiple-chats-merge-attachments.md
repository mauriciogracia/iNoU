# Chat Entity — Multiple Chats, Merge, Attachments & Inconsistency Detection

- id: 0013
- status: pending
- createdAt: 2026-08-17
- owner: iNoU Team
- source: user request / spec elicitation 2026-08-17

## Context

iNoU currently has no concept of a persistent chat session. Every shell
or browser interaction runs against a single implicit context window with
no history isolation, no naming, and no way to switch between parallel
conversations.

Full feature specification in:
[`docs/tech-specs/chat_feature.specs.md`](file:///d:/repos/iNoU/docs/tech-specs/chat_feature.specs.md)

Three capabilities are bundled as one entity roll-out because they share
the same DDL, repository, and UI panel:

1. **Multiple named chats** — `chat` as a first-class iNoU entity (SQLite,
   Colmena-syncable, CRUD via semantic dispatcher, right-panel UI).
2. **Chat merge** — chronological interleave of 2+ chat histories with
   optional source deletion; multi-select UI with Merge dialog.
3. **Chat attachments** — any file type, per-chat persistent context,
   hybrid disk + SQLite storage, LLM content extraction, version lineage
   detection; three-zone prompt UI (history / attachment bar / input).
4. **`chat check`** — LLM-assisted inconsistency detector producing
   structured `[INC-NNN]` reports (contradictions, open questions,
   attachment conflicts).

## Open Questions (must resolve before implementation starts)

- OQ-1: Should `thinking`/`debug` output be persisted in `chat_messages`
  with role `thinking` / `diagnostic`?
- OQ-2: Maximum attachment file size before a warning is shown?
- OQ-3: Should `chat export --format md` include attachment summaries inline?
- OQ-4: When Colmena syncs chats, do raw attachment files sync too, or
  only the metadata + content summary?

## Proposed Change

### Backend / CLI

- Add `chat` to `SemanticEntity` type (`src/types/SemanticEntity.ts`)
- Add custom actions `open`, `rename`, `check`, `merge`, `attach`, `detach`
  to action normalisation in `semanticDispatcher.ts`
- Implement `executeChatAction` handler in `semanticDispatcher.ts`
- Wire `chat` into `shell.ts` switch (mirrors `node`, `llm`, etc.)
- Implement `src/repositories/ChatRepository.ts` (extends `BaseRepository`)
- Attachment pipeline in `src/cli/chatAttachmentEngine.ts`:
  - Save raw file to `.inuo/attachments/<chat_id>/`
  - Call LLM to extract content summary
  - Detect version lineage by name similarity + summary comparison
- Update `src/cli/aiClient.ts`:
  - Load active chat message history as context window on each call
  - Pass chat attachments as `inlineData` parts alongside the text prompt
- Add SQLite DDL (in `sqlite_schema_and_indexes.specs.md`):
  - `chats`, `chat_messages`, `chat_attachments` tables + indexes
  - `chat_attachments` added to `cloud_sync_journal` entity types

### Autocomplete & Spec

- `src/cli/autocomplete.ts`: add `chat` entity, all actions, all flags
- `docs/to-improve/inouCommandsSemantics.md`: add §4.6 `chat` section

### Web UI (`browser/app.ts` + `public/index.html` + `public/style.css`)

- **Right-side chat panel** (collapsible, expanded by default):
  - Search/filter by ID or title
  - Checkbox per row for multi-select operations
  - Active chat pinned at top in accent color
  - `[+ New Chat]` and `[Merge ▼]` (enabled when ≥ 2 selected) buttons
  - Merge dialog: title field + Keep/Delete originals toggle
  - ⚠ "Check" icon per row → opens inconsistency report panel
- **Three-zone prompt area** (replaces current single input bar):
  - Zone 1: Chat history (message bubbles)
  - Zone 2: Attachment context bar — persistent file chips with `×` remove
  - Zone 3: Prompt input with 📎 file-picker button + staged attachment chips
- Drag-and-drop onto prompt area triggers file attach flow

## Acceptance

- [ ] `chat add` / `chat list` / `chat open` / `chat rename` / `chat remove` work end-to-end
- [ ] Active chat context is loaded into LLM on every prompt
- [ ] `chat merge <id1> <id2>` interleaves messages chronologically
- [ ] `--delete-sources` flag deletes originals; default archives them
- [ ] `chat check` returns structured `[INC-NNN]` report for a given chat
- [ ] `chat attach <file>` saves file to disk and SQLite, extracts summary via LLM
- [ ] Version lineage is detected and `previous_version` FK is set when applicable
- [ ] Attachment is passed as `inlineData` in the next LLM call
- [ ] `chat detach <attachment-id>` removes attachment from context
- [ ] Right-panel chat list renders in Web UI with search + multi-select
- [ ] Merge dialog opens when ≥ 2 chats are selected
- [ ] Attachment context bar renders between history and prompt input
- [ ] 📎 button opens file picker; drag-and-drop also works
- [ ] Staged chips appear above input while composing; `×` removes them
- [ ] `chat` entity appears in `help` output and is tab-completable
- [ ] OQ-1 through OQ-4 answered and reflected in implementation
- [ ] `sqlite_schema_and_indexes.specs.md` updated with `chats`, `chat_messages`, `chat_attachments` DDL
- [ ] `inouCommandsSemantics.md` §4.6 `chat` section added
