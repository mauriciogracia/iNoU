---
name: trello-integration-skill
description: Out-of-the-box integration skill for Trello, mapping iNoU Projects to Trello Boards and DAG Task nodes to Trello Cards with bi-directional status synchronization.
---

# Trello Integration Skill (`trello-integration-skill`)

## 1. Overview & Capability

This skill provides native out-of-the-box synchronization between iNoU's AST DAG task engine and **Trello Kanban Boards**:
1. **Board Provisioning**: Automatically provisions or binds a Trello Board to an iNoU `project`.
2. **DAG Task $\longleftrightarrow$ Card Mapping**: Converts iNoU workflow nodes, Needs, and Offers into Trello cards with labels, checklists, and assignees.
3. **Bi-Directional Status Sync**: Synchronizes card movements across lists with iNoU task states (`Open` $\longleftrightarrow$ *To Do*, `InProgress` $\longleftrightarrow$ *In Progress*, `Blocked` $\longleftrightarrow$ *Blocked*, `Fulfilled` $\longleftrightarrow$ *Done*).

---

## 2. Entity & List Mapping Schema

```
┌─────────────────────────────┐                    ┌─────────────────────────────┐
│       iNoU TASK ENGINE      │                    │     TRELLO KANBAN BOARD     │
├─────────────────────────────┤                    ├─────────────────────────────┤
│  Project: "EmergencyRoad"   │ ◄────────────────► │  Board: "EmergencyRoad"     │
│                             │                    │                             │
│  • Task (status: 'Open')    │ ◄────────────────► │  List: "To Do" (Backlog)    │
│  • Task (status: 'InProg')  │ ◄────────────────► │  List: "In Progress"        │
│  • Task (status: 'Blocked') │ ◄────────────────► │  List: "Blocked / Waiting"  │
│  • Task (status: 'Fulfilled')│◄────────────────► │  List: "Done / Completed"   │
└─────────────────────────────┘                    └─────────────────────────────┘
```

---

## 3. Out-of-the-Box Configuration & Execution

### 3.1 Register Trello Connection
```bash
# 1. Register Trello Integration in iNoU (scoped to project or global)
./inou.sh preference add --key integration --category webhook --provider trello --name "ProjectTrelloBoard" --project "EmergencyRoad"

# 2. Store Trello API Key & Token in local vault
./inou.sh preference add --key trello_api_key --value "YOUR_TRELLO_API_KEY"
./inou.sh preference add --key trello_token --value "YOUR_TRELLO_TOKEN"
```

### 3.2 Export Task DAG to Trello Board
```bash
# Automatically creates Trello cards for all active workflow nodes
./inou.sh task list --project "EmergencyRoad"
```

### 3.3 Status Reconciler Workflow
When a card is moved to **Done** in Trello:
* Webhook notifies `/api/v1/webhook/trello`.
* iNoU validates prerequisite completion.
* Unblocks downstream dependent tasks in the DAG AST automatically.
