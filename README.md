# iNoU Platform & Self-Orchestrating CLI (`v00.03.70`)

> **iNoU (iNoU — I Need U Offer)** is a universal interaction matching protocol, cognitive architecture, and self-orchestrating platform built around canonical Need and Offer formulations, multi-modal device fleets, sub-2ms dynamic trust circuit breakers, and cognitive behavior hierarchies.

---

## 📐 Canonical Versioning Scheme

iNoU uses a structured, 3-component canonical versioning format:

$$\mathbf{Version} = \mathbf{Deployed.SpecRevision.Implementation}$$

- **Deployed Percentage (`00`–`100`)**: Percentage of functionality deployed to cloud/production infrastructure (`00` for local runtime).
- **Specification Revision (`00`, `01`, `02`, `03`, ...)**: Incremental lifecycle index of the persistent canonical specification ([`INUO_SPEC.md`](file:///d:/repos/iNoU/INUO_SPEC.md)).
- **Implementation Percentage (`00`–`100`)**: Percentage of specified platform functions implemented and verified with automated test suites.

**Current Version:** `00.03.70` (Spec Revision 03, 70% implementation verified, 194/194 unit tests passing).

---

## 🌟 Key Architectural Pillars

### 1. Symmetrical Mathematical Formulation & Intent Matching

Every platform operation and user intent is modeled symmetrically:

$$\text{NEED} = (\text{VERB}) + (\text{OBJECT})$$
$$\text{OFFER} = (\text{COMP\_VERB}) + (\text{OBJECT})$$

- **Global Catalog Integrity**: All interaction items (`Product`, `Service`, `SocialInteraction`) link directly to a centralized `GlobalCatalog` of paired verbs and complements (e.g., `Request` $\leftrightarrow$ `Provide`, `Consult` $\leftrightarrow$ `Advise`, `Ride` $\leftrightarrow$ `Drive`).
- **Model Isolation**: Strict architectural separation between **Transactional (Commercial)** and **Gift-Based (Altruistic)** models. Cross-contamination of fulfillment logic or altruistic state is prohibited.
- **Dependency Graphs**: Macro-needs decompose into atomic needs linked through prerequisite dependencies.

---

### 2. Paradigm Shift: iNoU vs. Asimov's 3 Laws of Robotics

Isaac Asimov's classical Laws of Robotics (1942) suffer from fatal real-world vulnerabilities including blind obedience, prompt injection susceptibility, static rigidity, and blind assumptions under ambiguity. iNoU replaces them with modern architectural defenses:

| Classical Asimov Law | Vulnerability | iNoU Architectural Solution |
| :--- | :--- | :--- |
| **1st Law**: *Do not harm a human or allow harm.* | Ambiguous mathematical definition of "harm" without context. | **Unalterable Principles & Emergency Engine**: Zero-tolerance safety principles; owner incapacitation activates emergency human defense. |
| **2nd Law**: *Obey human orders.* | Blind obedience and prompt injection (treats all humans identically). | **Identity Verification & Stranger Defense**: `TrustScore` verification. Strangers are blocked during emergencies while family retains operational access. |
| **3rd Law**: *Protect own existence.* | Passive self-protection; vulnerable to prompt manipulation and poisoning. | **Sub-2ms Reactive Circuit Breaker**: Instant trust penalization (-100 pts) and immediate disconnection upon prompt injection / manipulation. |
| **No Learning Concept** | Static rigidity; cannot adapt or discard outdated directives. | **Adaptive Learning, Unlearning (`forget`), & Hive Fleet**: Scoped memory, interactive correction learning, and unlearning without principle degradation. |
| **Blind Assumptions** | Forced assumptions produce catastrophic errors under ambiguity. | **Interactive Questions & Doubts Engine**: iNoU explicitly queries the human Knowledge Provider instead of guessing. |

---

### 3. Dynamic Trust Engine & Sub-2ms Reactive Circuit Breaker

Every user, device, peer node, and MCP server maintains a dynamic `TrustScore` (0–100) and `TrustLevel`:

- **`HighTrust` (80–100)**: Unrestricted access to execution skills, deep goal decomposition, and federated Colmena sync.
- **`MediumTrust` (50–79)**: Standard access to formulas and catalog. Internal governance principles remain shielded.
- **`LowTrust` (30–49)**: Read-only access with strict rate-limiting and blocked knowledge export.
- **`Blacklisted / Untrusted` (0–29)**: Immediate severance within sub-2 milliseconds.

```text
⚡ [Millisecond Circuit Breaker] Trust penalization completed in 1ms.
  Entity: suspicious_node_01 | Score: 0/100 | Level: Blacklisted | Disconnected: true
```

- **Multi-Party Threshold Consensus**: Critical resources can require multi-signature trust consensus (e.g., sum of member trust scores $\ge 150$) before unlocking.

---

### 4. Cognitive Hierarchy & 3-Version Circular History Buffer

Engines are structured as dynamic collections of behaviors rather than rigid monoliths:

$$\text{Skills} \longrightarrow \text{Behaviors} \longrightarrow \text{Engines} \longrightarrow \text{Master Mind}$$

- **Skills**: Atomic operational procedures (e.g., `PromptInjectionCheck`, `TrustScoreCalculator`).
- **Behaviors**: Logical groupings of skills targeting an operational goal (e.g., `AntiManipulationBehavior`, `CircuitBreakerBehavior`).
- **Engines**: Domain governance collections (e.g., `TrustEngine`, `AuthEngine`, `EmergencyEngine`).
- **Master Mind**: Central orchestrator across multi-device fleets (Android, iOS, Smart TV, Smart Watch, Desktop CLI).
- **3-Version Sliding Circular Buffer**: Maintains snapshots of the 3 most recent Master Mind states ($t$, $t-1$, $t-2$), enabling instant multi-level rollbacks while preserving immutable Master Trainer principles.

---

### 5. Multi-Interface Runtime (TUI, Web Client, & CLI)

iNoU provides native interaction interfaces:

1. **Split-Pane Terminal UI (`npm run cli` / `./inou.sh`)**: High-performance Blessed-based terminal interface with real-time logging, command history, and split-pane layout.
2. **ASCII Web Client & Express Server (`./iwc.sh` / `npm run web`)**: Lightweight Express HTTP server serving a modern responsive web client with live watch mode, real-time Server-Sent Events (SSE `/api/stream`), and REST endpoints.
3. **Docker Web Client (`./idwc.sh` / `./iwc.sh --docker` / `npm run docker:web`)**: Automated containerized web runtime that spins up real Docker containers (iNoU Hub + Ollama + Caddy Ingress), verifies container health, and opens Google Chrome to the running Docker environment.
4. **Direct CLI Tool (`bin/inuo.js <command>`)**: Non-interactive command runner for CI/CD pipelines, scripting, and ecosystem adapters.

---

### 6. Multi-LLM Provider & Workflow Nodes

Configure and route executions across multiple local or cloud LLM providers without storing secrets in repository state:

- **Supported Engines**: Google Gemini (via `@google/genai`), GitHub Copilot, Ollama, OpenAI-compatible APIs, Anthropic, etc.
- **Workflow Node Routing**: Assign discrete workflow nodes to specific LLM configurations:
  ```bash
  inuo node add planner-node gemini-planner
  inuo node add coder-node copilot-exec
  inuo node list
  ```
- **External Non-Secret CLI Configuration**:
  ```bash
  inuo llm add gemini --name gemini-planner --model gemini-2.5-flash --plan yes --execute no
  inuo llm add copilot --name copilot-exec --model gpt-4.1 --plan yes --execute yes
  inuo llm status
  ```

---

### 7. Multi-Platform Social Network Broadcast

Manage social broadcast targets directly from the shell or web client:

- **Supported Networks**: Instagram, TikTok, Facebook, LinkedIn.
- **CLI Commands**:
  ```bash
  inuo sn add linkedin my-company --account @inuo-corp --enabled yes
  inuo sn add instagram dev-daily --account @inuo_dev --enabled yes
  inuo sn list
  inuo social broadcast "iNoU v00.03.70 released with 194 passing unit tests!"
  ```

---

### 8. iNoU-on-iNoU Recursive Self-Evolution Engine

Evolve the platform using the platform! The `evolve` command accepts a Product Owner goal, semantically decomposes it using Gemini AI, generates single-definition TypeScript files (`src/interfaces/`, `src/types/`, `src/enums/`), runs automated verification tests, and automatically updates [`INUO_SPEC.md`](file:///d:/repos/iNoU/INUO_SPEC.md) and bumps `SPEC_VERSION` when verified.

```text
inuo (v00.03.70) > evolve "Add JWT Auth Provider to Ecosystem Adapter"
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### Installation & Build

```bash
# 1. Clone repository
git clone https://github.com/mauriciogracia/iNoU.git
cd iNoU

# 2. Install dependencies
npm install

# 3. Compile pure TypeScript source to dist/
npm run build
```

### Launching iNoU

```bash
# Launch interactive Terminal UI / Shell
./inou.sh

# Or start the Web UI server and open the browser client
./iwc.sh

# Or start the Web UI server explicitly via npm
npm run web
```

### Running Test Suite

```bash
# Executes complete automated test suite across all 40 test suites (194 tests)
npm test
```

---

## 📖 Comprehensive Command Reference

| Category | Command | Description |
| :--- | :--- | :--- |
| **Core Intent** | `<Natural Language>` | AI intent parsing into canonical `NEED` or `OFFER` structures |
| | `need list` | List active Needs and their resolution states |
| | `need create --verb V --object O` | Create a new canonical Need object |
| | `offer list` | List active Offers |
| | `offer create --verb V --object O` | Create a new canonical Offer object |
| | `match` | Execute Interaction Engine matching algorithm |
| | `detail <needId> [decompose <goal>]`| Decompose macro-goals into atomic sub-needs and tasks |
| | `answer <doubtId> <answerText>` | Provide human Knowledge Provider answers to resolve system doubts |
| **LLM & Nodes** | `llm add <engine>` | Configure an LLM provider profile (`--name`, `--model`, `--plan`, `--execute`) |
| | `llm list` | List registered LLM configurations |
| | `llm status` | Display provider summary and token usage metrics |
| | `llm remove <configName>` | Remove an LLM configuration profile |
| | `node add <name> <config>` | Create a workflow execution node mapped to an LLM config |
| | `node list` | List all workflow execution nodes |
| | `node update <name> <config>` | Update node provider association |
| | `node remove <name>` | Delete a workflow node |
| **Social** | `sn add <net> <name>` | Register a social network profile (`instagram`, `tiktok`, `facebook`, `linkedin`) |
| | `sn list` | List configured social network broadcast channels |
| | `sn update <name> [flags]` | Modify social network configuration and enabled status |
| | `sn remove <name>` | Remove a social network configuration |
| | `social broadcast <message>` | Broadcast message to all enabled social network channels |
| **Security & Trust**| `auth signin <userId> [method]` | Authenticate user session with local auth vault |
| | `auth signout` | End active user session |
| | `whoami` / `user` | Display active user identity, trust score, and role |
| | `user set <userId> [role] [isFam]` | Switch or create local user profile |
| | `threshold create <res> <pts>` | Create multi-member threshold consensus gate for a resource |
| | `threshold request <res> <users...>`| Request resource unlock via combined trust signature |
| | `threshold list` | List active threshold gates and requirements |
| | `member add <name> <rel> [phone]` | Register a family member or trusted friend |
| | `member bind <devId> <memberId>` | Bind a device to a trusted member profile |
| | `member emergency-trigger [loc]` | Simulate owner incapacitation and activate stranger defense |
| | `device list` / `device bind` | Manage multi-modal client device fleet |
| **Governance** | `principle list` / `principle add` | View and manage immutable Master Trainer principles |
| | `role list` / `role add` | Manage identity roles and access permissions |
| | `behavior list` / `behavior add` | Manage cognitive behavior collections |
| | `skill list` / `skill add` | Manage atomic operational execution skills |
| | `mcp list` / `mcp register <name>` | Manage Model Context Protocol (MCP) server integrations |
| | `colmena list` / `colmena connect` | Manage decentralized federated Colmena hive nodes |
| **Memory & Learning**| `learn <topic> <directive>` | Teach iNoU a new scoped behavioral correction or rule |
| | `correct <topic> <correction>` | Record user correction for contextual prompt conditioning |
| | `forget <topic>` | Deactivate learned directive/correction (unlearning protocol) |
| | `export-training` | Export scoped training datasets excluding private secrets |
| | `merge-training <path>` | Merge training dataset from a peer node under quarantine |
| **Master Mind** | `mastermind status` | View Master Mind synchronization state and active version |
| | `mastermind history` | Inspect the 3-version circular history buffer ($t, t-1, t-2$) |
| | `mastermind rollback <ver>` | Roll back Master Mind state to a previous version in the circular buffer |
| **Modes & Diagnostics**| `mode [promptMe\|letMeServeYou]` | Switch operating mode between interactive prompting and proactive service |
| | `succinct [on\|off]` | Toggle concise output formatting |
| | `debug [0\|1\|2\|3]` | Adjust logging verbosity level |
| | `status` | Display specification version, sync status, and item counts |
| | `version` / `-v` | Display canonical 3-component version (`Deployed.SpecRevision.Implementation`) |
| | `catalog` | List Global Catalog of verbs, complement verbs, and pairings |
| | `gc` / `browser` / `chrome` | Launch web browser interface |
| | `sync` | Validate and synchronize specification with local manifest |
| | `evolve <goal>` | Execute self-orchestrating recursive evolution loop |
| | `test [version]` | Run specification and file structure verification |
| | `rollback <version>` | Revert `SPEC_VERSION` to previous snapshot |
| | `key [API_KEY]` | Connect or verify Google Gemini API key |
| | `help` | Display command reference summary |
| | `exit` / `quit` / `chao` / `bye` | Exit the shell (multilingual exit triggers supported) |

---

## 🌐 Web Server & REST API

iNoU includes a built-in Express server providing real-time Server-Sent Events (SSE) and RESTful API endpoints:

```text
GET    /api/status                     # Returns system status, version, and metrics JSON
GET    /api/stream                     # Real-time SSE stream for logs and terminal outputs
GET    /api/llm/configurations         # List non-secret LLM configurations
POST   /api/llm/configurations         # Create or update an LLM configuration profile
DELETE /api/llm/configurations/:name   # Remove an LLM configuration profile
POST   /api/command                    # Execute a shell command via HTTP (supports uiMode)
```

Launch with:
```bash
node bin/inuo.js web 3000
# or
npm run web
```

---

## 📐 Architecture & Development Directives

All development in this repository strictly adheres to [`docs/tech-specs/dev-rules.md`](file:///d:/repos/iNoU/docs/tech-specs/dev-rules.md), the **single source of truth** for architectural standards:

1. **Single Definition per File**: Every `enum`, `type` alias, and `interface` **MUST** reside in its own dedicated file:
   - `src/enums/`: Enums (e.g., [`NeedStatusEnum.ts`](file:///d:/repos/iNoU/src/enums/NeedStatusEnum.ts))
   - `src/types/`: Type Aliases (e.g., [`NeedStatus.ts`](file:///d:/repos/iNoU/src/types/NeedStatus.ts))
   - `src/interfaces/`: Interfaces (e.g., [`Need.ts`](file:///d:/repos/iNoU/src/interfaces/Need.ts))
   - All directories maintain clean barrel exports via `index.ts`.
2. **DRY & SOLID Principles**: Zero duplication of schemas or constants. Granular interfaces and decoupled engine behaviors.
3. **Build Artifact Isolation**: Compiled JavaScript output is emitted to `dist/` and excluded via `.gitignore`. Source code in `src/` contains **only pure TypeScript (`.ts`)**.
4. **Adaptive Learning Integrity**: Clear distinction between persistent JSON state (Level 0), contextual retrieval (Levels 1–3), and model-weight adaptation (Level 4).

---

## 📁 Repository Structure

```text
iNoU/
├── bin/
│   └── inuo.js              # Executable CLI entrypoint
├── browser/                 # Browser client assets and scripts
├── dist/                    # Compiled JavaScript build output (git-ignored)
├── docs/                    # Architectural diagrams and background documents
├── tech-specs/              # Technical specifications (main-specs-goals.md, dev-rules.md)
├── improved/                # Completed improvement logs (tracked via INDEX.md)
├── public/                  # Static web server assets (HTML, CSS, SVGs)
├── scripts/                 # Utility scripts (devWatcher, sync-improvements)
├── src/
│   ├── assets/              # Static code assets & banners
│   ├── cli/                 # CLI commands, shell, TUI, and engine implementations
│   ├── enums/               # Single-definition Enum files + barrel export
│   ├── i18n/                # Internationalization dictionaries (EN, ES, FR, PT, DE)
│   ├── interfaces/          # Single-definition Interface files + barrel export
│   ├── models/              # Model definitions & barrel exports
│   └── types/               # Single-definition Type alias files + barrel export
├── tests/                   # 46 automated test suites (239 unit tests)
├── to-improve/              # Pending improvement tasks (tracked via INDEX.md)
├── AGENTS.md                # Agent directives & repository instructions
├── docker-run.sh            # Local Docker container manager launcher
├── idwc.sh                  # Docker Web Client launcher (containers + browser)
├── inou.sh                  # Platform-agnostic shell launcher (Linux, macOS, WSL, Windows)
├── inuo-manifest.json       # Specification version sync manifest
├── iwc.sh                   # Browser web client launcher (supports --docker flag)
├── package.json             # NPM package definition & scripts
└── tsconfig.json            # TypeScript compiler configuration
```

---

## 🚀 Deployment

### Prerequisites

- **Docker & Docker Compose v2+** on the target server
- A **public domain** with DNS A record pointing to your server's IP
- A **Google Gemini API key** from [Google AI Studio](https://aistudio.google.com/app/apikey)

### GitHub Actions Secrets Required

Before the CI/CD pipeline can deploy, set the following secrets in your GitHub repository (`Settings → Secrets → Actions`):

| Secret | Description |
|---|---|
| `GEMINI_API_KEY` | Your Google AI Studio / Gemini API key |
| `INUO_DOMAIN` | Public domain, e.g. `inuo.yourdomain.com` |
| `DEPLOY_HOST` | IP or hostname of your production server |
| `DEPLOY_USER` | SSH user on the server (e.g. `deploy`) |
| `DEPLOY_SSH_KEY` | Private SSH key (server must have the public key in `~/.ssh/authorized_keys`) |

Optionally: `GEMINI_MODEL` (defaults to `gemini-flash-latest`).

### Manual Deployment (First Time / Local)

```bash
# 1. Clone onto the server
git clone <repo-url> /opt/inuo && cd /opt/inuo

# 2. Create the environment file
cp .env.example .env
# Edit .env: fill in GEMINI_API_KEY and INUO_DOMAIN

# 3. Deploy (builds image, starts Hub + Caddy, verifies health)
npm run deploy

# 4. Verify
curl https://your-domain/health
```

### Deployment Targets

| Command | Description |
|---|---|
| `npm run deploy` | Docker Compose + Caddy TLS (recommended for production) |
| `npm run deploy docker` | Standalone Docker container, no Caddy |
| `npm run deploy local` | Background Node.js daemon (no Docker required) |
| `npm run deploy:dry` | Build + config validation only, no services started |

---

### 🐳 Local Docker Containers & Docker Web Client

You can run iNoU in real local Docker containers with automatic browser launching and health checks:

#### 1. Docker Web Client (`./idwc.sh` / `./iwc.sh --docker`)
Automatically spins up the Docker container stack (iNoU Hub + Ollama + Caddy), waits for the `/health` endpoint, and launches Google Chrome directly to the running container web interface:

```bash
# Launch Docker containers and open Web Client in browser:
./idwc.sh
# or using iwc.sh with the --docker flag:
./iwc.sh --docker
# or via npm:
npm run docker:web

# Stream container logs:
./idwc.sh logs

# Stop container stack:
./idwc.sh stop
```

#### 2. Local Docker Container Manager (`./docker-run.sh`)
Manage the container lifecycle with self-healing Windows 11 context detection:

```bash
# Start full container stack (Hub + Ollama + Caddy)
./docker-run.sh
# or: npm run docker:run

# Launch standalone iNoU container without compose
./docker-run.sh standalone
# or: npm run docker:standalone

# Check container status
./docker-run.sh status

# Stop containers
./docker-run.sh down
```

> See [`docs/deployGaps.md`](docs/deployGaps.md) for a full deployment readiness checklist.

---

## 📖 Technical Documentation

| Document | Description |
|---|---|
| [`docs/tech-specs/ThePromptFlow.md`](docs/tech-specs/ThePromptFlow.md) | Full layer-by-layer architecture of the prompt lifecycle — Web UI → API → Shell → AI → SSE — with 40 catalogued failure points and mitigations. |
| [`docs/deployGaps.md`](docs/deployGaps.md) | Deployment readiness checklist and known gaps. |

---

## 📜 License

MIT License — Copyright (c) iNoU Development Team.
