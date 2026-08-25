# Workflow Node CRUD Commands

- id: 0002
- status: done
- completedAt: 2026-08-14
- owner: iNoU Team
- source: user request

## What Changed

Added workflow node CRUD command support through the shell dispatcher.

Command surface:

- `node add <nodeName> <engineConfiguration>`
- `node list`
- `node update <nodeName> <engineConfiguration>`
- `node remove <nodeName>`

Implementation includes:

- New workflow node state model persisted in `.inuo-state.json`
- New `runNodeCommand` handler integrated into command routing
- Shell help text updated with node command references
- Unit tests for add/list/update/remove flow through `executeShellLine`

## Validation

- [x] TypeScript build passed
- [x] node command tests passed
- [x] command dispatcher regression test passed
