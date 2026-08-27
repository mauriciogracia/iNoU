# Technical Specification 0007: iNoU Mobile Architecture & Specifications

## 1. Executive Summary & Vision

The **iNoU Mobile Experience** extends the decentralized multiagent LLM orchestration platform to handheld devices (iOS, Android, Tablets). It empowers users to manage continuous multi-engine chats, capture intent on the go (Needs & Offers), receive match alerts, and maintain full local-first state autonomy whether online or completely offline.

---

## 2. Core Architectural Pillars

```
+-------------------------------------------------------------------------+
|                         iNoU Mobile Client                              |
|                                                                         |
|  +-----------------------+  +-----------------------+  +-------------+  |
|  |  Conversations View   |  |   Need/Offer Market   |  | Config View |  |
|  |  (Turn-by-turn LLMs)  |  |   (Peer Match Radar)  |  |  (Engines)  |  |
|  +-----------------------+  +-----------------------+  +-------------+  |
|                             |                                           |
|              +--------------+--------------+                            |
|              |     Local Storage (SQLite)  |                            |
|              |     OPFS / Native SQLite    |                            |
|              +--------------+--------------+                            |
+-----------------------------|-------------------------------------------+
                              |
                     Encrypted Sync & SSE
                              |
                              v
+-------------------------------------------------------------------------+
|                  iNoU Hub / Cloud Gateway (Node.js)                     |
|                                                                         |
|  +-----------------------+  +----------------------------------------+  |
|  |  Local SLM (Ollama)   |  |   Multi-Provider Cloud LLM Gateway     |  |
|  |  qwen2.5:3b (0 cost)  |  |   Gemini · Claude · OpenAI · Groq      |  |
|  +-----------------------+  +----------------------------------------+  |
+-------------------------------------------------------------------------+
```

### 2.1 Hybrid PWA + Native Container Strategy
1. **Tier 1 (Instant Web Access)**: Mobile-optimized Progressive Web App (PWA) with Web App Manifest, Service Worker, and OPFS (Origin Private File System) / IndexedDB for offline caching.
2. **Tier 2 (App Store / Play Store Native Shell)**: Capacitor / Ionic native wrapper wrapping the compiled client assets, providing native SQLite access, secure keychain storage for API keys, biometric authentication (FaceID/Fingerprint), and push notification hooks.

### 2.2 Local-First Storage & Offline-First Resilience
- **Database Engine**: Native SQLite database (`.inuo.db`) running directly on device.
- **Delta Sync Protocol**: High-watermark synchronization syncing mutated entities (`tasks`, `chats`, `chat_messages`, `preferences`, `memories`) via the existing `cloud_sync_journal`.
- **Offline Behavior**:
  - Full creation of Needs, Offers, and Chat Messages while in airplane mode.
  - State marked as `LOCAL_ONLY`.
  - Seamless merge and synchronization when reconnecting to Wi-Fi/Cellular.

---

## 3. User Experience & UI Specifications

### 3.1 Mobile Viewport Layout & Ergonomics
- **Thumb-Zone Optimization**: All primary action buttons (Engine Switcher, Voice Dictation, Send, New Need/Offer) anchored in the bottom 30% of the screen.
- **Bottom Navigation Bar**:
  1. `💬 Conversación` (Active continuous chat with attribution badges).
  2. `📑 Sesiones` (Chat drawer with swipe gestures).
  3. `🎯 Mercado` (Visual Need <-> Offer match feed).
  4. `⚙ Ajustes` (LLM engine manager, API keys, sync status).

### 3.2 Mobile Engine Switcher (Bottom Sheet)
- Tapping the engine badge pill in the bottom input bar opens an animated **Bottom Sheet Modal**.
- Visual cards displaying provider status, model name, and connectivity:
  - `🦙 Ollama Local (Node / Docker)` – 0 token cost intent interpreter.
  - `✨ Google Gemini` – Free / Pro reasoning tier.
  - `🟣 Anthropic Claude` – Deep technical & architectural reasoning.
  - `🟢 OpenAI GPT` – General intelligence & speed.
  - `🪐 OpenRouter / Groq / DeepSeek` – Open source & specialized cloud models.

### 3.3 Gestures & Mobile Micro-Interactions
- **Swipe-to-Archive / Swipe-to-Delete**: Swipe left on any chat session row to quickly archive or delete.
- **Pull-to-Refresh**: Pull down on chat or need feed to force cloud sync reconciliation.
- **Long-Press Message**: Context menu for Copy, Branch Conversation, Re-run with Different LLM Engine, or Share.

---

## 4. On-Device & Cloud Intent Interpretation

```
[User Input (Text/Voice)]
          |
          v
[Mobile Client Triage] ------------------------+
          |                                    |
          | (Connected to Node Hub)            | (Standalone Mobile)
          v                                    v
[Ollama Hub qwen2.5:3b]               [Direct Cloud LLM via Key]
   • Intent Extraction                   • Gemini / OpenAI API
   • NEED = VERB + OBJECT                • On-Device Grammar Filter
   • OFFER = COMP + OBJECT
```

1. **Intent Extraction**:
   - Voice Dictation transcribed via Web Speech API or device native speech recognition.
   - Deterministic commands (`need create`, `offer create`, `match`, `sync`) executed locally without token cost.
   - Generative queries routed turn-by-turn to the selected LLM provider.

2. **Attribution & Transparency**:
   - Every assistant response bubble in mobile displays a compact provider badge (`[🦙 Ollama]`, `[✨ Gemini]`, `[🟣 Claude]`) with execution latency and token metrics.

---

## 5. Security & Mobile Device Trust

1. **Secure Credential Storage**:
   - iOS Keychain and Android Keystore used for storing cloud provider API keys (Gemini, OpenAI, Anthropic) when running natively.
2. **Biometric Security Gate**:
   - Optional FaceID / Fingerprint lock before opening confidential chats or confirming paid tier token allowances.
3. **Local Encryption**:
   - SQLite DB encrypted with SQLCipher on native targets.

---

## 6. Implementation Roadmap

| Phase | Milestone | Deliverables |
|---|---|---|
| **Phase 1** | Responsive Mobile Layout | Mobile CSS media queries, bottom navigation bar, touch-friendly engine selector pill, and swipe drawer in `public/`. |
| **Phase 2** | PWA & Offline Service Worker | `manifest.json`, ServiceWorker caching for static assets, and offline indicator. |
| **Phase 3** | Voice Dictation & Audio Capture | Speech-to-text dictation button in the mobile prompt input bar. |
| **Phase 4** | Native Shell (Capacitor) | Native iOS & Android builds, SQLite native driver, push notification listeners for peer matches. |
