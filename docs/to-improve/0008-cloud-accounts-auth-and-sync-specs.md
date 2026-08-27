# Technical Specification 0008: iNoU Cloud Accounts, Google Auth, Gamification & Multi-Tenant Sync

## 1. Executive Summary & Core Principles

This specification defines the identity, cloud persistence, gamification, and notification architecture for the **iNoU Platform**. It establishes a zero-friction onboarding experience using **Google / Gmail Authentication (Firebase + GCP)**, enabling zero-touch ("automagical") **Google Gemini access** without requiring end users to manage API keys, while preserving a strict local-first privacy boundary for free-tier chats.

---

## 2. Architecture & Infrastructure (GCP + Firebase)

```
+-------------------------------------------------------------------------------+
|                                iNoU Client                                    |
|                   (Mobile Minimalist CLI / Web Client / TUI)                  |
|                                                                               |
|  +--------------------------------+  +-------------------------------------+  |
|  | Local SQLite (.inuo.db)        |  | Auth Client (Firebase / Google Auth)|  |
|  | • Local Chats (Free Tier)      |  | • 1-Click Sign-In with Gmail        |  |
|  | • Local Context & Facts        |  | • ID Token / Session Management     |  |
|  +--------------------------------+  +-------------------------------------+  |
+---------------------------------------┬---------------------------------------+
                                        │ HTTPS / WSS
                                        ▼
+-------------------------------------------------------------------------------+
|                       iNoU Cloud Platform (GCP & Firebase)                    |
|                                                                               |
|  +─────────────────────────────────────────────────────────────────────────+  |
|  | Firebase Authentication (Google / Gmail OAuth2)                         |  |
|  +─────────────────────────────────────────────────────────────────────────+  |
|  | Cloud Functions (Event-Driven Triggers)                                 |  |
|  | • onUserCreated: Allocate free Gemini tier & initialize credits balance |  |
|  | • onNeedOrOfferCreated: Execute global matching algorithm               |  |
|  | • onMatchFound: Trigger Brevo Transactional Email API                   |  |
|  +─────────────────────────────────────────────────────────────────────────+  |
|  | Firestore & Cloud Storage                                               |  |
|  | • users (profile, credit_balance, tier: Free | Pro)                     |  |
|  | • needs & offers (global registry, scope: GLOBAL | community_id)        |  |
|  | • matches (pending alerts, acceptance state)                            |  |
|  | • cloud_chats (encrypted chat backups — Pro Tier only)                  |  |
|  +─────────────────────────────────────────────────────────────────────────+  |
|  | Managed Gemini Gateway (GCP Vertex AI / Gemini API IAM)                 |  |
|  | • Zero-touch execution for verified Gmail accounts                      |  |
+-------------------------------------------------------------------------------+
```

---

## 3. Identity, Pseudonymous Handles & Automagical Gemini Configuration

1. **1-Click Google Sign-In**:
   - User signs in with their `@gmail.com` account via Google OAuth / Firebase.
   - User profile (`user_id`, `email`, `displayName`, `avatar`) is registered securely in the private auth vault.
2. **Global Unique Auto-Generated Identity (`InouGlobalIdentity`)**:
   - **Generation Style**: Inspired by Google Play Games gamer tags (combination of memorable words + numbers).
   - **Native Language Mandate**: The words **MUST** be generated in the **native/detected language** of the interacting user:
     - **Spanish (`es`)**: e.g., `HalconVeloz4821`, `LoboCosmico109`, `JaguarFuego77`
     - **English (`en`)**: e.g., `SwiftFalcon4821`, `CosmicWolf109`, `FireJaguar77`
     - **Portuguese (`pt`)**: e.g., `AguiaRapida4821`, `LoboCosmico109`
     - **French (`fr`)**: e.g., `FauconRapide4821`, `LoupCosmique109`
   - **Global Uniqueness**: Verified against the global registry to ensure zero collisions across the entire iNoU network.
   - **Privacy Barrier**: All peer interactions (Needs, Offers, Matches, Game Chats) use strictly this global handle. Real emails and personal data are **never** exposed to other peers.
   - Optional: Users can customize their public handle later subject to global uniqueness validation.
3. **Zero-Touch Gemini Auto-Provisioning**:
   - The user does **not** need to generate, copy, or paste any API keys.
   - The verified account immediately has **Google Gemini (Free Tier)** active and ready through the iNoU Cloud Gateway.
   - Power users can still enter their own custom API keys in settings to override quotas.

---

## 4. Cloud Storage vs. Local Storage Boundaries

| Data Category | Free Tier Policy | Pro / Paid Tier Policy | Storage Location |
|---|---|---|---|
| **Chat Sessions & Messages** | **100% Local Only** | Encrypted Cloud Sync & Multi-Device Backup | Local `.inuo.db` (Free) / Firestore Cloud Vault (Pro) |
| **Needs & Offers** | **Public by Default** (Global matching) | Public / Community / Private Scoped | Firestore Global Registry (`needs`, `offers`) |
| **Platform Credits Balance** | Tracked in Cloud | Tracked in Cloud | Firestore (`user_credits`) |
| **Local Knowledge Graph / Code** | 100% Local Only | 100% Local Only | Local filesystem (`graphify-out/graph.json`) |

---

## 5. Peer Match Alerts Architecture

When a **Need** and an **Offer** match in the global network:
1. **In-App Login Notification (Primary)**: When opening iNoU (Mobile, Web, or Desktop), a real-time notification badge and banner alert the user: `🔔 New Match Found for your Need: [Object]`.
2. **CLI Command Parity (Primary)**: Running `match` queries the cloud registry in real time and lists all active matches.
3. **Brevo Email API (Feature Flagged: `ENABLE_BREVO_NOTIFICATIONS=false`)**: Deferred / disabled by default behind a flag; can be enabled in production to deliver transactional match emails to `@gmail.com`.

---

## 6. Token Quota, Gamification & Smart Engine Advisor

### 6.1 Quota & Fallback Policy
- Free tier accounts receive a monthly allowance of managed Gemini queries.
- **When Quota is Exhausted (Fallback 2)**: The app presents a friendly prompt:
  > *"You have reached your included free Gemini queries for this period. Add your own free personal Gemini key for unlimited use, spend earned platform credits, or upgrade to Pro."*

### 6.2 Gamification Platform Credits & Configuration

- Users earn **iNoU Platform Credits** by publishing valid Needs and Offers, fulfilling peer requests, and participating in the network.
- **Configurable Settings File (`src/config/gamification.json`)**:
  - All reward values, token conversion rates, and welcome grants are centrally declared in `src/config/gamification.json` for easy tuning:
    - `initialGrant`: `25 credits` on account creation.
    - `fulfillNeed`: `50 credits`.
    - `humanitarianAid`: `100 credits`.
    - `peerVouch`: `10 credits`.
    - `claude_3_5_sonnet_per_1k_tokens`: `1 credit`.
    - `gpt_4o_per_1k_tokens`: `1 credit`.
    - `gemini_free_tier` & `ollama_local_cloud`: `0 credits (Always Free)`.
    - `nonCashable`: `true` (strictly in-platform utility token).
- **Spending Credits**: Earned platform credits can be spent to query premium, non-free LLMs (Claude 3.5 Sonnet, GPT-4o, DeepSeek Pro) via the managed gateway without paying cash.
- *(Note: Complex anti-abuse proof-of-structure validation is deferred / out of scope for initial release).*

### 6.3 Smart Engine Advisor (Strictly User-Consented)
- **Engine switching is NEVER automatic or silent.**
- When a user is on `🦙 Ollama` and submits a task requiring heavy coding or advanced reasoning, the system provides a helpful suggestion:
  > *"💡 This coding task might benefit from **Claude 3.5 Sonnet** (Configured). Switch for this query? `[ Switch ]` `[ Keep Ollama ]`"*
- Only engines that are **already configured** or accessible via available platform credits are suggested.

---

## 7. Account Onboarding & Non-Destructive Local Data Binding

1. **Initial Sign-In Choice**:
   - When an existing anonymous user signs into Google for the first time:
     - `Option 1`: Link existing local `.inuo.db` to their Google account.
     - `Option 2`: Start fresh without linking yet.
2. **Non-Destructive Local Persistence**:
   - Anonymous local SQLite context and database files are **never deleted or lost**.
   - A user can bind their local `.inuo.db` at any time later in Settings or via CLI (`auth bind-local`).
