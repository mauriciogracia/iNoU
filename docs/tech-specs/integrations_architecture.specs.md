# External Integrations, APIs, Social Platforms & LLM Providers Specification

| Property | Value |
| :--- | :--- |
| **Status** | `CANONICAL` |
| **Domain** | External APIs, Social Networks, Cloud Storage, LLM Providers, Decoupled Vault Security |
| **Architecture Reference** | [`main-specs-goals.md`](file:///d:/repos/iNoU/docs/tech-specs/main-specs-goals.md), [`storage_and_sync_architecture.specs.md`](file:///d:/repos/iNoU/docs/tech-specs/storage_and_sync_architecture.specs.md) |

---

## 1. System Architecture: Decoupled Vault & Adapter Model

iNoU enforces strict decoupling between **public connection metadata** (endpoints, rate limits, scopes, model names) and **private credentials** (API keys, OAuth tokens, GCP service accounts) to ensure 100% zero-exposure security during cloud sync:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              iNoU CORE RUNTIME & ADAPTER LAYER                         │
├───────────────────────────────────┬────────────────────────────────────────────────────┤
│   PUBLIC METADATA (SQLite .inuo.db)│      PRIVATE SECRETS (Local Biometric Vault)       │
│                                   │                                                    │
│  Table: `integrations`            │  File: `.inuo-key.json` / OS Secure Enclave        │
│  • id: "conn_gemini_01"           │  • "vault_gemini_key": "AIzaSy..."                │
│  • category: 'llm'                │  • "vault_x_oauth_token": "oauth2_bearer_..."      │
│  • provider: 'google-gemini'      │  • "vault_drive_token": "refresh_token_..."        │
│  • scope: 'project' (ProjRoad)    │                                                    │
│  • vault_secret_key_ref: "..."    │  * ZERO-EXPOSURE POLICY:                           │
│  • rate_limit_per_minute: 120     │    Never synced to cloud storage or git diffs      │
└───────────────────────────────────┴────────────────────────────────────────────────────┘
                                    │
                        [Provider-Agnostic Adapters]
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
┌───────────────┐           ┌───────────────┐           ┌───────────────┐
│ LLM Adapters  │           │ Social Media  │           │ Cloud Storage │
│ Gemini/Claude │           │ X / TikTok /  │           │ Google Drive  │
│ OpenAI / Groq │           │ IG / Telegram │           │ S3 / R2 Sync  │
└───────────────┘           └───────────────┘           └───────────────┘
```

---

## 2. Integration Connection Schema & Database Model

### 2.1 SQLite Schema (`integrations` Table)

```sql
CREATE TABLE IF NOT EXISTS integrations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,                -- 'llm', 'social', 'cloud_storage', 'mcp', 'webhook'
    provider TEXT NOT NULL,                -- 'google-gemini', 'anthropic-claude', 'google-drive', 'twitter-x'
    auth_type TEXT NOT NULL DEFAULT 'apiKey', -- 'apiKey', 'oauth2', 'serviceAccount', 'bearerToken', 'none'
    endpoint TEXT,
    status TEXT NOT NULL DEFAULT 'Connected', -- 'Connected', 'Disconnected', 'RateLimited', 'Error'
    scope TEXT NOT NULL DEFAULT 'global',  -- 'global', 'project', 'workspace', 'task'
    scope_id TEXT,                         -- Scoped container ID if applicable
    vault_secret_key_ref TEXT,             -- Key pointer into local encrypted vault
    rate_limit_per_minute INTEGER DEFAULT 60,
    metadata_json TEXT,                    -- Provider-specific parameters (models, temperature, headers)
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

---

## 3. Provider-Agnostic Adapter Pattern

### 3.1 LLM Provider Adapter (`LLMProviderAdapter`)
* **Unified Interface**: Standardized prompt formatting, token streaming, and usage tracking across models:
  - **Tier 0**: Local / Offline Cache (`mock` / `ollama`).
  - **Tier 1 (Default)**: Google Gemini 2.5 Flash / 3.0 Flash.
  - **Tier 2 (Heavy Reasoning)**: Google Gemini 2.5 Pro / Anthropic Claude 3.5 Sonnet.
  - **Tier 3 (High Speed)**: Groq Llama 3.3.
* **Automatic Waterfall Fallback**: If Tier 1 hits a rate limit ($429$) or network timeout, the adapter cascades to Tier 2 in $<50\text{ms}$.

### 3.2 Social Network Adapter (`SocialNetworkAdapter`)
* **Supported Platforms**: X/Twitter, LinkedIn, Facebook, Instagram, TikTok, Telegram.
* **Orchestration**: Direct broadcast via semantic command:
  ```bash
  ./inou.sh preference add --key social --broadcast "Launching new initiative!"
  ```

### 3.3 Cloud Storage & Sync Adapter (`StorageAdapter`)
* **Supported Platforms**: Google Drive (OAuth 2.0 / Service Account), AWS S3, Cloudflare R2.
* **Operations**: Autonomous bi-directional delta synchronization (`./inou.sh sync`).

---

## 4. Semantic Command Configuration Syntax

```bash
# 1. Register a project-scoped Gemini LLM connection
./inou.sh preference add --key integration --category llm --provider google-gemini --name "ProjectGemini" --project "EmergencyRoad"

# 2. Register a global Google Drive storage integration
./inou.sh preference add --key integration --category cloud_storage --provider google-drive --name "GlobalDriveBackup"

# 3. Store private API key in local vault (isolated from cloud sync)
./inou.sh key "AIzaSyYourSecretGeminiKey"

# 4. List all registered integrations
./inou.sh preference list
```
