# DAG Execution Engine — RunOrchestrator, CPM, AppModeManager, ArtifactRegistry

- id: 0005
- status: pending
- createdAt: 2026-08-16
- owner: iNoU Team
- source: gap-analysis / Phase 1 blocker / main-specs-goals.md §8

## Context

`main-specs-goals.md` §4.2 and §8 Phase 1 list the DAG Execution Engine as a
core Phase 1 deliverable. It is **entirely unspecced and unimplemented**.
No source file exists for any of its components.

Required components (from §8):

- `RunOrchestrator.ts` — main execution loop: topological sort → dispatch → telemetry
- `AppModeManager.ts` — enforces EDIT_MODE / DRY_RUN_MODE / RUN_MODE isolation
- `ArtifactRegistry.ts` — tracks artifact URIs, hashes, and lifecycle
- Tarjan's cycle detection algorithm on the dependency graph
- Critical Path Method (CPM) engine for scheduling

A dedicated spec file (`dag_execution_engine.specs.md`) also does not exist —
the only documentation is a Mermaid diagram in §4.2 and phase bullet points in §8.

## Proposed Change

### Spec (create first)
Create `docs/tech-specs/dag_execution_engine.specs.md` covering:
- `AppModeManager` tri-mode state machine and transition rules
- `RunOrchestrator` execution loop pseudocode and event contracts
- Tarjan's algorithm integration for cycle detection
- CPM critical path calculation and node scheduling
- `ArtifactRegistry` schema and lookup interface

### Implementation
1. `src/cli/AppModeManager.ts` — enum guard and mode-transition methods
2. `src/cli/RunOrchestrator.ts` — topological sort, parallel dispatch, telemetry emit
3. `src/cli/ArtifactRegistry.ts` — artifact registration, hash verification, cleanup
4. Tarjan cycle detection utility (pure function, testable standalone)
5. CPM engine utility returning critical path node list and float values
6. Wire `inou run --workflow <id> --mode dry-run|live` CLI command through `RunOrchestrator`

## Acceptance

- [ ] `dag_execution_engine.specs.md` written and cross-linked from `main-specs-goals.md` §4
- [ ] `AppModeManager` blocks AST mutations when in DRY_RUN or RUN mode
- [ ] `RunOrchestrator` dispatches nodes in topologically sorted order
- [ ] Cycle in dependency graph is detected and reported before execution starts
- [ ] DRY_RUN injects `dryRunMockPayload` instead of executing live
- [ ] `ArtifactRegistry` records outputs after each node completes
- [ ] Unit tests for cycle detection, topological sort, and CPM
- [ ] `inou run --workflow <id> --mode dry-run` runs end-to-end in test
