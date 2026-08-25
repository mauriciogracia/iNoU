---
name: google-workspace-skill
description: Out-of-the-box integration skill for Google OAuth 2.0 authentication, Google Drive state snapshot synchronization, and Gemini Long-Context caching.
---

# Google Workspace Integration Skill (`google-workspace-skill`)

## 1. Overview & Capability

This skill equips iNoU agents and CLI runtimes with native out-of-the-box connectivity to Google Cloud & Workspace services:
1. **Google Auth**: OAuth 2.0 PKCE user authorization & GCP Service Account JWT credentials.
2. **Google Drive Sync**: Autonomous bi-directional snapshot serialization for cross-device planning ([`scenario_03.md`](file:///d:/repos/iNoU/docs/tech-specs/scenario_03.md)).
3. **Gemini Context Caching**: Automatic long-context caching for instant session resumption without token overhead.

---

## 2. Out-of-the-Box Configuration

### 2.1 Register Google Integration
```bash
# 1. Register global Google Drive storage integration
./inou.sh preference add --key integration --category cloud_storage --provider google-drive --name "PersonalGoogleDrive"

# 2. Store OAuth Client Secret / Service Account Key in local private vault
./inou.sh key "YOUR_GOOGLE_SERVICE_ACCOUNT_JSON_OR_API_KEY"
```

### 2.2 Autonomous Drive Sync
```bash
# Reconciles local project and task DAG with Google Drive automatically
./inou.sh sync --channel google-drive
```

---

## 3. Data Mapping & Zero-Exposure Governance

| iNoU Entity | Google Drive Storage Target | Security Rule |
| :--- | :--- | :--- |
| **`project`** | `INUO_Backups/<project_id>/manifest.json` | Public metadata & jurisdiction |
| **`task` (DAG)** | `INUO_Backups/<project_id>/task_dag.json` | Node dependencies & prerequisite graph |
| **`memory`** | `INUO_Backups/<project_id>/skills_memory.json` | Distilled skills & principles |
| **`vault` (Secrets)**| **EXCLUDED** (Never Uploaded) | API keys remain strictly on local device |
