# Progressive Clarification Engine — ClarificationLedger, Q-IDs, Elicitation Gating

- id: 0006
- status: pending
- createdAt: 2026-08-16
- owner: iNoU Team
- source: gap-analysis / Phase 3 / main-specs-goals.md §8

## Context

`main-specs-goals.md` §1.2 and §8 Phase 3 specify an immutable clarification
system with unique permanent identifiers (`[Q-001]`, `[Q-002]`…) and a
non-nagging single-question delivery model (one clarification at a time).
This is entirely unimplemented and has no dedicated spec file.

Required components:
- `ContextElicitationManager.ts` — determines when the AST has sufficient context
  to proceed vs. when a clarification is needed
- `ClarificationLedger.ts` — immutable registry of all Q-IDs, their prompts,
  status (`PENDING` / `ANSWERED`), and user answers
- Dual planning modes: `OVERVIEW` (top-down breadth-first) vs.
  `GO_DEEP` (recursive leaf-level breakdown)
- `clarification_ledger` SQLite table (already in `main-specs-goals.md` §6.1 DDL
  but not in `sqlite_schema_and_indexes.specs.md`)

## Proposed Change

### Spec (create first)
Create `docs/tech-specs/clarification_engine.specs.md` covering:
- Q-ID immutability rules and namespace (`[Q-NNN]` format)
- Context sufficiency check algorithm
- Single-question delivery gate
- OVERVIEW vs GO_DEEP mode switching
- `clarification_ledger` table definition (canonical DDL)

### Implementation
1. Add `clarification_ledger` table to `sqlite_schema_and_indexes.specs.md`
2. `src/cli/ClarificationLedger.ts` — CRUD for Q-ID records
3. `src/cli/ContextElicitationManager.ts` — sufficiency check and question dispatch
4. CLI commands: `inou plan questions`, `inou plan answer <qid> "<text>"`
5. Mode flag: `inou plan create --mode overview|go-deep`

## Acceptance

- [ ] `clarification_engine.specs.md` written and cross-linked from `main-specs-goals.md` §3 and §8
- [ ] `clarification_ledger` table in canonical DDL file
- [ ] Q-IDs are immutable — same QID is never reused or renumbered
- [ ] Only one `PENDING` question is surfaced to the user at a time
- [ ] `inou plan answer Q-001 "Bogota"` persists answer and unblocks planning
- [ ] OVERVIEW mode generates breadth-first WBS; GO_DEEP decomposes a single node recursively
- [ ] Unit tests for Q-ID uniqueness and single-question gate
