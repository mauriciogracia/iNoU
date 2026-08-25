# Scenario 03: Interrupted Planning, Cloud Persistence & Cross-Device Entity Retrieval

| Property | Value |
| :--- | :--- |
| **Status** | `CANONICAL` |
| **Domain** | Cloud State Synchronization, Google Drive Integration, Multi-LLM Context Portability, Cross-Device Entity Retrieval |
| **Architecture Reference** | [`main-specs-goals.md`](file:///d:/repos/iNoU/docs/tech-specs/main-specs-goals.md), [`clients_api_event_bus.specs.md`](file:///d:/repos/iNoU/docs/tech-specs/clients_api_event_bus.specs.md) |

---

## 1. Scenario Context & Narrative

> *"You start planning a great app or project and you get interrupted. You need to upload your progress so that INOU can help you continue later or at the office, leveraging your Google Drive, Gemini, and other LLMs."*

### The Challenge:
1. **Context Fragmentation**: A user begins decomposing a complex project at home (or on mobile), defining entities across `project`, `workspace`, `task` DAGs, cognitive `memory`, and `preference`.
2. **Sudden Interruption**: Travel, meetings, or device switching forces the session to end before execution completes.
3. **Multi-Device & Cloud Continuity**: When resuming at the office workstation, on a mobile device, or via a web client, the system must hydrate the exact state from Google Drive or cloud storage without losing AST node relationships, learned skills, or active LLM context.

---

## 2. Architecture & State Portability Pipeline

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                          LOCAL WORKSPACE (Home Machine / Mobile)                       │
│  Entities: project, workspace, task (DAG AST), memory (Skills), preference             │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                           [iNoU State Serialization & Snapshot]
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        CLOUD PERSISTENCE & MULTI-LLM ADAPTERS                          │
│  ┌─────────────────────────┐  ┌───────────────────────────┐  ┌──────────────────────┐  │
│  │   Google Drive Adapter  │  │  Gemini Long-Context Cache│  │ External LLM Storage │  │
│  │ (Encrypted State & AST) │  │  (Cached Project Context) │  │ (Claude / Groq / S3) │  │
│  └─────────────────────────┘  └───────────────────────────┘  └──────────────────────┘  │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                             [Asynchronous Rehydration on Pull]
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                          OFFICE WORKSTATION / WEB CLIENT / PWA                         │
│  • Hydrates identical 5-Entity Registry: project, workspace, task, memory, preference │
│  • Resumes LLM prompting with full conversational & architectural context              │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Step-by-Step Execution Workflow

### 3.1 Initial Planning & Entity Creation (Home / Mobile)
The user initializes the project and outlines the initial task DAG:
```bash
# 1. Register project and workspace
./inou.sh project add --name "AutonomousLogisticsPlatform" --jurisdiction "GLOBAL"
./inou.sh workspace add --name "LogisticsCore"

# 2. Add workflow and step nodes
./inou.sh task add --type workflow --name "FleetDispatchWF"
./inou.sh task add --workflow "FleetDispatchWF" --title "Route Optimization Engine" --role "Architect"
./inou.sh task add --workflow "FleetDispatchWF" --title "Telemetry Ingestion Pipeline" --role "DataEngineer"

# 3. Store learned architectural principles and skills in memory
./inou.sh memory add --type principle --title "Zero Single Point of Failure Architecture"
./inou.sh memory add --type skill --goal "Integrate Kafka telemetry stream with Route Optimizer"
```

### 3.2 Interruption & Autonomous Cloud Synchronization
Before stepping away, the user runs autonomous sync:
```bash
# Autonomous sync reconciles local state with Google Drive
./inou.sh sync --target google-drive
```
* **What gets synced**:
  - `project`: Project metadata, environments, governance rules.
  - `workspace`: Working directory structures and relative paths.
  - `task`: Complete workflow DAG AST, open Needs, available Offers.
  - `memory`: Cognitive principles, behavioral rules, distilled skill scripts.
  - `preference`: UI mode, role assignments, command aliases.
* **Security Guarantee**: Local API keys (`.inuo-key.json`) are **NEVER** uploaded to the cloud (Zero-Exposure Policy).

### 3.3 Gemini Context Cache Hydration
iNoU automatically uploads the sanitized architectural graph to Google Gemini Context Caching:
* Generates a persistent cache token (`gemini-cache-logistics-v1`).
* Allows any connected LLM (Gemini 2.5/3 Flash, Gemini Pro, Claude) to immediately recall the entire system design without token re-ingestion costs.

### 3.4 Office Resume & Autonomous Rehydration
Upon arriving at the office (or opening the Web UI):
```bash
# Autonomous sync automatically detects remote delta and hydrates workspace
./inou.sh sync --source google-drive --lightweight

# Verify all entities are fully restored
./inou.sh project list
./inou.sh task list --workflow "FleetDispatchWF"
./inou.sh memory list
```

### 3.5 Seamless Continuation with Multi-LLM Assistance
The user asks Gemini / LLM to continue where they left off:
```bash
./inou.sh task add --workflow "FleetDispatchWF" --title "Fleet Dispatch Microservice Implementation" --role "Developer"
./inou.sh memory add --type skill --goal "Implement sub-second GPS geospatial query index"
```

---

## 4. Entity Retrieval & Synchronization Invariants

| Entity | Cloud Persistence Format | Rehydration Guarantee |
| :--- | :--- | :--- |
| **`project`** | `inuo-manifest.json` + `project_meta.json` | Restores active project context and governance policies |
| **`workspace`** | Directory schema + `.git` context reference | Maps local filesystem targets to the new machine |
| **`task`** | Workflow DAG AST + Need/Offer state vector | Preserves exact task dependencies (`Blocked`, `Open`, `Fulfilled`) |
| **`memory`** | `training_dataset.json` + skill definitions | Reinstates all autonomous scripts, rules, and corrections |
| **`preference`** | User profile preferences (sans secrets) | Restores UI modes, themes, and custom command aliases |

---

## 5. Security & Zero-Exposure Governance

1. **Credential Isolation**: Secrets, API keys, and local biometric vaults are stored strictly on the local hardware keychain and stripped before cloud push.
2. **End-to-End Payload Encryption**: State snapshots pushed to Google Drive or external object storage are encrypted using the user's Master Mind Key.
3. **Causal Conflict Resolution**: If changes were made on multiple devices, iNoU utilizes deterministic ISO timestamp vectors to perform 3-way conflict merges without data loss.
