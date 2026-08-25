---
name: contextual-sync-skill
description: Automatically detects and reconciles state deltas bi-directionally with granular entity filtering (project, workspace, task, memory, preference) based on active context and network bandwidth.
---

# Autonomous Contextual Synchronization Skill (`contextual-sync-skill`)

## 1. Purpose & Autonomous Bi-Directional Design

iNoU eliminates manual `up`/`down` directions. Calling **`sync`** automatically analyzes local and remote timestamp vectors, detecting whether local changes need to be pushed, remote updates need to be pulled, or a 3-way reconciliation is required.

---

## 2. Autonomous Sync Syntax & Options

$$\text{Command: } \texttt{./inou.sh sync [--entities <list>] [--project <id>] [--workflow <id>] [--lightweight] [--channel <target>]}$$

### 2.1 Autonomous Delta Resolution
* **Local state is newer**: Automatically packages local entity delta and updates cloud/Master Mind.
* **Remote state is newer**: Automatically pulls and hydrates missing entities into local workspace.
* **Concurrent changes**: Applies deterministic vector clock reconciliation.

---

## 3. Granular Filter Options

| Filter Flag | Description | Benefit |
| :--- | :--- | :--- |
| `--entities task,workspace` | Limits sync to active DAG tasks & files | Fast code/task synchronization without heavy memory payloads. |
| `--entities memory` | Limits sync to skills, principles & rules | Distributes learned capabilities across agents/machines. |
| `--project <id>` | Scopes synchronization to a specific project | Multi-project workspace isolation. |
| `--workflow <id>` | Scopes synchronization to a single DAG workflow | Focused microservice / module development. |
| `--lightweight` | Excludes raw transcripts, audit logs, and binaries | Minimal bandwidth consumption over cellular or satellite. |

---

## 4. Usage Examples

```bash
# 1. Fully autonomous sync (reconciles all entities bi-directionally)
./inou.sh sync

# 2. Autonomous sync for a specific task workflow
./inou.sh sync --entities task --workflow "FleetDispatchWF"

# 3. Lightweight sync on mobile/cellular connection
./inou.sh sync --entities project,task,workspace --lightweight
```
