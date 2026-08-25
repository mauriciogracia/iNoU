# Embedded SQLite Schema, Indexing & DDL Specification (`tech-specs/sqlite_schema_and_indexes.specs.md`)

| Property | Value |
| :--- | :--- |
| **Status** | `CANONICAL DDL & INDEX SPEC` |
| **Domain** | SQLite WAL Engine, Table Schemas, Composite Performance Indexes, Cloud Sync Journal |
| **Architecture Reference** | [`main-specs-goals.md`](file:///d:/repos/iNoU/docs/tech-specs/main-specs-goals.md) (§6.1), [`storage_and_sync_architecture.specs.md`](file:///d:/repos/iNoU/docs/tech-specs/storage_and_sync_architecture.specs.md) |

---

## 1. System Overview & Invariants

All local persistence in iNoU executes via an embedded SQLite database (`.inuo.db`) configured in **Write-Ahead Logging (WAL)** mode.
To ensure sub-millisecond ($<1\text{ms}$) delta queries, recursive DAG traversals, and conflict detection, all tables enforce single-definition structures and composite B-tree indexes.

```
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;
```

---

## 2. Canonical DDL Table Schemas

### 2.1 Collection Metadata & High-Watermarks (`collection_sync_meta`)
```sql
CREATE TABLE IF NOT EXISTS collection_sync_meta (
    collection_name TEXT PRIMARY KEY,
    last_sync_at TEXT NOT NULL,
    sync_vector_version INTEGER NOT NULL DEFAULT 1,
    record_count INTEGER NOT NULL DEFAULT 0
);
```

### 2.2 Projects & Scopes (`projects`)
```sql
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    version TEXT NOT NULL DEFAULT '1.0.0',
    jurisdiction TEXT NOT NULL DEFAULT 'GLOBAL',
    active_environment TEXT NOT NULL DEFAULT 'staging',
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Disabled', 'Archived')),
    cloud_sync_id TEXT,
    sync_version INTEGER NOT NULL DEFAULT 1,
    sync_status TEXT NOT NULL DEFAULT 'LOCAL_ONLY' CHECK (sync_status IN ('LOCAL_ONLY', 'SYNCED', 'MODIFIED', 'CONFLICT')),
    sync_hash TEXT,
    device_origin_id TEXT,
    last_synced_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

### 2.3 Workspaces (`workspaces`)
```sql
CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

### 2.4 Workflows (`workflows`)
```sql
CREATE TABLE IF NOT EXISTS workflows (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    root_nodes_json TEXT NOT NULL DEFAULT '[]',
    is_active INTEGER NOT NULL DEFAULT 1,
    cloud_sync_id TEXT,
    sync_version INTEGER NOT NULL DEFAULT 1,
    sync_status TEXT NOT NULL DEFAULT 'LOCAL_ONLY' CHECK (sync_status IN ('LOCAL_ONLY', 'SYNCED', 'MODIFIED', 'CONFLICT')),
    sync_hash TEXT,
    device_origin_id TEXT,
    last_synced_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
```

### 2.5 Tasks & DAG Workflow Nodes (`tasks` / `nodes`)
```sql
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    workflow_id TEXT,
    parent_task_id TEXT,
    semantic_path TEXT,
    title TEXT NOT NULL,
    verb TEXT,
    object TEXT,
    role TEXT,
    status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'InProgress', 'Blocked', 'Fulfilled', 'Closed')),
    details TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
    FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
);
```

### 2.6 Dependency Edges (`dependency_edges`)
```sql
CREATE TABLE IF NOT EXISTS dependency_edges (
    source_uuid TEXT NOT NULL,
    target_uuid TEXT NOT NULL,
    workflow_id TEXT NOT NULL,
    dependency_type TEXT NOT NULL CHECK (dependency_type IN ('FS', 'SS', 'FF', 'SF')),
    transform_expression TEXT,
    condition_expression TEXT,
    PRIMARY KEY (source_uuid, target_uuid),
    FOREIGN KEY (source_uuid) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (target_uuid) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
);
```

### 2.7 Scoped Preferences (`preferences`)
```sql
CREATE TABLE IF NOT EXISTS preferences (
    storage_key TEXT PRIMARY KEY,
    pref_key TEXT NOT NULL,
    value_json TEXT NOT NULL,
    scope TEXT NOT NULL DEFAULT 'global' CHECK (scope IN ('global', 'project', 'workspace', 'task')),
    scope_id TEXT,
    is_enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

### 2.8 External Integrations & Adapters (`integrations`)
```sql
CREATE TABLE IF NOT EXISTS integrations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('llm', 'social', 'cloud_storage', 'mcp', 'webhook')),
    provider TEXT NOT NULL,
    auth_type TEXT NOT NULL DEFAULT 'apiKey' CHECK (auth_type IN ('apiKey', 'oauth2', 'serviceAccount', 'bearerToken', 'none')),
    endpoint TEXT,
    status TEXT NOT NULL DEFAULT 'Connected' CHECK (status IN ('Connected', 'Disconnected', 'RateLimited', 'Error')),
    scope TEXT NOT NULL DEFAULT 'global' CHECK (scope IN ('global', 'project', 'workspace', 'task')),
    scope_id TEXT,
    vault_secret_key_ref TEXT,
    rate_limit_per_minute INTEGER DEFAULT 60,
    metadata_json TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

### 2.9 Master Mind Memories & Principles (`memories`)
```sql
CREATE TABLE IF NOT EXISTS memories (
    id TEXT PRIMARY KEY,
    memory_type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    topic TEXT,
    status TEXT NOT NULL DEFAULT 'Active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

### 2.10 Cloud Sync Delta Journal (`cloud_sync_journal`)
```sql
CREATE TABLE IF NOT EXISTS cloud_sync_journal (
    journal_id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('PROJECT', 'WORKFLOW', 'TASK', 'EDGE', 'PREFERENCE', 'INTEGRATION')),
    entity_id TEXT NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    payload_diff_json TEXT,
    vector_clock_json TEXT,
    device_id TEXT NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (sync_status IN ('PENDING', 'IN_FLIGHT', 'COMMITTED', 'FAILED')),
    recorded_at TEXT NOT NULL,
    synced_at TEXT
);
```

---

## 3. High-Performance Index Declarations

```sql
-- 1. Delta Sync High-Watermark Optimization
CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON tasks(updated_at);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at);
CREATE INDEX IF NOT EXISTS idx_workspaces_updated_at ON workspaces(updated_at);
CREATE INDEX IF NOT EXISTS idx_memories_updated_at ON memories(updated_at);

-- 2. DAG AST Path & Hierarchy Resolution
CREATE INDEX IF NOT EXISTS idx_tasks_workflow ON tasks(workflow_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_semantic_path ON tasks(workflow_id, semantic_path);
CREATE INDEX IF NOT EXISTS idx_dependency_edges_workflow ON dependency_edges(workflow_id);

-- 3. Scoped Preference & Integration Lookups
CREATE INDEX IF NOT EXISTS idx_preferences_scope ON preferences(scope, scope_id, pref_key);
CREATE INDEX IF NOT EXISTS idx_integrations_provider ON integrations(provider, scope);

-- 4. Cloud Sync Pending Queue
CREATE INDEX IF NOT EXISTS idx_sync_journal_pending ON cloud_sync_journal(sync_status, recorded_at);
```
