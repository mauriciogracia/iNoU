# Technical Specification 0010: Native Project & Social Integrations (LinkedIn, Trello, Jira)

## 1. Overview & Architectural Role

To power seamless task execution and talent orchestration, **iNoU** provides native, out-of-the-box integrations with external productivity and social platforms. These integrations bridge external boards and social channels with iNoU's internal **AST Goal Decomposition Engine** and **ConnectingNeeds Marketplace**.

```
+─────────────────────────────────────────────────────────────────────────────+
|                                iNoU Core                                    |
|                                                                             |
|  +───────────────────────────────────────────────────────────────────────+  |
|  | AST Goal Decomposition & Task Tree (Milestones & Sub-Needs)           |  |
|  +───────────────────────────────────────────────────────────────────────+  |
|                                     │                                       |
|             ┌───────────────────────┼───────────────────────┐               |
|             ▼                       ▼                       ▼               |
|    [ LinkedIn Adapter ]     [ Trello Adapter ]      [ Jira Adapter ]        |
|   • Job Post Publishing    • List of Lists         • Projects & Sprints     |
|   • Profile Sharing        • Cards per List        • Issues & Epics         |
|   • 1-Click Apply Link     • 2-Way Sync            • 2-Way Sync             |
+─────────────┬───────────────────────┬───────────────────────┬───────────────+
              │                       │                       │
              ▼                       ▼                       ▼
      [ LinkedIn API ]          [ Trello API ]          [ Jira Cloud API ]
```

---

## 2. Trello Integration Specifications

### 2.1 Core Capabilities
1. **Board Discovery**: List all accessible Trello boards for the authenticated account (`trello boards`).
2. **List of Lists Retrieval**: Fetch all lists/columns on a board (e.g., `Backlog`, `In Review`, `Sprint 1`, `Done`) (`trello lists --board <boardId>`).
3. **Tickets / Cards per List**: Fetch all tickets belonging to each list, including card title, description, checklists, labels, due dates, and assignees (`trello cards --list <listId>`).
4. **AST Bi-Directional Mapping**:
   - Import Trello cards into iNoU as sub-needs / tasks.
   - Export iNoU milestone decomposition trees as a structured Trello board with columns and cards.

### 2.2 CLI & Natural Language Commands
- `trello connect --key <apiKey> --token <apiToken>`
- `trello boards`
- `trello lists <boardId>`
- `trello cards <listId>`
- `trello sync --board <boardId>` (Syncs board cards directly into active chat / task state)
- Natural Language: *"Show me the lists and tickets on my Mobile App Trello board"* ➔ iNoU fetches lists and prints hierarchical cards per list.

---

## 3. Jira Cloud Integration Specifications

### 3.1 Core Capabilities
1. **Project & Board Hierarchy**: Fetch Jira projects, Agile Scrum/Kanban boards, and active Sprints (`jira projects`, `jira boards`).
2. **Issues & Epics by Status**: Query issues filtered by project, status category (`To Do`, `In Progress`, `Done`), or JQL query (`jira issues --project <KEY>`).
3. **Task Decomposition Sync**: Push iNoU project specifications and milestones directly to Jira as an Epic with nested Stories/Tasks.

### 3.2 CLI & Natural Language Commands
- `jira connect --domain <your-domain>.atlassian.net --email <email> --token <apiToken>`
- `jira projects`
- `jira issues --project <KEY> --status <status>`
- `jira create-epic --title <title> --spec <specId>`

---

## 4. LinkedIn Integration Specifications

### 4.1 Core Capabilities
1. **Native Social OAuth**: Authenticate via LinkedIn OAuth 2.0 (`social connect linkedin`).
2. **Job Post Copy Generation**: AI formats structured job specifications into viral LinkedIn updates with summary, tech stack, and hashtags.
3. **Direct Publication**: Post job opportunities directly to personal profiles or company pages via LinkedIn Share API (`publish linkedin --job <specId>`).

## 5. Discord Integration Specifications (`Peer Matching & Communities`)

To avoid reinventing the wheel for realtime chat, voice channels, and gaming communities, iNoU leverages **Discord's battle-tested infrastructure**:

### 5.1 Core Capabilities
1. **Instant Ephemeral Match Threads / Channels**:
   - When two peers match (e.g. for chess, gaming, language exchange, or project discussion), the iNoU Discord Bot automatically generates a private, temporary Discord Channel or Thread.
2. **Community Radar Webhooks**:
   - Discord servers/guilds can link an iNoU community webhook to broadcast local Needs and Offers to dedicated server channels (e.g. `#job-board`, `#gaming-lobby`, `#language-exchange`).
3. **Bot Direct Commands**:
   - `/need <description>`: Directly publish a need from within Discord.
   - `/match`: Scan the iNoU radar from Discord.

---

## 6. Security & Credential Storage

- All integration credentials (Trello API Key & Token, Jira Domain & API Token, LinkedIn OAuth Token, Discord Bot Token & Webhook URLs) are stored in the local encrypted credential vault or `.env` and managed in the `⚙ Integraciones` UI tab.
