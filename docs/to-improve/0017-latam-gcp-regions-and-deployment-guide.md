# LATAM Google Cloud Infrastructure & Deployment Guide (`0017-latam-gcp-regions-and-deployment-guide.md`)

This document defines the regional hosting topology, latency optimizations, and deployment governance for the **iNoU Platform** targeting Latin American users across Web, Mobile PWA, and Cloud API services.

---

## 1. Regional LATAM Infrastructure Topology

Google Cloud provides dedicated datacenters across the Americas. The optimal region depends on the target user demographic:

| Region Code | Physical Location | Primary Coverage | Network Latency | Cost Tier |
|---|---|---|---|---|
| **`southamerica-east1`** | **São Paulo, Brazil** | Brazil, Argentina, Chile, Uruguay, Paraguay | ~20–40 ms | Regional LATAM |
| **`southamerica-west1`** | **Santiago, Chile** | Chile, Peru, Bolivia, Colombia, Western Argentina | ~25–50 ms | Regional LATAM |
| **`us-central1`** | **Iowa, USA** | Mexico, Central America, Caribbean, Northern Colombia | ~45–65 ms | Standard Low-Cost |
| **`us-east4`** | **Virginia, USA** | Caribbean, Venezuela, Colombia, Global Transatlantic | ~50–70 ms | Standard Low-Cost |

### Recommended Default Routing:
- **South America Core**: Default to **`southamerica-east1`** (São Paulo) or **`southamerica-west1`** (Santiago).
- **Mexico & Central America**: Default to **`us-central1`** (Iowa).

---

## 2. Component Architecture & Deployment Matrix

Deployments are executed via the canonical launcher **`deploy-inou.sh`** with strict branch and component governance.

### 2.1 Branch-to-Environment Policy
- **`main` Branch** ➔ Deploys strictly to **Production (`prod`)** (`inou-prod`).
- **`development` / `dev` Branch** ➔ Deploys strictly to **QA / Staging (`qa`)** (`inou-qa`).
- **Other Branches** (e.g. `feature/*`) ➔ **Blocked from deployment**.

### 2.2 Canonical Components
1. **`web`**:
   - Google Cloud Run container hosting the Web UI, Mobile Terminal (`/m`), PWA Assets (`manifest.json`, `sw.js`), and Node.js REST / SSE API Gateway.
2. **`cloud`**:
   - Backend cloud infrastructure including Firestore security rules, database composite indexes, Cloud Functions, and Eventarc triggers.
3. **`full`** *(Default)*:
   - Synchronized full-stack deployment executing both `cloud` and `web`.

---

## 3. Quickstart Deployment Guide

### 3.1 Prerequisites
1. Install Google Cloud SDK (`gcloud`).
2. Authenticate user credentials:
   ```bash
   gcloud auth login
   ```
3. Set your active project ID:
   ```bash
   gcloud config set project [YOUR_GCP_PROJECT_ID]
   ```

### 3.2 Executing Deployments
```bash
# 1. Interactive Execution (prompts for component & region)
./deploy-inou.sh

# 2. Deploy Full Stack to São Paulo (LATAM South)
GCP_REGION=southamerica-east1 ./deploy-inou.sh -c full

# 3. Deploy Web & Mobile Container to Santiago (LATAM West)
GCP_REGION=southamerica-west1 ./deploy-inou.sh -c web

# 4. Deploy Cloud Rules & Indexes Only
./deploy-inou.sh -c cloud
```

---

## 4. Cost Governance & Serverless Scaling Limits

To prevent unexpected billing spikes while maintaining sub-100ms response times for LATAM users:
- **Min Instances**: `0` (Scales to zero when idle for $0 base cost).
- **Max Instances**: `10` (Cloud Run concurrency limit).
- **Memory**: `512Mi` (Lightweight Node 22 Alpine footprint).
- **CPU**: `1 vCPU`.
- **TLS / HTTPS**: Managed automatically by Google Cloud Run.
