# Agent Directives & Repository Guidelines (`AGENTS.md`)

All AI agents (Antigravity, Gemini, Seed Agents) working on the **iNoU** codebase **MUST** follow the architectural rules and standards defined in [`docs/tech-specs/dev-rules.md`](file:///d:/repos/iNoU/docs/tech-specs/dev-rules.md).

## Core Rules Reference

All project guidelines, single-definition file constraints (`src/enums/`, `src/types/`, `src/interfaces/`), DRY & SOLID design principles, model isolation, governance, and versioning rules are centrally maintained in [`docs/tech-specs/dev-rules.md`](file:///d:/repos/iNoU/docs/tech-specs/dev-rules.md).

## Graphify Workflow

- Use an existing `graphify-out/graph.json` when it helps answer codebase or architecture questions.
- Graphify installation, configuration, extraction, or rebuilding must never block the requested implementation, debugging, or validation work.
- After completing and validating a task, refresh an existing graph with `graphify . --update` as a best-effort final step.
- If Graphify is unavailable, unconfigured, interrupted, or fails, report that briefly and leave the completed task unchanged.
- All files under `graphify-out/` are generated local artifacts and must remain ignored by Git.

## Git Operations Policy

- AI agents **MUST NOT** execute Git operations (`git add`, `git commit`, `git push`, `git checkout`, `git restore`, `git reset`, etc.) unless explicitly instructed by the user in the prompt.
- File staging and commits are under explicit human user control.

## Test Execution Policy

- AI agents and automated tools **MUST NOT** run test suites (`npm test`, `npm run test:all`, `node --test`, etc.) unless explicitly specified by the user in the prompt, or when bumping version or executing major refactors.

## Implementation Plans Persistence Rule

- AI agents and contributors **MUST ALWAYS** persist implementation plans, architectural proposals, and technical specifications as concrete `.md` files on disk (e.g., under `docs/to-improve/`, `docs/tech-specs/`, or dedicated `.md` plan files).
- Implementation plans **MUST NEVER** exist solely transiently or in memory buffers.

## Custom Project Scripts Utilization & Authorization Rule

- All custom scripts located in `scripts/` (`*.js`, `*.sh`) and repository root launchers (`listChildren.sh`, `inou.sh`, `iwc.sh`) are approved project utilities authorized for workspace execution.
- AI agents and contributors **MUST** prioritize and use these custom `.js` and `.sh` scripts whenever available instead of constructing ad-hoc terminal commands, particularly for authorized workspace operations (e.g., listing files with `listChildren.sh`/`listChildren.js`, extracting markdown sections with `MD-listHeadingsSections.js`, running tests with `run-tests.sh`, updating the knowledge graph with `update-graph.js`, etc.).
## Interaction & Communication Directives

- AI agents **MUST** avoid guessing the next step.
- AI agents **MUST** be as succinct as possible.
- AI agents **MUST NOT** waste user time with out-of-scope suggestions.

## Interface Naming Standard Rule

- All TypeScript interfaces **MUST** strictly follow the naming pattern **`Inou<XXX>Interface`** (e.g. `InouPluginManifestInterface`, `InouGlobalIdentityInterface`, `InouIntegrationAdapterInterface`, `InouRepositoryInterface`).
- AI agents and contributors **MUST NOT** use legacy prefix patterns like `I<XXX>` or `II<XXX>`.

