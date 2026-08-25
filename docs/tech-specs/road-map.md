# iNoU Platform Strategic Technical Roadmap (`tech-specs/road-map.md`)

| Property | Value |
| :--- | :--- |
| **Status** | `CANONICAL ROADMAP` |
| **Architecture Reference** | [`main-specs-goals.md`](file:///d:/repos/iNoU/docs/tech-specs/main-specs-goals.md), [`dev-rules.md`](file:///d:/repos/iNoU/docs/tech-specs/dev-rules.md) |
| **Target Platforms** | CLI (`inou.sh`), Web UI / PWA, Android, iOS, REST/MCP Gateway, Colmena Mesh |

---

## 1. Executive Vision & Architecture Overview

The **iNoU** ecosystem is a decentralized, offline-first interaction protocol that translates human intent into canonical Needs and Offers ($\text{NEED} = \text{VERB} + \text{OBJECT}$), orchestrates complex objectives via recursive DAG ASTs, and provides seamless multi-device continuity across mobile, desktop, cloud, and peer-to-peer networks.

---

## 2. Phased Implementation Milestones

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 PHASED ROADMAP MATRIX                                  │
├─────────────────┬─────────────────┬─────────────────┬─────────────────┬────────────────┤
│    PHASE 1      │     PHASE 2     │     PHASE 3     │     PHASE 4     │    PHASE 5     │
│ Semantic Engine │ Hybrid Storage  │ Autonomous Sync │ API & Event Bus │ Multi-Client   │
│ & Scoped Prefs  │  (RAM + SQLite) │ & Git-Like Merge│   (REST & SSE)  │ (Web/App/Mesh) │
│  [✔ COMPLETED]  │   [IN FLIGHT]   │   [SPECIFIED]   │   [SPECIFIED]   │  [SPECIFIED]   │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┴────────────────┘
```

---

### Phase 1: Canonical Semantic Grammar & Scoped Preferences `[COMPLETED]`
* [x] **5 Semantic Entities $\times$ 6 CRUD Actions**:
  - `project`, `workspace`, `task`, `memory`, `preference` $\times$ `add`, `update`, `enable`, `disable`, `remove`, `list`.
* [x] **Multilingual Grammar Normalization**:
  - Transparent Spanish/English aliases (`proyecto`, `tarea`, `memoria`, `preferencia` $\longleftrightarrow$ `project`, `task`, `memory`, `preference`).
* [x] **Hierarchical Preference Scoping Engine**:
  - 4-level cascading resolution: $\text{Task} \succ \text{Workspace} \succ \text{Project} \succ \text{Global}$.
* [x] **Auto-Sync Interval & Interactive Action Prompts**:
  - Persisted `auto_sync_interval` with interactive buttons: `[1] ⚡ Sync Now`, `[2] ⏳ Later`, `[3] ❌ Disable`.

---

### Phase 2: Hybrid L1 RAM + L2 SQLite WAL Storage Layer `[✔ COMPLETED]`
* [x] **Embedded SQLite Persistence Engine (`.inuo.db`)**:
  - Configured SQLite in Write-Ahead Logging (WAL) mode (`PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;`).
  - Single-definition SQL schemas for `projects`, `workspaces`, `tasks`, `memories`, `preferences`, and `collection_sync_meta`.
* [x] **L1 In-Memory Working State (RAM Cache)**:
  - Microsecond ($<1\mu\text{s}$) hot reads, DAG traversal, and sub-2ms Circuit Breaker evaluations.
* [x] **Automatic Zero-Loss State Migration & Dual-Write**:
  - Implemented Write-Through L1 RAM $\rightarrow$ L2 SQLite + Dual-Write JSON export for Git diff inspection.
* [x] **Mandatory Timestamps & Sync High-Watermarks**:
  - Every row enforces `createdAt` and `updatedAt` (ISO 8601 UTC).
  - `collection_sync_meta` tracks `last_sync_at` per table for instant delta queries (`queryMutatedEntitiesSince`).


---

### Phase 3: Autonomous Delta Sync & Git-Like 3-Way Merge
* [ ] **Autonomous Bi-Directional Synchronization (`./inou.sh sync`)**:
  - Self-detects whether local or remote state needs updating; eliminates manual `up`/`down` directions.
* [ ] **Git-Like 3-Tier Conflict Resolution Engine**:
  - **Tier 1 (Clear Winner)**: Fast-forwards when timestamp delta is strictly newer and linear.
  - **Tier 2 (Field-Level Merge)**: Merges disjoint attributes across concurrent edits automatically.
  - **Tier 3 (Interactive Diff Prompt)**: Surfaces side-by-side conflict diff via `askInteractiveQuestion`.
* [ ] **Granular Contextual Entity Filtering**:
  - Selective sync flags: `--entities task,workspace`, `--workflow <id>`, `--lightweight`.
* [ ] **Adaptive Environment Sensing & Dynamic Degradation**:
  - Auto-enables `--lightweight` mode on low bandwidth ($<2\text{Mbps}$).
  - Activates offline Store-and-Forward queue when disconnected.
  - Proactively prunes temporary test caches when disk storage is constrained ($<100\text{MB}$).

---

### Phase 4: Unified REST API Gateway & Real-Time Event Bus
* [ ] **Unified REST API Gateway**:
  - Direct mapping of semantic entities to HTTP endpoints (`/api/v1/project`, `/api/v1/workspace`, `/api/v1/task`, `/api/v1/memory`, `/api/v1/preference`).
  - Zero-exposure key masking & sub-2ms anti-manipulation defenses.
* [ ] **Real-Time Reactive Event Bus (`InuoEventEnvelope<T>`)**:
  - Server-Sent Events (SSE) `/api/stream` and WebSockets `/api/events`.
  - Reconnection event replay using `Last-Event-ID`.
* [ ] **Model Context Protocol (MCP) Server**:
  - Native MCP Server exposing iNoU DAG workflows and Master Mind memory tools to VSCode, Antigravity, and AI agents.

---

### Phase 5: Multi-Client Applications & Ecosystem Mesh
* [ ] **Web UI / Progressive Web App (PWA)**:
  - Vanilla CSS design system, dark mode, zero heavyweight UI frameworks.
  - Live task status and match streaming via SSE.
  - WebAuthn passkey authentication.
* [ ] **Android Native Client**:
  - Kotlin / Jetpack Compose with local Room/SQLite DB, Android Biometrics, background `WorkManager` sync, and SMS/USSD fallback.
* [ ] **iOS Native Client**:
  - Swift / SwiftUI with CoreData/SQLite, Secure Enclave FaceID/TouchID, APNs push alerts, and BLE Colmena mesh discovery.
* [ ] **Colmena Distributed P2P Swarm**:
  - Peer discovery, task matching gossip protocol, and multi-party threshold gates (`TrustThresholdGate`).

---

### Phase 6: Cloud Master Mind & Long-Context LLM Continuity
* [ ] **Google Drive & Encrypted Cloud Storage Adapters**:
  - Encrypted snapshot sync for interrupted planning resumption ([`scenario_03.md`](file:///d:/repos/iNoU/docs/tech-specs/scenario_03.md)).
* [ ] **Google Gemini Context Caching Integration**:
  - Generates persistent cache tokens (`gemini-cache-...`) to eliminate token re-ingestion costs when resuming cross-device planning.
* [ ] **Delegated Incapacitation Trust Network**:
  - Trusted Members Network and emergency delegation protocols ([`scenario_04.md`](file:///d:/repos/iNoU/docs/tech-specs/scenario_04.md)).

---

## 3. Governance & Quality Invariants

1. **Strict Single-Definition Files**: All enums, types, and interfaces remain single-definition files under `src/enums/`, `src/types/`, `src/interfaces/`.
2. **Zero-Exposure Credential Security**: API keys, biometric credentials, and private tokens are never committed, logged, or broadcast over the network.
3. **100% Offline Testability**: Unit test suites execute with zero live network probes and zero real API keys.
4. **Knowledge Graph Synchronization**: The codebase knowledge graph (`graphify . --update`) is refreshed upon completion of every milestone.
