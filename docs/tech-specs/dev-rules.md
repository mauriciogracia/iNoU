# iNoU Development Rules & Architectural Directives (`dev-rules.md`)

This document outlines the mandatory architectural principles, coding standards, and governance rules for all contributors and autonomous agents (Seed Agents) developing on the **iNoU Platform**.

---

## 1. Core Interaction Principles

### 1.1 Canonical Formulation Rule

- Every user intent or platform operation **MUST** be modeled as a `Need` object following the canonical formula:

  $$\text{NEED} = (\text{VERB}) + (\text{OBJECT})$$

- Matching fulfillment units **MUST** pair a corresponding `COMP_VERB` (Offer) with the same `OBJECT`:

  $$\text{OFFER} = (\text{COMP\_VERB}) + (\text{OBJECT})$$

### 1.2 Global Catalog & Namespace Integrity

- All interaction objects (`Product`, `Service`, `SocialInteraction`) **MUST** map to an entry in the centralized `GlobalCatalog`.
- Direct instantiation of ad-hoc or unindexed object names is strictly prohibited to prevent namespace collisions.

---

## 2. Architectural Boundaries & Isolation

### 2.1 Model Isolation Constraint

- The system enforces a strict boundary between **Transactional (Commercial)** and **Gift-Based (Altruistic)** models.
- Cross-contamination of fulfillment logic, pricing, or altruistic state handling is **STRICTLY PROHIBITED**.
- Module implementations must explicitly declare their `ModelType` ('Transactional' | 'GiftBased').

### 2.2 Atomic Threshold & Dependency Graphs

- Macro-Needs (complex objectives) **MUST** be decomposed into Atomic Needs (singular, actionable transactions).
- A Parent Need **MUST** remain in a `Blocked` state until all `prerequisiteNeedIds` are fully resolved.
- Automated systems must never bypass dependency validation to activate a parent need prematurely.

---

## 3. Governance & Safety Directives

### 3.1 Trust Loop & Zero-Tolerance Policy

- Automated safety checks **MUST** evaluate all interactions against zero-tolerance frameworks (e.g., prohibition of human trafficking and exploitation).
- High-risk domains (`medical`, `security`, `financial`) **REQUIRE** mandatory identity verification prior to interaction matching.

### 3.2 Immutable Audit Trail

- All interaction logs, messages, and state transitions **MUST** be preserved in an immutable audit ledger (`AuditTrailEntry`).
- Methods attempting to delete or overwrite sent messages or transaction logs are prohibited.

### 3.3 Cost Governance & Token Conservation Directive

- Systems **MUST** prioritize free-tier models (`gemini-2.5-flash`, local Ollama, zero-cost quotas) first.
- When free-tier quotas are exhausted, autonomous components **MUST NEVER** execute paid or billable model calls without explicit, verified human user consent.

---

## 4. Ecosystem & Infrastructure Directives

### 4.1 Adapter Pattern Enforcement

- External service integrations (e.g., Uber, LinkedIn, MercadoLibre) **MUST** be implemented using the `EcosystemAdapter` pattern.
- Third-party API calls must pass through the **LLM-Broker Middleware** for intent-to-payload JSON/REST translation and OAuth 2.0 identity unification.

### 4.2 Offline-First & Intermittent Service Resilience

- External endpoints **MUST** be treated as intermittent resources.
- When external endpoints are unreachable, the system must retain local state and queue requests (`queuedRequestsCount`) rather than failing abruptly.

---

## 5. iNoU-on-iNoU (Self-Orchestrating Dev Lifecycle)

### 5.1 Codebase as Global Catalog

- Every function, service, and module in the repository is treated as an item in the codebase catalog, indexed by its `Verb + Object` purpose.
- Before writing new code, agents **MUST** query the catalog for existing modules to reuse or refactor.

### 5.2 Bootstrapping & Manifest Sync

- Every environment initialization **MUST** load `main-specs-goals.md` as its persistent system prompt.
- Every release **MUST** update `inuo-manifest.json` with the target `SPEC_VERSION` adhering to Semantic Versioning (`MAJOR.MINOR.PATCH`).
- Structural directory mappings **MUST** map `Verb + Object` pairs to discrete, isolated service modules.

### 5.3 Automated Quality Control & Rollback

- Deployment performance metrics are continuously monitored.
- If metrics degrade, an automated `Need` ("Fix performance degradation") is created to trigger a new development cycle.
- If test verification (`inuo-cli test --version [SPEC_VERSION]`) fails, the environment **MUST** immediately execute `inuo-cli rollback [PREVIOUS_VERSION]`.

### 5.4 Specification Version vs CLI Tool Version Separation

- **SPEC_VERSION**: Governs the canonical protocol, matching formulas, safety rules, and Global Catalog schemas.
- **CLI Version**: Governs the `inou.sh` software shell implementation and tooling features.
- Bumping the `inou.sh` CLI tool version does **NOT** change or break `SPEC_VERSION` unless the underlying interaction engine protocol itself changes.
- CLI tools **MUST** display and track both `SPEC_VERSION` and `cliVersion` distinctly.

---

## 6. Code Organization & Type Directives

### 6.0 Adaptive Learning Integrity

- Persistent JSON state and prompt conditioning **MUST NOT** be described as model-weight training.
- Learned preferences, corrections, memories, skills, and behaviors **MUST** preserve owner, provenance, trust, and sharing scope.
- User-scoped learning defaults to private and **MUST NOT** affect another user or federate without explicit consent.
- Corrections and behaviors become operational only through relevant retrieval or executable activation; storage alone is insufficient.
- Fine-tuning or weight adapters **MUST** use a provider adapter and produce a versioned, checksummed, auditable, reversible artifact.
- No learned data or weight artifact may override immutable Master Trainer principles.

### 6.1 Single Definition per File & Directory Separation Rule

- Every `type` alias, `enum`, and `interface` **MUST** reside in its own dedicated file in its respective directory under `src/`:
  - **Enums**: Placed in `src/enums/` (e.g., `src/enums/NeedStatusEnum.ts`).
  - **Type Aliases**: Placed in `src/types/` (e.g., `src/types/NeedStatus.ts`).
  - **Interfaces**: Placed in `src/interfaces/` (e.g., `src/interfaces/Need.ts`).
- Grouping multiple interfaces, types, or enums inside a single file is **STRICTLY PROHIBITED**.
- Each directory **MUST** maintain a barrel export (`index.ts`) re-exporting its single-definition files cleanly.

### 6.1.1 TypeScript Interface Naming Standard (`Inou<XXX>Interface`)

- All TypeScript interfaces **MUST** strictly follow the naming pattern **`Inou<XXX>Interface`** (e.g., `InouPluginManifestInterface`, `InouGlobalIdentityInterface`, `InouIntegrationAdapterInterface`, `InouRepositoryInterface`).
- AI agents and contributors **MUST NOT** use legacy prefix patterns like `I<XXX>` or `II<XXX>`.

### 6.2 Software Design Principles (DRY & SOLID)

- **DRY (Don't Repeat Yourself)**: Code logic, constants, formulas, and schema mappings **MUST NOT** be duplicated across files. Shared functionality must be refactored into reusable single-responsibility utilities or barrel-exported interfaces.
- **SOLID Principles**:
  - **Single Responsibility Principle (SRP)**: Each file must contain exactly one type/enum/interface definition or one discrete service module.
  - **Open/Closed Principle (OCP)**: Platform components (e.g., Interaction Engine, Ecosystem Adapters) must be open for extension via new verb/complement pairings or adapter providers without modifying core engine logic.
  - **Liskov Substitution Principle (LSP)**: Derived adapters and domain implementations must be fully substitutable for their base interface abstractions (`EcosystemAdapter`, `Need`).
  - **Interface Segregation Principle (ISP)**: Interfaces must remain focused and granular so components depend only on the properties they actually consume.
  - **Dependency Inversion Principle (DIP)**: High-level lifecycle services and commands must depend on abstract interfaces (`Environment`, `InuoManifest`, `Need`) rather than hardcoded low-level details.

### 6.3 Git Operations Policy

- AI agents and automated tools **MUST NOT** execute Git operations (`git add`, `git commit`, `git push`, `git checkout`, `git restore`, `git reset`, etc.) unless explicitly instructed by the user in the prompt.
- File staging and commit boundaries remain strictly under explicit user direction.

### 6.4 Test Execution Policy

- AI agents and automated tools **MUST NOT** run test suites (`npm test`, `npm run test:all`, `node --test`, etc.) unless explicitly specified by the user in the prompt, or when bumping version or executing major refactors.

### 6.5 Custom Project Scripts Utilization & Authorization Rule

- All custom scripts located in `scripts/` (`*.js`, `*.sh`) and repository root launchers (`listChildren.sh`, `inou.sh`, `iwc.sh`) are approved project utilities authorized for workspace execution.
- AI agents and contributors **MUST** prioritize and use these custom `.js` and `.sh` scripts whenever available instead of constructing ad-hoc terminal commands, particularly for authorized workspace operations (e.g., listing files with `listChildren.sh`/`listChildren.js`, extracting markdown sections with `MD-listHeadingsSections.js`, normalizing line endings with `fix-crlf.js`, running tests with `run-tests.sh`, updating the knowledge graph with `update-graph.js`, etc.).

### 6.6 Deployment & CI/CD Tooling Rule (.sh & .js Preference)

- All deployment, orchestration, and continuous integration/continuous delivery (CI/CD) pipelines **MUST** prioritize and use `.sh` shell scripts and `.js` Node.js scripts (located in `scripts/` or repository root) over ad-hoc inline terminal commands or proprietary vendor lock-in configs.
- Deployment operations must be encapsulated in standard project utilities:
  - `scripts/deploy.js` / `scripts/deploy.sh`: Canonical deployment entrypoints supporting environment validation, container builds, health-check polling, and rollback on failure.
  - `scripts/deploy-inou.sh` / `deploy-inou.sh`: Automated Google Cloud (Cloud Run & Firebase) deployment launcher.
  - `.github/workflows/ci-cd.yml`: Standardized CI/CD workflow executing `npm run build`, full test verification, and automated deployment orchestration.

### 6.6.1 Branch & Component Deployment Governance Policy

- **Branch-Based Target Environment Routing**:
  - `main` branch **MUST** deploy strictly to the **Production (`prod`)** environment (`inou-prod`).
  - `development` / `dev` branch **MUST** deploy strictly to the **QA / Staging (`qa`)** environment (`inou-qa`).
  - All other branches (e.g. `feature/*`, `fix/*`) are **STRICTLY BLOCKED** from execution.
- **Selective Component Deployment Support**:
  - Deployment utilities **MUST** support both interactive and CLI flag (`--component <name>`) selective deployment across 3 canonical components:
    - `web`: Web UI, Mobile Terminal (`/m`), PWA Assets, and API Gateway Container on Google Cloud Run.
    - `cloud`: Backend Cloud Infrastructure (Firestore/Storage Security Rules, Database Indexes, Cloud Functions, and Event Triggers).
    - `full` (default): Complete deployment combining both `web` and `cloud`.

---

## 7. Feature & Command Completeness Rules

### 7.1 Semantic Command Spec Parity — `inouCommandsSemantics.md`

Every new feature that introduces or modifies user-facing behavior **MUST** be reflected in
[`docs/to-improve/inouCommandsSemantics.md`](file:///d:/repos/iNoU/docs/to-improve/inouCommandsSemantics.md)
(or its canonical successor if the file is promoted to `docs/tech-specs/`).

**Mandatory steps for any feature that adds, renames, or removes a CLI command or semantic action:**

1. **Specify first**: Add or update the entity–action entry in `inouCommandsSemantics.md` before (or alongside) writing implementation code. Treat the spec entry as the acceptance contract.
2. **Implement the handler**: Wire the command through `semanticDispatcher.ts` (for entity-action pairs) or the `switch` in `shell.ts` (for standalone commands).
3. **Update autocomplete**: Reflect any new entity, action, or `--flag` in `src/cli/autocomplete.ts` — both the `FLAGS` map and `STANDALONE_SUBS` map as applicable.
4. **Acceptance criteria**: The new command MUST appear in `help` output and MUST be tab-completable in the interactive shell before the feature is considered done.

> **Violation**: Merging a CLI feature without a corresponding `inouCommandsSemantics.md` entry is a spec drift violation and MUST be flagged in code review.

---

### 7.2 UI Parity Rule — Web UI Must Mirror Every CLI Command

Whenever a CLI command is **added**, **modified**, or **removed**, the corresponding Web UI surface **MUST** be specified and implemented in the same work item. The following apply:

1. **Commands that mutate state** (`add`, `update`, `enable`, `disable`, `remove`) **MUST** be reachable from the Web UI — either as a typed command in the prompt bar, a dedicated button/form, or a context-menu action on the relevant list item.
2. **Read commands** (`list`, `status`) **MUST** be surfaced as a rendered view or panel in the Web UI, not just as raw text in the log stream.
3. **Flag-driven parameters** (e.g., `--name`, `--path`, `--jurisdiction`) for any `add` or `update` action **MUST** be mapped to labelled form fields in a dialog or inline form — not typed freehand in the prompt.
4. **Error states** returned by the CLI handler **MUST** propagate as styled error messages in the UI (not silently dropped in the SSE stream).

**Implementation checklist for any command-bearing feature:**

- [ ] `inouCommandsSemantics.md` updated (Rule 7.1)
- [ ] `semanticDispatcher.ts` or `shell.ts` handler implemented
- [ ] `autocomplete.ts` updated
- [ ] Web UI: action reachable (button / form / command palette entry)
- [ ] Web UI: list/status view updated if entity data changes
- [ ] Web UI: error state handled and displayed

> **Violation**: Shipping a CLI command that has no Web UI path to trigger or observe it is a UI parity violation. Open a `to-improve/` ticket immediately if the UI work must be deferred, stating the command name and the deferred UI scope.


