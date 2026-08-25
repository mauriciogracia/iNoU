# Multi-Client Architecture, API Gateway & Event Bus Specification

| Property | Value |
| :--- | :--- |
| **Status** | `CANONICAL` |
| **Target Components** | Mobile (Android/iOS), CLI (`inou.sh`), Web UI, 3rd-Party Integrations, REST API Gateway, Real-Time Event Bus |
| **Architecture Reference** | [`main-specs-goals.md`](file:///d:/repos/iNoU/docs/tech-specs/main-specs-goals.md), [`dev-rules.md`](file:///d:/repos/iNoU/docs/tech-specs/dev-rules.md) |

---

## 1. System Overview & Unified Connectivity Topology

The iNoU platform serves multiple client form factors through a decoupled, event-driven architecture. All clients communicate with the core engine through a **Unified REST/MCP API Gateway** and a **Real-Time Reactive Event Bus**:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                CLIENT PLATFORMS LAYER                                 │
├───────────────┬───────────────┬────────────────┬─────────────────┬─────────────────────┤
│  Android App  │    iOS App    │  CLI (inou.sh) │   Web UI / PWA  │ 3rd-Party Adapters  │
│ (Kotlin/Java) │ (Swift/Obj-C) │ (Node/Bash/TUI)│ (TS/Vanilla CSS)│ (MCP/Webhooks/REST) │
└───────┬───────┴───────┬───────┴────────┬───────┴────────┬────────┴──────────┬──────────┘
        │               │                │                │                   │
        ▼               ▼                ▼                ▼                   ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              UNIFIED API GATEWAY (HTTP/REST & MCP)                     │
│  • Routes 5 Semantic Entities: project, workspace, task, memory, preference           │
│  • Zero-Exposure Key Governance & Model Waterfall Fallback                             │
│  • Sub-2ms Anti-Manipulation Defense & Rate Limiting                                   │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        REAL-TIME REACTIVE EVENT BUS (Pub/Sub)                          │
│  • Server-Sent Events (SSE) / WebSockets for Live UI Streaming                         │
│  • Local Store-and-Forward Event Queue (Offline-First Resiliency)                      │
│  • Distributed Colmena Node Gossip Protocol (P2P Peer Sync)                            │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                iNoU CORE RUNTIME ENGINES                               │
│  • Interaction & DAG AST Engine  • Master Mind Memory   • Dynamic Trust Engine         │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Client Platform Specifications

### 2.1 Android Native / Flutter App Client
* **Target Runtime**: Android API 26+ (Kotlin / Compose or Flutter).
* **Storage & State**: Encrypted local SQLite / Room DB for offline-first operation.
* **Authentication**: Android BiometricPrompt (Fingerprint / Face Unlock) + Local Keystore.
* **Network & Synchronization**:
  * Persistent connection to API Gateway via WebSocket / SSE.
  * Low-bandwidth SMS/USSD gateway fallback when cellular data is unavailable.
  * Store-and-forward background sync service triggered on network reconnection (`WorkManager`).

### 2.2 iOS Native / Swift App Client
* **Target Runtime**: iOS 16+ (Swift / SwiftUI).
* **Storage & State**: CoreData / Local Encrypted SQLite.
* **Authentication**: Apple LocalAuthentication (FaceID / TouchID) backed by Secure Enclave.
* **Network & Synchronization**:
  * Apple Push Notification Service (APNs) for background wakeups and task match alerts.
  * Local Bluetooth Low Energy (BLE) peer-to-peer discovery for Colmena mesh clustering.

### 2.3 Command Line Interface (`inou.sh`)
* **Target Runtime**: POSIX Shell (`bash`, `zsh`) & Node.js (v18+).
* **Execution Modes**:
  1. **Batch CLI Mode**: `./inou.sh <Entity> <Action> [flags]` (direct zero-overhead execution).
  2. **Interactive TUI Mode**: `./inou.sh` (launches split-pane ASCII interface connected to local API).
* **State & Security**: Uses local `.inuo-state.json` and zero-exposure environment credentials.

### 2.4 Web Page / Progressive Web App (PWA)
* **Target Runtime**: Modern Browsers (Chrome, Safari, Firefox, Edge) via Express/Node backend.
* **Styling & UI**: Vanilla CSS design system, responsive flex/grid layouts, dark mode, zero heavyweight UI frameworks.
* **Real-Time Data**: Subscribes to `/api/stream` via Server-Sent Events (SSE) for live task status, trust metrics, and match events.
* **Authentication**: WebAuthn / Passkeys and biometric browser authentication.

### 2.5 Ecosystem Integrations & 3rd-Party Adapters
* **Model Context Protocol (MCP)**: Implements standard MCP servers for IDEs (VSCode, Antigravity, Cursor) and AI agents.
* **Webhook Receivers & Dispatchers**: Bidirectional webhooks for external platforms (Stripe, GitHub, Jira, Telegram, X/Twitter, LinkedIn).

---

## 3. Unified REST API Gateway Specification

All HTTP endpoints strictly mirror the **Semantic Entity-Action Grammar**:

$$\text{Endpoint Pattern: } \texttt{/api/v1/\{entity\}[/\{id\}][/\{action\}]}$$

### 3.1 REST API Endpoint Matrix

| Method | Endpoint | Semantic Mapping | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/project` | `project add` | Create a new project container |
| `PUT` | `/api/v1/project/:id` | `project update` | Update project metadata or jurisdiction |
| `POST` | `/api/v1/project/:id/enable` | `project enable` | Re-activate project |
| `POST` | `/api/v1/project/:id/disable` | `project disable` | Suspend project |
| `DELETE`| `/api/v1/project/:id` | `project remove` | Delete project |
| `GET` | `/api/v1/project` | `project list` | List all projects |
| `POST` | `/api/v1/workspace` | `workspace add` | Register filesystem workspace |
| `GET` | `/api/v1/workspace` | `workspace list` | Query registered workspaces |
| `POST` | `/api/v1/task` | `task add` | Add DAG task node, need, or offer |
| `PUT` | `/api/v1/task/:id` | `task update` | Update task status or attributes |
| `POST` | `/api/v1/task/:id/enable`| `task enable` | Unblock task node |
| `POST` | `/api/v1/task/:id/disable`| `task disable` | Pause/block task node |
| `DELETE`| `/api/v1/task/:id` | `task remove` | Remove task node |
| `GET` | `/api/v1/task` | `task list` | List tasks / query matches |
| `POST` | `/api/v1/memory` | `memory add` | Store learned skill, principle, or rule |
| `GET` | `/api/v1/memory` | `memory list` | Retrieve cognitive records |
| `DELETE`| `/api/v1/memory/:id` | `memory remove` | Purge memory/skill |
| `POST` | `/api/v1/preference` | `preference add/update` | Set UI mode, API keys, aliases |
| `GET` | `/api/v1/preference` | `preference list` | Fetch active user preferences |
| `GET` | `/api/v1/status` | `status` | System health, version, and trust level |

---

## 4. Real-Time Distributed Event Bus Specification

### 4.1 Event Envelope Structure
Every event published to the bus conforms to the standard payload envelope:

```typescript
export interface InuoEventEnvelope<T = any> {
  eventId: string;          // Unique UUIDv4
  eventType: string;        // e.g., 'task.created', 'match.found', 'trust.updated'
  entity: SemanticEntity;   // 'project' | 'workspace' | 'task' | 'memory' | 'preference'
  action: SemanticAction;   // 'add' | 'update' | 'enable' | 'disable' | 'remove' | 'list'
  timestamp: string;        // ISO 8601 UTC
  sourceNodeId: string;     // Colmena / Client Node ID
  payload: T;               // Strongly-typed event data
}
```

### 4.2 Standard Event Topics

| Topic | Trigger Condition | Primary Listeners |
| :--- | :--- | :--- |
| **`task.created`** | New task or DAG node added | DAG Engine, Matcher |
| **`need.registered`** | Need created | Interaction Matcher, Colmena Peers |
| **`offer.registered`** | Offer created | Interaction Matcher, Colmena Peers |
| **`match.validated`** | Need-Offer pair confirmed | Web UI, Mobile Push, Audit Logger |
| **`trust.penalized`** | Suspicious input or manipulation detected | Circuit Breaker, Admin Alert |
| **`emergency.triggered`**| Incapacitation telemetry received | Trusted Members Network |
| **`sync.reconciled`** | Offline changes merged | Local State DB, Web UI SSE |

### 4.3 Streaming Protocol: Server-Sent Events (SSE) & WebSockets
* **Endpoint**: `GET /api/stream` (SSE) or `WS /api/events` (WebSocket)
* **Reconnection Protocol**: Clients supply `Last-Event-ID` header; the Event Bus replays missed events from the local in-memory event buffer.

---

## 5. Security, Governance & Offline Synchronization Protocol

1. **Zero-Exposure Credential Policy**:
   - API keys and tokens are never broadcast over the Event Bus or returned in API responses.
2. **Anti-Manipulation Circuit Breaker**:
   - Input payloads are scanned for prompt injection or policy breaches; malicious clients are disconnected in $<2\text{ms}$.
3. **Store-and-Forward Reconciliation**:
   - When offline, clients append events to a local SQLite journal.
   - Upon reconnection, events are transmitted to `/api/v1/sync` where the engine reconciles state using causal vector clocks.
