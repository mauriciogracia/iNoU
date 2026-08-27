# Technical Specification 0014: Resilient Universal Prompt Processing & Cloud Ollama Gateway

## 1. Prime Directive: Unbreakable Prompt Processing

**"No matter what complex features, plugins, or specifications are added, natural language prompt processing MUST WORK ALWAYS, from any client, without failure or cryptic errors."**

Every client (Web UI, Desktop CLI, Mobile Minimalist CLI, Remote API, TUI) routes through a single, hardened, and fault-tolerant **Universal Prompt Pipeline**.

```
+─────────────────────────────────────────────────────────────────────────────+
|                             Any iNoU Client                                 |
|          (Web Client · Desktop TUI · Mobile Minimalist CLI · API)           |
+──────────────────────────────────────┬──────────────────────────────────────+
                                       │ Raw Natural Language Prompt
                                       ▼
+─────────────────────────────────────────────────────────────────────────────+
|                      Universal Prompt Processing Pipeline                   |
|                                                                             |
|  1. Intent Classification & Parsing (SLM Engine)                            |
|     • Checks Active Provider: [ Cloud Ollama | Local Ollama | Gemini | ... ] |
|                                                                             |
|  2. Cloud Ollama Default (100% Uptime · Managed Cloud Gateway)              |
|     • Hosted on iNoU Cloud (GCP/Container) running qwen2.5:3b (0 user cost) |
|     • Always responsive for mobile and web users out of the box             |
|                                                                             |
|  3. Local LLM / Ollama Optional Override (Local Privacy / Offline)          |
|     • Desktop & power users can toggle to local `http://localhost:11434`    |
|                                                                             |
|  4. Graceful Error Handling & Fallback Circuit Breaker                      |
|     • Never crashes, never outputs raw stack traces                         |
|     • Always provides clear, actionable resolution guidance                 |
+─────────────────────────────────────────────────────────────────────────────+
```

---

## 2. Cloud Ollama Gateway vs. Local SLM Architecture

### 2.1 Cloud Ollama Gateway (Default for Web & Mobile)
- **Host**: Managed high-availability container cluster on GCP / Cloud Gateway.
- **Model**: `qwen2.5:3b` / specialized SLM tuned for intent extraction (`VERB + OBJECT`).
- **Target Audience**: Mobile users, web users, onboarding users who do not have a local GPU or Ollama installed on their phone/browser.
- **Cost**: 0 tokens, free included tier.

### 2.2 Local LLM / Ollama Option (Privacy & Offline Autonomy)
- **Host**: User's local machine (`localhost:11434` or custom LAN host).
- **Control**: User can toggle in Config (`⚙ Ajustes` ➔ *Usar Ollama Local* or `/engine local`).
- **Use Case**: 100% offline development, air-gapped security, or custom fine-tuned weights.

---

## 3. Fail-Safe Execution Guarantees

1. **Zero-Crash Circuit Breaker**:
   - All network calls to LLMs (Cloud Ollama, Local Ollama, Gemini, Claude, OpenAI) are wrapped in non-blocking timeout handlers (3-5s).
2. **Provider-Specific Guidance**:
   - If an engine is unreachable, the pipeline outputs clear, friendly assistance:
     > *"🦙 [Ollama] No se pudo conectar al motor en este momento. Cambia de motor en la barra inferior o intenta nuevamente en unos segundos."*
3. **Continuous Chat State Integrity**:
   - Failure of an LLM query never corrupts the SQLite database (`chats`, `chat_messages`) or active session state.
