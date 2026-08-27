# Technical Specification 0016: v1.0 Launch Scope & Anti-Scope-Creep Boundary

## 1. Executive Summary & Objective

This document defines the **locked, definitive boundary for the iNoU v1.0 Launch**. It establishes strict anti-scope-creep defenses, separating what is strictly included in the initial release from what is deferred to subsequent milestones.

---

## 2. Definitive v1.0 Launch Scope (IN-SCOPE & LOCKED)

```
+─────────────────────────────────────────────────────────────────────────────+
|                             iNoU v1.0 MVP Core                              |
+─────────────────────────────────────────────────────────────────────────────+
| 1. Universal Fault-Tolerant Prompt Pipeline                                 |
|    • Cloud-managed Ollama default (0-setup, 100% uptime)                    |
|    • Local Ollama override for power users (localhost:11434)                |
|    • Continuous single-chat multi-engine routing (Ollama, Gemini, Claude)   |
|                                                                             |
| 2. Minimalist Mobile Terminal (/m) & Interactive Choice Chips               |
|    • Sub-30 KB standalone PWA (1-click Home Screen install & TWA Play Store)|
|    • visualViewport dynamic virtual keyboard docking                        |
|    • Single & Multi-choice interactive chips with numbered dual-input ([1]) |
|                                                                             |
| 3. ConnectingNeeds v2 Matching Hub                                          |
|    • JOB_WORK: 1-by-1 Spec-Engineering Intake & Milestone AST Decomposition  |
|    • SOCIAL_PARTNER: Zero-form instant activity matching (chess, gaming)    |
|      - Age-gating (Adult / Teen / Minor COPPA rules)                        |
|      - Coarse geohash proximity with explicit permission explanation        |
|      - Pure plain-text ephemeral chat + Discord Bot bridge                  |
|      - 20-message audit snapshot on abuse report                            |
|    • HUMANITARIAN_AID: Dual-tier verification (Verified NGO + Mutual Aid)   |
|                                                                             |
| 4. Cloud Accounts & Local Data Sovereignty                                  |
|    • 1-Click Google / Gmail Sign-In with auto-provisioned free Gemini       |
|    • Globally unique localized gamer tags (e.g. HalconVeloz4821)           |
|    • Non-destructive local SQLite (.inuo.db) account binding                |
|    • Gamification credits configuration (src/config/gamification.json)      |
|                                                                             |
| 5. Native Built-In Integrations                                             |
|    • Trello, Jira, LinkedIn, Discord (using inou-plugin.json manifest)      |
+─────────────────────────────────────────────────────────────────────────────+
```

---

## 3. Strict Scope Creep Defenses (DEFERRED TO v2.0+)

To maintain extreme focus, zero bloat, and rapid delivery, the following features are **STRICTLY EXCLUDED** from the v1.0 release:

| Feature / Area | v1.0 Decision | Rationale & v2.0 Roadmap |
| :--- | :--- | :--- |
| **3rd-Party Plugin Store Uploads** | ❌ **DEFERRED** | v1.0 ships with 4 official built-in integrations (Trello, Jira, LinkedIn, Discord). Developer marketplace and billing splits deferred. |
| **Cryptographic Biometric Proofs** | ❌ **DEFERRED** | v1.0 relies on Google OAuth verification, rate limiting, and 20-message audit reporting. |
| **Stripe / Fiat Subscriptions** | ❌ **DEFERRED** | v1.0 uses 100% Free Tiers (Gemini / Ollama) + Gamification Platform Credits for premium models. Zero fiat payment complexity. |
| **Rich Media / Audio Peer Chat** | ❌ **DEFERRED** | Peer chat is strictly pure plain-text (no images, audio, or emojis) or offloaded to Discord. |
| **Voice Streaming / Telephony** | ❌ **DEFERRED** | Voice channels are handled natively via the Discord integration. |
| **Multi-Region Distributed Mesh** | ❌ **DEFERRED** | Initial deployment runs on centralized GCP Cloud Gateway + local client nodes. |

---

## 4. Architectural Rules of Engagement

1. **No Out-of-Scope Code Additions**: Autonomous agents must not implement features from Section 3 without explicit human directive.
2. **Single-Source Integrity**: All versions match `MAJOR.MINOR.ITERATION` (`0.4.76`).
3. **No CRLF Normalization Scripts**: Preserved per repository mandate.
