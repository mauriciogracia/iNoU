# Technical Specification 0011: iNoU Plugin Architecture & Marketplace (`PluginInterface`)

## 1. Executive Summary & Vision

To enable an infinitely extensible ecosystem without bloating the core engine, **iNoU** introduces a standardized **Plugin Interface (`PluginInterface`)** and an in-platform **Plugin Marketplace**. 

Developers and community creators can build, publish, and monetize modular plugins (e.g., Trello, Jira, LinkedIn, Slack, GitHub, Linear, Discord, Brevo) that plug directly into iNoU's **AST Goal Decomposition Engine** and **Natural Language Command Router**.

```
+─────────────────────────────────────────────────────────────────────────────+
|                                iNoU Host Engine                             |
|                                                                             |
|  +───────────────────────────────────────────────────────────────────────+  |
|  | Plugin Host Runtime (`PluginRegistry` & `PluginSandbox`)              |  |
|  +───────────────────────────────────────────────────────────────────────+  |
|                                     │                                       |
|          ┌──────────────────────────┼──────────────────────────┐            |
|          ▼                          ▼                          ▼            |
|   [ Project Mgmt ]          [ Social & Sourcing ]      [ Dev & Comms ]      |
|   • Trello Plugin           • LinkedIn Plugin          • GitHub Plugin      |
|   • Jira Cloud Plugin       • X / Twitter Plugin       • Slack / Discord    |
|   • Linear Plugin           • Telegram Plugin          • Brevo Email        |
+──────────┬──────────────────────────┬──────────────────────────┬────────────+
           │                          │                          │
           ▼                          ▼                          ▼
+─────────────────────────────────────────────────────────────────────────────+
|                         iNoU Plugin Marketplace                             |
|               (Discovery · 1-Click Install · Verified Badges)               |
+─────────────────────────────────────────────────────────────────────────────+
```

---

## 2. Standard Plugin Interface (`PluginInterface`)

All plugins implement a canonical contract defined in TypeScript:

### 2.1 The Plugin Manifest (`plugin.json`)
```json
{
  "id": "inou-plugin-trello",
  "name": "Trello Integration",
  "version": "1.0.0",
  "description": "Fetch boards, list of lists, and tickets with bi-directional AST sync.",
  "author": "iNoU Core Team",
  "icon": "https://inou.dev/icons/trello.svg",
  "category": "ProjectManagement",
  "permissions": ["network:trello.com", "storage:credentials"],
  "entrypoint": "dist/index.js",
  "commands": ["trello", "board", "cards"],
  "verbs": ["Manage", "Track", "ExportBoard"]
}
```

### 2.2 TypeScript Contract (`src/interfaces/IInouPlugin.ts`)
```typescript
export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  category: "ProjectManagement" | "Social" | "DevTools" | "Communication" | "AI";
  icon?: string;
  author: string;
}

export interface PluginContext {
  rootDir: string;
  userConfig: Record<string, string>;
  activeChatId?: string;
  writeOutput: (text: string) => void;
}

export interface IInouPlugin {
  metadata: PluginMetadata;
  
  // Lifecycle hooks
  onInstall?(context: PluginContext): Promise<void>;
  onInit(context: PluginContext): Promise<void>;
  onDestroy?(): Promise<void>;

  // Command & Intent execution
  canHandle(commandOrVerb: string): boolean;
  execute(commandLine: string, context: PluginContext): Promise<PluginExecutionResult>;

  // LLM Tool Definitions (for Function Calling / Multiagent routing)
  getTools?(): PluginToolDefinition[];
}
```

### 2.3 Conversational Natural Language Plugin Setup (Powered by Ollama)

End users never need to write manual terminal commands. A user can simply type in natural language:

> *"I need to enable LinkedIn integration, configure that"* or *"Activar integración con Trello"*

Under the hood, the **local SLM (Ollama)** translates this intent and orchestrates the setup:

```
[User Input] ──► "I need to enable linkedin integration, configure that"
      │
      ▼
[ Ollama Intent Router ]
  ├── 1. Identifies Intent: NEED = EnablePlugin(target="linkedin")
  ├── 2. Resolves Plugin: Matches "linkedin" -> "inou-plugin-linkedin"
  ├── 3. Executes Underneath: `plugin install inou-plugin-linkedin`
  └── 4. Detects Missing Credentials: Scans manifest for required credential keys
      │
      ▼
[ Interactive Credential Intake Interview (1 by 1) ]
  [iNoU] 🔌 ¡Plugin de LinkedIn instalado correctamente!
         Para conectarlo, necesito 2 datos:
         Paso 1/2: Ingresa tu LinkedIn Client ID:
  
  [User] iNoU > 77xyz1234abcd
  
  [iNoU] ✔ Client ID guardado de forma segura en la bóveda local.
         Paso 2/2: Ingresa tu LinkedIn Client Secret:
  
  [User] iNoU > secret_key_987654321
  
  [iNoU] ✨ ¡Integración con LinkedIn completada y activa!
         Ya puedes ejecutar: "publish linkedin --job <id>" o publicar ofertas.
```

---

## 3. In-Platform Plugin Marketplace

### 3.1 Visual Marketplace Hub (`🔌 Plugins Tab`)
Inside the iNoU Web & Mobile UI:
- **Discover Feed**: Trending, Verified, and New plugins.
- **Categories**:
  1. **📋 Project Management**: Trello, Jira Cloud, Linear, Asana, Notion.
  2. **💼 Social & Sourcing**: LinkedIn, X/Twitter, Telegram, Discord.
  3. **🛠 Developer Tools**: GitHub, GitLab, Docker, Kubernetes.
  4. **📢 Notifications & Comms**: Brevo, SendGrid, Twilio, Slack.
  5. **🧠 Specialized AI Engines**: Custom Ollama models, HuggingFace adapters.

### 3.2 1-Click Management & CLI Parity
- `plugin list` (Lists installed plugins and their status).
- `plugin search <keyword>` (Searches the cloud marketplace).
- `plugin install <pluginId>` (Downloads, verifies sandbox, and activates).
- `plugin enable <pluginId>` / `plugin disable <pluginId>`.
- `plugin config <pluginId> set <key> <value>`.

---

## 4. Security & Sandboxing

1. **Permission Manifest**: Plugins must declare network targets and storage scopes.
2. **Safe Credential Injection**: API keys are securely stored in the iNoU vault and injected at runtime—never written in plain text plugin bundles.
3. **Execution Isolation**: Node VM / Worker thread isolation prevents rogue plugins from modifying core runtime state.
