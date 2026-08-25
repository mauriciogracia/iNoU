# Missing Repositories: WorkflowRepository, NodeRepository, MemoryRepository

- id: 0004
- status: pending
- createdAt: 2026-08-16
- owner: iNoU Team
- source: gap-analysis / Phase 1 blocker

## Context

`main-specs-goals.md` §2.1 defines three repository interfaces that have no
implementation in `src/repositories/`:

- `IWorkflowRepository` → `WorkflowRepository.ts` (missing)
- `INodeRepository` → `NodeRepository.ts` (missing)
- (implicitly) `MemoryRepository.ts` (missing — required by REST `GET/POST/DELETE /api/v1/memory`)

`src/repositories/` currently contains only:
`BaseRepository`, `IntegrationRepository`, `PreferenceRepository`,
`ProjectRepository`, `TaskRepository`, `WorkspaceRepository`.

Without `WorkflowRepository` and `NodeRepository`, the workflow DAG CLI commands
fall back to in-memory or flat-file state instead of SQLite persistence.
Without `MemoryRepository`, the `/api/v1/memory` REST endpoints have no
data layer.

`src/api/controllers/` is also missing `MemoryController.ts`.

## Proposed Change

1. Implement `src/repositories/WorkflowRepository.ts` extending `BaseRepository<Workflow>`
   against the `workflows` table.
2. Implement `src/repositories/NodeRepository.ts` extending `BaseRepository<INOUCompositeNode>`
   against the `tasks` / `nodes` table, including `findBySemanticPath` and `updateState`.
3. Implement `src/repositories/MemoryRepository.ts` for the `memories` table.
4. Implement `src/api/controllers/MemoryController.ts` wiring `POST/GET/DELETE /api/v1/memory`.
5. Register all new controllers in `src/api/routes/Router.ts`.
6. Update `src/repositories/index.ts` barrel exports.

## Acceptance

- [ ] `WorkflowRepository` implements all `IWorkflowRepository` methods
- [ ] `NodeRepository` implements `findBySemanticPath` and `updateState`
- [ ] `MemoryRepository` CRUD persists to `.inuo.db` `memories` table
- [ ] `GET /api/v1/memory` returns records from SQLite (not flat-file)
- [ ] `POST /api/v1/memory` and `DELETE /api/v1/memory/:id` work end-to-end
- [ ] Unit tests cover all new repository methods
