# Scenario 02: Macro-Need Decomposition, Colmena Swarm & Multi-Agent Fulfillment

| Property | Value |
| :--- | :--- |
| **Status** | `CANONICAL` |
| **Domain** | Distributed Fulfillment, Swarm Orchestration, DAG Decomposition |
| **Architecture Reference** | [`main-specs-goals.md`](file:///d:/repos/iNoU/docs/tech-specs/main-specs-goals.md) §3, §4, §5 |

---

## 1. Scenario Context & Problem Statement

A humanitarian crisis or community infrastructure initiative requires building a **10km Emergency Access Road** connecting isolated rural clinics to a central supply hub.

### The Challenge:
1. **Scale & Complexity**: A single human or organization cannot fulfill this objective in a single step.
2. **Resource Heterogeneity**: Fulfillment requires diverse skills, physical machinery, raw gravel, engineering sign-offs, and logistics.
3. **Intermittent Connectivity**: Workers and survey teams in rural zones operate offline or over low-bandwidth SMS/USSD networks.
4. **Trust & Governance**: High-value equipment (excavators, fuel) requires multi-party threshold authorization and anti-manipulation defenses.

**Core Question**: How does iNoU systematically break down this macro-objective into a deterministic DAG AST of atomic Needs/Offers, dispatch tasks across peer Colmena nodes, and orchestrate fulfillment with zero single-point-of-failure?

---

## 2. Architectural Execution Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│               MACRO-NEED: "Build 10km Emergency Road"                  │
│                     NEED = (Construct) + (AccessRoad)                  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                         [Decomposition Engine]
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        DIRECTED ACYCLIC GRAPH (DAG)                    │
│                                                                        │
│   ┌─────────────────────┐                  ┌───────────────────────┐   │
│   │ [1.0] Survey Land   │ (Prerequisite)   │ [2.0] Clear Terrain   │   │
│   │ NEED = (Survey)     ├─────────────────►│ NEED = (Clear)        │   │
│   │ STATUS: 'Completed' │                  │ STATUS: 'InProgress'  │   │
│   └─────────────────────┘                  └───────────┬───────────┘   │
│                                                        │               │
│                                                        ▼               │
│   ┌─────────────────────┐                  ┌───────────────────────┐   │
│   │ [3.0] Pour Gravel   │ (Prerequisite)   │ [4.0] Quality Audit   │   │
│   │ NEED = (Pave)       ├─────────────────►│ NEED = (Inspect)      │   │
│   │ STATUS: 'Blocked'   │                  │ STATUS: 'Blocked'     │   │
│   └─────────────────────┘                  └───────────────────────┘   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                        [Colmena Network Dispatch]
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
┌───────────────┐           ┌───────────────┐           ┌───────────────┐
│ ColmenaNode A │           │ ColmenaNode B │           │ ColmenaNode C │
│ (Survey Team) │           │ (Heavy Equip) │           │ (Audit Board) │
│ Score: 95/100 │           │ Score: 88/100 │           │ Score: 100/100│
└───────────────┘           └───────────────┘           └───────────────┘
```

---

## 3. Step-by-Step Execution Workflow

### 3.1 Macro-Need Registration & Semantic Inception
The Project Leader registers the top-level initiative using semantic commands:
```bash
./inou.sh project add --name "EmergencyRoadInitiative" --jurisdiction "LATAM-CO"
./inou.sh workspace add --name "RoadSector4"
./inou.sh task add --type need --verb "Construct" --object "AccessRoad"
```

### 3.2 Recursive Decomposition via AI & Expert Guidance
The AI Decomposition Engine breaks the macro-need into atomic sub-tasks with strict prerequisite dependencies:

```bash
# 1. Land Survey & Topography
./inou.sh task add --workflow "RoadWF" --title "1.0 Topographic Land Survey" --role "Surveyor"

# 2. Heavy Machinery Terrain Clearing (Blocked until 1.0 is Completed)
./inou.sh task add --workflow "RoadWF" --title "2.0 Heavy Terrain Clearing" --role "Operator"

# 3. Gravel & Compaction (Blocked until 2.0 is Completed)
./inou.sh task add --workflow "RoadWF" --title "3.0 Gravel Laying and Compacting" --role "Engineer"

# 4. Final Safety & Drainage Inspection (Blocked until 3.0 is Completed)
./inou.sh task add --workflow "RoadWF" --title "4.0 Final Road Safety Sign-off" --role "Inspector"
```

### 3.3 Colmena Peer Discovery & Swarm Matching
- **Peer Nodes Broadcast Offers**: Local contractors, municipal teams, and volunteer groups broadcast matching offers:
  ```bash
  ./inou.sh task add --type offer --verb "Clear" --object "Terrain"
  ./inou.sh task add --type offer --verb "Supply" --object "GravelTons"
  ```
- **Interaction Engine Matching**: The system validates compatibility:
  $$\text{MATCH} = \text{NEED}(\text{Clear}, \text{Terrain}) \iff \text{OFFER}(\text{Clear}, \text{Terrain})$$
- Sub-tasks transition from `Open` $\rightarrow$ `Matched` $\rightarrow$ `Fulfilled`.

### 3.4 Multi-Party Trust Threshold Protection
High-impact operations (e.g., releasing municipal heavy bulldozers) are gated by Multi-Party Consensus:
```bash
./inou.sh preference add --key threshold_gate --name "HeavyEquipmentRelease" --target 150
```
- **Engineer** (Trust Score: 90) + **Project Director** (Trust Score: 95) co-sign $\rightarrow$ Total: $185 \ge 150 \implies$ **Unlocked**.
- Unauthorized external parties attempting command injection are disconnected in $<2\text{ms}$ by the Millisecond Circuit Breaker.

### 3.5 Offline-First Store & Forward Protocol
When field operators enter zero-connectivity zones:
1. Field telemetry and completion receipts are stored locally in `.inuo-state.json`.
2. Upon reconnecting to WiFi, GSM, or satellite, `checkAndApplySyncProtocol()` reconciles state vectors using deterministic ISO timestamps.
3. Upstream DAG nodes evaluate status and unblock downstream dependencies automatically.

---

## 4. Key Takeaways & System Invariants

1. **Deterministic State Propagation**: Parent workflows remain strictly `Blocked` until all child DAG nodes are `Fulfilled`.
2. **Model Isolation**: Free/Gift-based mutual aid is never mixed with transactional commercial contracts.
3. **Decentralized Resilience**: Any Colmena peer can host the DAG and sync state asynchronously without cloud dependency.
4. **Immutable Auditability**: All milestone transitions, co-signatures, and telemetry entries are cryptographically preserved in the audit log.
