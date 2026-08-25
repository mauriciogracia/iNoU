# Deployment Architecture & Hybrid Colmena Mesh Specification (`tech-specs/deployment_and_colmena_mesh.specs.md`)

| Property | Value |
| :--- | :--- |
| **Status** | `CANONICAL DEPLOYMENT SPECIFICATION` |
| **Domain** | Containerization, Docker/Compose, Cloud Relay Hub, Edge Nodes, TLS Ingress, Colmena Mesh |
| **Architecture Reference** | [`clients_api_event_bus.specs.md`](file:///d:/repos/iNoU/docs/tech-specs/clients_api_event_bus.specs.md), [`storage_and_sync_architecture.specs.md`](file:///d:/repos/iNoU/docs/tech-specs/storage_and_sync_architecture.specs.md) |

---

## 1. System Overview & Deployment Topology

The **Hybrid Colmena Mesh** pairs local-first offline execution on edge client devices with a centralized, 24/7 **Cloud Relay Hub**.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              CENTRAL CLOUD RELAY HUB                                  │
│  • Container: Alpine Linux + Node.js 22 (Non-root `inuo` user)                         │
│  • Storage: Embedded SQLite in WAL mode on Persistent Volume (`/app/data/.inuo.db`)   │
│  • Ingress: Caddy Server (Automatic HTTPS / Let's Encrypt TLS)                         │
│  • Endpoints: REST API (`/api/v1/*`), SSE Stream (`/api/stream`), Health (`/health`)   │
└───────────────────▲────────────────────────────────▲───────────────────▲───────────────┘
                    │                                │                   │
       (TLS / SSE + Delta Sync)         (TLS / SSE + Delta Sync)         │
                    │                                │                   │
┌───────────────────┴──────────────┐ ┌───────────────┴─────────────┐ ┌───┴──────────────┐
│       WORKSTATION CLIENT         │ │       WEB PWA DASHBOARD     │ │   COLMENA PEER   │
│ • Local CLI (`./bin/inuo.js`)    │ │ • Browser UI / Vanilla CSS  │ │ • External AI    │
│ • Local `.inuo.db` + RAM cache   │ │ • Live SSE event updates    │ │   Agent Worker   │
│ • Local Vault (`.inuo-key.json`) │ │ • Biometric Passkey / OAuth │ │ • Remote Task DAG│
└──────────────────────────────────┘ └─────────────────────────────┘ └──────────────────┘
```

---

## 2. Containerization Contracts

### 2.1 Multi-Stage Production `Dockerfile`

```dockerfile
# Stage 1: Build & Compilation
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig*.json ./
RUN npm ci
COPY src/ ./src/
COPY bin/ ./bin/
RUN npm run build

# Stage 2: Minimal Production Runtime
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8765
ENV HOST=0.0.0.0

# Install runtime security packages & create non-root user
RUN addgroup -S inuogroup && adduser -S inuo -G inuogroup
RUN mkdir -p /app/data && chown -R inuo:inuogroup /app

# Copy production artifacts
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/bin ./bin

USER inuo
EXPOSE 8765
VOLUME ["/app/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:8765/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", "dist/cli/main.js", "serve", "8765"]
```

---

### 2.2 Production `docker-compose.yml` with Automatic TLS (Caddy)

```yaml
version: '3.8'

services:
  inuo-hub:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: inuo_cloud_hub
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - PORT=8765
      - HOST=0.0.0.0
    volumes:
      - inuo_hub_data:/app/data
    networks:
      - inuo_internal

  caddy-ingress:
    image: caddy:2-alpine
    container_name: inuo_caddy_ingress
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    environment:
      - DOMAIN=${INUO_DOMAIN:-inuo.local}
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - inuo_internal
    depends_on:
      - inuo-hub

volumes:
  inuo_hub_data:
    driver: local
  caddy_data:
  caddy_config:

networks:
  inuo_internal:
    driver: bridge
```

---

### 2.3 `Caddyfile` Reverse Proxy Configuration

```caddyfile
{$DOMAIN:localhost} {
    encode gzip zstd

    # Route all API Gateway and Event Stream requests
    reverse_proxy inuo-hub:8765 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}

        # Enable SSE event stream buffering bypass
        transport http {
            read_buffer 0
        }
    }
}
```

---

## 3. Host Provider Deployment Matrix

| Hosting Provider | Deployment Model | Storage Configuration | Estimated Cost | Setup Command |
| :--- | :--- | :--- | :---: | :--- |
| **Fly.io** | Single Fly machine with persistent volume | 1GB Fly Volume mounted at `/app/data` | **$0/mo (Free Tier)** | `fly launch` + `fly deploy` |
| **Google Cloud Run** | Serverless Container | Cloud Storage / Litestream or Google Drive | **Free Tier ($0/mo)** | `gcloud run deploy inuo-hub` |
| **Hetzner / DigitalOcean VPS** | Docker Compose + Caddy | Local persistent directory / NVMe volume | **$3.50/mo** | `docker compose up -d` |
| **Home Server / Raspberry Pi** | Docker Compose on local LAN | MicroSD / USB SSD volume | **$0 / Local** | `docker compose up -d` |

---

## 4. Edge Client Connection & Auto-Sync Protocol

### 4.1 Client Configuration
Edge devices (CLI, Web, Mobile) register their remote Cloud Relay endpoint in scoped preferences:
```bash
./inou.sh preference set "cloud_relay_url" "https://inuo.yourdomain.com" --scope "global"
```

### 4.2 Bi-Directional Delta Reconciliation Workflow
1. **Online State**:
   - Edge client connects to `GET https://inuo.yourdomain.com/api/stream`.
   - Real-time events push to the local event bus and update UI components in $<50\text{ms}$.
2. **Offline Mutation**:
   - Mutations execute against local L1 RAM and L2 SQLite (`.inuo.db`).
   - Mutation descriptors are queued into `cloud_sync_journal` (`sync_status = 'PENDING'`).
3. **Reconnection Drain**:
   - Upon network restoration, `drainSyncJournalQueue` pushes queued payloads to `POST /api/v1/sync`.
   - The Cloud Hub applies the **Deterministic Git-Like 3-Way Merge Engine**:
     - Fast-Forward (Tier 1) if uncontested.
     - Field-Level Auto-Merge (Tier 2) for disjoint edits.
     - Collision Prompts (Tier 3) if concurrent changes collide on the same field.

---

## 5. Security & Governance Invariants

1. **Decoupled Vault Isolation**:
   - The Cloud Hub never stores plaintext user API keys. Private keys reside solely in edge `.inuo-key.json` vaults.
2. **Sub-2ms Anti-Manipulation Defense**:
   - All HTTP POST bodies passing through `/api/v1/*` are pre-screened by `ManipulationDefenseMiddleware`.
   - Malicious prompt injections are immediately rejected with HTTP `403 Forbidden`.
3. **Graceful Zero-Downtime WAL Compaction**:
   - SQLite on the Cloud Hub maintains WAL mode (`PRAGMA journal_mode = WAL;`) allowing concurrent non-blocking reads during background writes.
