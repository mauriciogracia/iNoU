# iNoU Deployment Readiness — Gap Analysis

> **Last Updated:** 2026-08-16  
> **Scope:** Docker / Docker Compose / GitHub Actions / Caddy / Runtime configuration

This document captures all identified gaps that must be resolved before iNoU can be reliably deployed to a production server. Gaps are organized in **phases** from critical blockers to polish items.

---

## Phase 1 — Critical Blockers 🔴

These gaps will cause a deployment to fail outright or silently produce an insecure/broken runtime.

---

### 1.1 CI/CD Pipeline Never Pushes the Docker Image

**File:** [`.github/workflows/ci-cd.yml`](../.github/workflows/ci-cd.yml) — lines 63–69

**Problem:**  
The `deploy-cloud-relay` job builds the Docker image using `docker/build-push-action` but has `push: false`. The image is built inside the GitHub Actions runner and immediately discarded — nothing is ever published to a container registry (DockerHub, GHCR, etc.). Consequently, there is no image for the production server to pull.

**Fix:** Add Docker login and set `push: true`:

```yaml
- name: Log in to GHCR
  uses: docker/login-action@v3
  with:
    registry: ghcr.io
    username: ${{ github.actor }}
    password: ${{ secrets.GITHUB_TOKEN }}

- name: Build & Push Container Image
  uses: docker/build-push-action@v5
  with:
    context: .
    file: ./Dockerfile
    push: true
    tags: |
      ghcr.io/${{ github.repository_owner }}/inuo-cloud-hub:latest
      ghcr.io/${{ github.repository_owner }}/inuo-cloud-hub:${{ github.sha }}
```

---

### 1.2 CI/CD Has No Actual Deploy Step

**File:** [`.github/workflows/ci-cd.yml`](../.github/workflows/ci-cd.yml)

**Problem:**  
The `deploy-cloud-relay` job ends after building/pushing the image. There is no step that connects to the production server and runs `docker compose pull && docker compose up -d`. The pipeline provides zero automation for the actual rollout.

**Fix:** Add an SSH deploy step using `appleboy/ssh-action`:

```yaml
- name: Deploy to Production Server via SSH
  uses: appleboy/ssh-action@v1
  with:
    host: ${{ secrets.DEPLOY_HOST }}
    username: ${{ secrets.DEPLOY_USER }}
    key: ${{ secrets.DEPLOY_SSH_KEY }}
    script: |
      cd /opt/inuo
      docker compose pull
      docker compose up -d --remove-orphans
      docker image prune -f
```

**Required GitHub Secrets:**

| Secret Name | Description |
|---|---|
| `DEPLOY_HOST` | IP or hostname of the production server |
| `DEPLOY_USER` | SSH user on the server (e.g., `deploy`) |
| `DEPLOY_SSH_KEY` | Private SSH key (server must have the public key in `authorized_keys`) |

---

### 1.3 API Keys Not Wired as GitHub Actions Secrets

**Files:** [`.env.example`](../.env.example), [`.github/workflows/ci-cd.yml`](../.github/workflows/ci-cd.yml), [`docker-compose.yml`](../docker-compose.yml)

**Problem:**  
`GEMINI_API_KEY` and `GOOGLE_API_KEY` are documented in `.env.example` and referenced in `docker-compose.yml`, but they are never injected into the CI/CD pipeline via GitHub Actions secrets. If the deploy step runs `docker compose up` on the server without a populated `.env` file, the container starts with empty API keys and LLM features silently fail.

**Fix:** Write `.env` on the server before starting containers:

```yaml
script: |
  cd /opt/inuo
  printf 'GEMINI_API_KEY=%s\nINUO_DOMAIN=%s\nNODE_ENV=production\n' \
    "${{ secrets.GEMINI_API_KEY }}" \
    "${{ secrets.INUO_DOMAIN }}" > .env
  docker compose pull
  docker compose up -d --remove-orphans
```

**Required GitHub Secrets:**

| Secret Name | Description |
|---|---|
| `GEMINI_API_KEY` | Google AI Studio / Gemini API key |
| `INUO_DOMAIN` | Public domain (e.g., `inuo.yourdomain.com`) for Caddy TLS |

---

### 1.4 Real API Key Stored in `.env`

**File:** [`.env`](../.env) — line 3

**Problem:**  
The `.env` file currently contains an actual `GEMINI_API_KEY` value. While `.env` is correctly listed in `.gitignore`, accidental staging (e.g., `git add -f .env` or a misconfigured tool) would expose a live credential in the repository history.

**Fix:**
- **Rotate the key immediately** at [Google AI Studio](https://aistudio.google.com/app/apikey).
- Keep `.env` only as a local developer convenience file — never store real production keys there.
- Production keys must only live in GitHub Actions secrets and be injected at deploy time (see 1.3).

---

## Phase 2 — Incomplete Configuration 🟡

These gaps won't crash the container immediately but result in incorrect runtime behavior or missing features.

---

### 2.1 Missing Environment Variables in `docker-compose.yml`

**File:** [`docker-compose.yml`](../docker-compose.yml) — `inuo-hub` service `environment` block

**Problem:**  
Several variables documented in `.env.example` are not forwarded to the `inuo-hub` container:

| Missing Variable | Impact |
|---|---|
| `GEMINI_MODEL` | Container uses the hardcoded default model; runtime model selection is impossible |
| `GOOGLE_API_KEY` | Alternative Google credential is silently ignored |
| `DEBUG_LEVEL` | Logging verbosity cannot be controlled from outside the image |

**Fix — update the `inuo-hub` environment block:**

```yaml
environment:
  - NODE_ENV=production
  - PORT=8765
  - HOST=0.0.0.0
  - INUO_DATA_DIR=/app/data
  - GEMINI_API_KEY=${GEMINI_API_KEY:-}
  - GOOGLE_API_KEY=${GOOGLE_API_KEY:-}
  - GEMINI_MODEL=${GEMINI_MODEL:-gemini-flash-latest}
  - DEBUG_LEVEL=${DEBUG_LEVEL:-1}
```

---

### 2.2 Dockerfile Omits `tech-specs/` and `docs/` Directories

**File:** [`Dockerfile`](../Dockerfile) — Stage 2, lines 23–29

**Problem:**  
[`context.ts`](../src/cli/context.ts) resolves the spec path by checking (in order):
1. `tech-specs/main-specs-goals.md`
2. `docs/main-specs-goals.md`
3. `main-specs-goals.md`
4. `INUO_SPEC.md` (fallback)

None of `tech-specs/`, `docs/`, or `INUO_SPEC.md` are copied into the production image. The spec path silently falls back to a missing file. Any command or API route that reads the spec will error or return empty data.

**Fix — add to Stage 2 of the Dockerfile (after `COPY inuo-manifest.json ./`):**

```dockerfile
# Copy spec and documentation sources (required by context.ts spec path resolution)
COPY docs/ ./docs/
```

---

### 2.3 `INUO_DOMAIN` → `DOMAIN` Mapping Is Undocumented

**Files:** [`docker-compose.yml`](../docker-compose.yml#L29), [`Caddyfile`](../Caddyfile#L1)

**Problem:**  
`docker-compose.yml` maps `INUO_DOMAIN` (from the host `.env`) → `DOMAIN` (inside the Caddy container). The Caddyfile reads `{$DOMAIN:localhost}`. This chain works, but a deployer who sets `DOMAIN` directly in their shell instead of `INUO_DOMAIN` in `.env` will break Caddy silently.

**Fix — clarify the comment in `.env.example`:**

```dotenv
# Public domain for Caddy automatic HTTPS.
# This maps to the $DOMAIN variable inside the Caddy container.
# Example: inuo.yourdomain.com  (defaults to localhost for local testing)
INUO_DOMAIN=localhost
```

---

## Phase 3 — Operational Polish 🟢

Not blocking, but important for a maintainable and observable production deployment.

---

### 3.1 No Deployment Guide in README

**File:** [`README.md`](../README.md)

**Problem:**  
There is no step-by-step guide for a first-time deployer. The `npm run deploy` script and `docker compose up` path both exist but are undocumented from an operations perspective.

**Suggested README section:**

```markdown
## Deployment

### Prerequisites
- Docker & Docker Compose v2+
- A public domain with DNS pointing to your server
- A Google Gemini API key

### Steps
1. Clone the repo on your server: `git clone <repo> /opt/inuo && cd /opt/inuo`
2. Copy the example env: `cp .env.example .env`
3. Fill in `GEMINI_API_KEY` and `INUO_DOMAIN` in `.env`
4. Run: `npm run deploy` (or `docker compose up -d --build`)
5. Verify: `curl https://your-domain/health`
```

---

### 3.2 Health Check in `deploy.js` Doesn't Handle HTTP Redirects

**File:** [`scripts/deploy.js`](../scripts/deploy.js#L32-L71)

**Problem:**  
The `compose` target polls `http://<host>:80/health`. Caddy's default behavior is to redirect `http://` → `https://` (301). Node's `http.get` does not follow redirects, so the health check receives a 301, fails to see a 200, and exits as failed — even when the container is healthy.

**Fix — treat 2xx and 3xx as alive during the TLS provisioning window:**

```js
// In the checkHealth promise resolution:
if (res.statusCode >= 200 && res.statusCode < 400) {
  resolve(true);
} else {
  resolve(false);
}
```

Alternatively, poll the internal container port directly (`http://127.0.0.1:8765/health`) as the primary check — bypassing Caddy entirely — which is already partially done in the URL list.

---

### 3.3 No Docker Log Rotation Configured

**File:** [`docker-compose.yml`](../docker-compose.yml)

**Problem:**  
Container logs write to stdout with no rotation limits. On a long-running server, `docker logs` output accumulates indefinitely and can consume significant disk space.

**Fix — add `logging` config to both services:**

```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "5"
```

---

### 3.4 Deprecated `version:` Field in `docker-compose.yml`

**File:** [`docker-compose.yml`](../docker-compose.yml#L1)

**Problem:**  
`version: '3.8'` is ignored by modern Docker Compose v2 (Compose Specification). It is harmless but produces a deprecation warning and signals that an older reference was used.

**Fix:** Remove the `version:` line entirely.

---

## Summary Checklist

| # | Phase | Gap | Status |
|---|---|---|---|
| 1.1 | 🔴 Critical | CI/CD does not push Docker image to any registry | ✅ Fixed — `ci-cd.yml` now logs in to GHCR and pushes with SHA + latest tags |
| 1.2 | 🔴 Critical | CI/CD has no SSH deploy step to production server | ✅ Fixed — `ci-cd.yml` SSH step pulls image and runs `docker compose up -d` |
| 1.3 | 🔴 Critical | API keys not wired as GitHub Actions secrets | ✅ Fixed — SSH step writes `.env` from `secrets.GEMINI_API_KEY` + `secrets.INUO_DOMAIN` |
| 1.4 | 🔴 Critical | Real API key stored in `.env` (rotation not required — never pushed) | ✅ Fixed — `.env` key replaced with placeholder; key was blocked by GitHub secret scanning before reaching remote, so no rotation needed |
| 2.1 | 🟡 Important | `GEMINI_MODEL`, `GOOGLE_API_KEY`, `DEBUG_LEVEL` missing from `docker-compose.yml` | ✅ Fixed — all three vars added with safe defaults |
| 2.2 | 🟡 Important | `tech-specs/` and `docs/` not copied in Dockerfile | ✅ Fixed — `COPY tech-specs/` and `COPY docs/` added to Stage 2 |
| 2.3 | 🟡 Important | `INUO_DOMAIN` → `DOMAIN` mapping undocumented in `.env.example` | ✅ Fixed — mapping explained in comment |
| 3.1 | 🟢 Polish | No step-by-step deployment guide in README | ✅ Fixed — `## 🚀 Deployment` section added to `README.md` |
| 3.2 | 🟢 Polish | Health check in `deploy.js` fails on HTTP 301 redirects | ✅ Fixed — `deploy.js` now accepts 2xx and 3xx as healthy |
| 3.3 | 🟢 Polish | No Docker log rotation configured | ✅ Fixed — `logging` block (10 MB × 5 files) added to both services |
| 3.4 | 🟢 Polish | Deprecated `version:` field in `docker-compose.yml` | ✅ Fixed — `version: '3.8'` line removed |
| T1 | 🔴 Critical | `browser/` directory not copied in Dockerfile builder stage — `tsconfig.browser.json` build fails | ✅ Fixed — `COPY browser/ ./browser/` added to Stage 1 (found during deploy test) |
| T2 | ℹ️ Local only | Caddy cannot bind port 80 on Windows without admin privileges | ✅ Not a prod issue — Linux servers bind port 80 freely; run Docker Desktop as Admin for local Caddy testing |
