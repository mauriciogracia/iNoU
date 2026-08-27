# Technical Specification 0007: iNoU Mobile Minimalist Plain-Text CLI (Android & iOS)

## 1. Vision & Philosophy

**"The most simple CLI for mobile — pure plain text, maximum speed, zero bloat."**

Instead of complex graphical dashboards, the mobile client for Android and iOS operates as an ultra-lightweight, distraction-free **Mobile Terminal / Plain-Text CLI**. It brings the complete power of the iNoU orchestration engine to handheld devices with instantaneous loading, minimal battery consumption, and seamless typing on mobile keyboards.

---

## 2. Core Experience & Visual Interface

```
+-------------------------------------------------------------+
| iNoU Mobile CLI                                    [v0.3.75]|
+-------------------------------------------------------------+
| [System] Node connected. Stream active.                     |
|                                                             |
| iNoU > need create --verb Request --object GraphicDesign    |
| ✔ Need created [ID: need_178778]                            |
|                                                             |
| iNoU > /engine gemini                                       |
| ✔ Active engine switched to: Google Gemini (Free / Pro)     |
|                                                             |
| iNoU > que tipo de tareas me puedes ayudar a resolver ?     |
| [✨ Gemini] Te puedo ayudar a:                              |
| - Descomponer metas complejas en necesidades executables    |
| - Emparejar necesidades y ofertas entre nodos pares         |
| - Orquestar motores locales y en la nube                   |
|                                                             |
| _                                                           |
+-------------------------------------------------------------+
| [🦙 Ollama] iNoU > [ Type a command or prompt...     ] [↵]  |
+-------------------------------------------------------------+
```

### 2.1 Aesthetic & Typography
- **Font**: Clean monospace typography (`JetBrains Mono`, `Fira Code`, or native system monospace `Courier New` / `monospace`).
- **Color Scheme**: High-contrast terminal dark mode (pure black `#000000` / midnight `#0b0f19` with cyan `#38bdf8`, green `#4ade80`, yellow `#facc15`, and white `#f1f5f9` text).
- **Layout**:
  - Full-height continuous terminal output viewport with smooth auto-scroll.
  - Pinned single-line input bar at the bottom that automatically stays above the mobile virtual keyboard.
  - Tiny text-based engine tag (e.g. `[🦙 Ollama]`, `[✨ Gemini]`).

---

## 3. Key Functional Specifications

### 3.1 Direct Command Execution & Natural Language Intent
- **Full CLI Command Parity**:
  - `need create --verb <Verb> --object <Object>`
  - `offer create --verb <Verb> --object <Object>`
  - `match` (Trigger peer match engine)
  - `chats` / `chat new` / `chat switch <id>`
  - `llm list` / `llm select <engine>` / `key <apiKey>`
  - `status` / `whoami` / `clear`
- **Natural Language Intent**:
  - Plain conversational input automatically triaged by the local SLM / chosen LLM.
  - Outputs concise, plain text explanations directly to the stream.

### 3.2 Mobile-Friendly Quick Commands
- `/engine <name>` (e.g., `/engine ollama`, `/engine gemini`, `/engine claude`, `/engine openai`) for fast one-hand engine switching.
- `/clear` or tapping the header clears the scrollback.
- `/history` or up-arrow tap cycles through recent commands.

### 3.3 Virtual Keyboard Optimization
- Input uses `autocapitalize="none"`, `autocorrect="off"`, `spellcheck="false"`, `enterkeyhint="send"` to prevent mobile OS interference with command syntax.
- Viewport dynamically adjusts to `window.visualViewport` to eliminate layout jumps when the on-screen keyboard opens on iOS (Safari) and Android (Chrome).

---

## 4. Platform Delivery Strategy

### 4.1 Mobile Web Terminal (Android Chrome & iOS Safari)
- Accessible instantly via `http://<node-ip-or-domain>:8765/m` or dedicated `/cli` mobile route.
- Zero dependencies, pure HTML + CSS + lightweight Vanilla JS client (< 30 KB total).

### 4.2 Standalone PWA (Home Screen Installable)
- "Add to Home Screen" on iOS & Android gives a full-screen, status-bar native terminal feel without browser address bar clutter.

### 4.3 Native Terminal Shells (Termux / iSH)
- Compatible with direct terminal sessions via SSH or local CLI invocation.

---

## 5. Technical Requirements & Next Steps

1. **Lightweight Route (`/m` / Mobile View)**:
   - Create a clean, single-file lightweight mobile CLI template (`public/mobile.html` + `public/mobile.css`).
2. **Viewport & Keyboard Handlers**:
   - Implement `visualViewport` listener for smooth keyboard docking on iOS and Android.
3. **SSE Text Stream Client**:
   - Direct connection to `/api/events` streaming plain text with ANSI color-to-span conversion.
