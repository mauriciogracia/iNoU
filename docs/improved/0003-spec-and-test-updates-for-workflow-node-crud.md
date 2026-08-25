# Spec and Test Updates for Workflow Node CRUD

- id: 0003
- status: done
- completedAt: 2026-08-14
- owner: iNoU Team
- source: user request

## What Changed

Updated the canonical specification and test coverage to explicitly include workflow node CRUD commands.

Spec updates:

- Added workflow node orchestration section with node model fields.
- Added canonical CLI contract:
  - `node add <nodeName> <engineConfiguration>`
  - `node list`
  - `node update <nodeName> <engineConfiguration>`
  - `node remove <nodeName>`
- Added integrity rules for uniqueness and missing-node handling.

Test updates:

- Extended command dispatcher tests to verify node add/update/remove execution through `executeShellLine`.
- Kept dedicated node CRUD unit tests as feature-level coverage.

## Validation

- [x] TypeScript build passed
- [x] command priority tests passed
- [x] node command tests passed
