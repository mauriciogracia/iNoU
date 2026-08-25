# Unified Canonical SQLite DDL — Resolve Schema Conflicts

- id: 0003
- status: pending
- createdAt: 2026-08-16
- owner: iNoU Team
- source: gap-analysis / tech-specs review

## Context

Three spec files define overlapping, inconsistent DDL schemas for the same tables:

| Spec File | Problem |
|---|---|
| `main-specs-goals.md` §6.1 | Defines `projects`, `nodes`, `dependency_edges`, `execution_runs`, `telemetry_events`, `cloud_sync_journal` |
| `storage_and_sync_architecture.specs.md` §2.3 | Defines `projects`, `workspaces`, `tasks`, `memories`, `preferences` — missing sync fields |
| `sqlite_schema_and_indexes.specs.md` §2 | Most complete — has sync fields, `integrations`, full index set |

Conflicts include:
- `projects` table: sync columns missing in `storage_and_sync_architecture.specs.md`
- `cloud_sync_journal.entity_type`: `('PROJECT','WORKFLOW','NODE','EDGE','CLARIFICATION')` vs `('PROJECT','WORKFLOW','TASK','EDGE','PREFERENCE','INTEGRATION')`
- `memories` table: missing `owner`, `scope`, `trust_level`, `provenance` fields required by `main-specs-goals.md` §10.6 adaptive learning rules
- `preferences` table: flat `key TEXT PRIMARY KEY` in one file vs `storage_key + scope` composite in another

## Proposed Change

1. Designate `docs/tech-specs/sqlite_schema_and_indexes.specs.md` as the **single authoritative DDL**.
2. Remove DDL blocks from `storage_and_sync_architecture.specs.md` (keep architecture narrative only).
3. Remove DDL blocks from `main-specs-goals.md` §6.1 (keep reference link to canonical DDL file).
4. Add missing adaptive learning fields to `memories` table:
   `owner TEXT`, `scope TEXT DEFAULT 'PrivateUser'`, `trust_level INTEGER DEFAULT 50`,
   `provenance TEXT`, `deactivated_at TEXT`.
5. Harmonize `cloud_sync_journal.entity_type` to include all entity types used in code.
6. Add missing `memories` repository entries in `collection_sync_meta`.

## Acceptance

- [ ] Single DDL source — `sqlite_schema_and_indexes.specs.md` is the only file with `CREATE TABLE` statements
- [ ] `memories` table includes all mandatory adaptive learning fields from spec §10.6
- [ ] `cloud_sync_journal.entity_type` enum is consistent between spec and `sqliteStorageEngine.ts`
- [ ] `storage_and_sync_architecture.specs.md` contains only narrative + sync algorithm, no DDL
- [ ] `main-specs-goals.md` §6.1 references canonical DDL file instead of duplicating it
