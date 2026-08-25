# Local Storage, SQLite Migration & Git-Like Conflict Resolution Specification

| Property | Value |
| :--- | :--- |
| **Status** | `CANONICAL` |
| **Architecture Domain** | L1 RAM Cache, L2 SQLite Storage Engine, Causal Delta Sync, Git-Like 3-Way Conflict Resolution |
| **Architecture Reference** | [`main-specs-goals.md`](file:///d:/repos/iNoU/docs/tech-specs/main-specs-goals.md), [`clients_api_event_bus.specs.md`](file:///d:/repos/iNoU/docs/tech-specs/clients_api_event_bus.specs.md) |

---

## 1. Architectural Blueprint: Hybrid L1 RAM + L2 SQLite Engine

### 1.1 Structural Taxonomy Equivalence
Throughout iNoU specifications and implementation runtimes, relational and document terminology map interchangeably:
* **`Table` $\equiv$ `Collection`**: The logical container/table of records (e.g. `projects`, `workspaces`, `tasks`, `memories`, `preferences`, `integrations`).
* **`Row` $\equiv$ `Entity` / `Record`**: A single discrete instance within a collection/table (e.g. a specific Project entity, an individual Need/Offer task entity, a scoped preference entity).

---

### 1.2 Multi-Tier Engine Overview

iNoU utilizes a **Tiered Storage Architecture** to deliver microsecond UI responsiveness while maintaining 100% ACID disk durability and offline resiliency:


```
┌────────────────────────────────────────────────────────────────────────┐
│                   L1: IN-MEMORY WORKING CONTEXT (RAM)                  │
│  • Microsecond (<1µs) lookup & AST graph traversal                     │
│  • Sub-2ms Anti-Manipulation Circuit Breaker & Interactive TUI         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                       (Async WAL Write-Through)
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   L2: SQLITE PERSISTENCE ENGINE (Disk)                 │
│  • Database file: `.inuo.db` (Write-Ahead Logging / WAL mode)          │
│  • PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;             │
│  • Tables: projects, workspaces, tasks, memories, preferences, sync_meta│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                     (Autonomous Delta Reconciler)
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   L3: CLOUD / GOOGLE DRIVE / MASTER MIND               │
│  • Delta queries: SELECT * FROM <table> WHERE updatedAt > lastSyncAt   │
│  • Git-Like 3-Way Merge: Clear Winner -> Field Auto-Merge -> Conflict  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Mandatory Schema Invariants & Table Definitions

### 2.1 Entity Timestamp Invariant
Every record in every table contains ISO 8601 UTC timestamps:
* **`createdAt`**: Immutable record creation timestamp.
* **`updatedAt`**: Mutated on every update or state transition.

### 2.2 Collection Sync Metadata Table (`collection_sync_meta`)
Tracks high-watermark synchronization timestamps per entity collection:

```sql
CREATE TABLE IF NOT EXISTS collection_sync_meta (
    collection_name TEXT PRIMARY KEY,   -- 'projects', 'workspaces', 'tasks', 'memories', 'preferences'
    last_sync_at TEXT NOT NULL,         -- ISO 8601 UTC of last successful reconciliation
    sync_vector_version INTEGER NOT NULL DEFAULT 1,
    record_count INTEGER NOT NULL DEFAULT 0
);
```

### 2.3 Core Entity Table Schema

```sql
-- 1. Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    jurisdiction TEXT NOT NULL DEFAULT 'GLOBAL',
    status TEXT NOT NULL DEFAULT 'Active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 2. Workspaces Table
CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 3. Tasks Table (Workflows, Nodes, Needs, Offers, Questions)
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    workflow_id TEXT,
    parent_task_id TEXT,
    title TEXT NOT NULL,
    entity_type TEXT NOT NULL DEFAULT 'task', -- 'task', 'workflow', 'need', 'offer', 'question'
    verb TEXT,
    object TEXT,
    complement_verb TEXT,
    role TEXT,
    status TEXT NOT NULL DEFAULT 'Open',       -- 'Open', 'InProgress', 'Blocked', 'Matched', 'Fulfilled'
    details TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 4. Memories Table (Skills, Principles, Behaviors, Corrections)
CREATE TABLE IF NOT EXISTS memories (
    id TEXT PRIMARY KEY,
    memory_type TEXT NOT NULL,                -- 'skill', 'principle', 'behavior', 'correction'
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    topic TEXT,
    status TEXT NOT NULL DEFAULT 'Active',    -- 'Active', 'Disabled', 'Locked'
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 5. Preferences Table (Modes, Roles, Keys, Aliases, Social Settings)
CREATE TABLE IF NOT EXISTS preferences (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    is_enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

---

## 3. Automatic JSON State $\rightarrow$ SQLite Migration

Upon startup, the storage initializer detects existing `.inuo-state.json` files:
1. If `.inuo.db` does not exist and `.inuo-state.json` is present:
   - Initializes SQLite schema and WAL mode.
   - Migrates all `needs`, `offers`, `workflowNodes`, `principles`, `behaviors`, `skills`, `aliases`, `projects`, `workspaces`, and `preferences` into their corresponding SQLite tables inside a single atomic transaction.
   - Sets `collection_sync_meta` timestamps.
   - Creates a clean backup `.inuo-state.json.bak`.
2. Guarantees **100% zero data loss and transparent backward compatibility**.

---

## 4. Git-Like 3-Way Conflict Resolution Protocol

When synchronizing state between local client and remote storage (Google Drive / Master Mind), the engine executes an autonomous 3-tier reconciliation algorithm:

```
                          [SYNC CONFLICT DETECTION]
             Local `updatedAt` vs Remote `updatedAt` Divergence
                                    │
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │ TIER 1: Clear Winner Check (Timestamp Delta Evaluation) │
       └────────────────────────────┬────────────────────────────┘
                                    │
                 ┌──────────────────┴──────────────────┐
                 │ Clear Winner?                       │ No (Concurrent divergence)
                 ▼                                     ▼
     ┌────────────────────────┐            ┌────────────────────────────────┐
     │ Auto-Replace / Winner  │            │ TIER 2: Field-Level Auto-Merge │
     │ (Fast-Forward Merge)   │            └───────────────┬────────────────┘
     └────────────────────────┘                            │
                                           ┌───────────────┴───────────────┐
                                           │ Disjoint Fields?              │ Conflicting Property
                                           ▼                               ▼
                               ┌──────────────────────┐        ┌──────────────────────┐
                               │ Combine Attributes   │        │ TIER 3: Interactive  │
                               │ (Auto 3-Way Merged)  │        │ Conflict Prompt (TUI)│
                               └──────────────────────┘        └──────────────────────┘
```

### 4.1 Tier 1: Clear Winner (Fast-Forward)
* If the remote update timestamp is significantly newer than the local mutation (or vice versa) and base ancestry is linear:
  - **Action**: The newer record cleanly replaces the older state without prompting.

### 4.2 Tier 2: Field-Level 3-Way Merge
* If concurrent edits modified non-overlapping properties (e.g., Device A changed task `status: "InProgress"`, while Device B added task `details: "Updated specs"`):
  - **Action**: iNoU merges the disjoint properties into a unified record automatically.

### 4.3 Tier 3: Interactive Conflict Prompt (Git Merge Style)
* If the same property was mutated concurrently with conflicting values (e.g., Device A set title *"Refactor Auth"* at 10:00:00, while Device B set title *"Delete Auth"* at 10:00:01):
  - **Action**: Triggers `askInteractiveQuestion` presenting a visual side-by-side diff:
    ```text
    ⚠️ [Sync Conflict in Task "task_101"]
    [Local  (Home Laptop)]:  title = "Refactor Auth"   | updatedAt: 2026-08-15T10:00:00Z
    [Remote (Office PC)  ]:  title = "Delete Auth"     | updatedAt: 2026-08-15T10:00:01Z

    Choose resolution:
    1. Keep Local ("Refactor Auth")
    2. Keep Remote ("Delete Auth")
    3. Manually merge in interactive prompt
    ```

---

## 5. Instant Delta Sync Query Optimization

Instead of scanning all records, delta synchronization executes instant indexed range queries:

```sql
-- Fetch only mutated records since last sync
SELECT * FROM tasks WHERE updated_at > :last_sync_at;
SELECT * FROM memories WHERE updated_at > :last_sync_at;
SELECT * FROM projects WHERE updated_at > :last_sync_at;
```

* **Throughput**: $<50\mu\text{s}$ query execution time.
* **Payload Size**: Transmits strictly changed rows, minimizing bandwidth consumption to mere kilobytes even for massive Master Mind databases.
