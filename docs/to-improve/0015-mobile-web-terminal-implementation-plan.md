# Technical Specification 0015: iNoU Minimalist Mobile Terminal (`/m`) Implementation Plan

## 1. Goal Description

Build an ultra-lightweight, zero-bloat mobile terminal interface for Android (and iOS) accessible via `/m`, delivering full iNoU command execution and natural language prompt interaction on handheld devices.

---

## 2. Capabilities & Specifications

1. **Lightweight Route & Architecture**:
   - Server endpoint: `GET /m` in `Router.ts` serving `public/mobile.html`.
   - Standalone bundle: `< 30 KB` total footprint (pure Vanilla HTML5 + CSS3 + TypeScript/JS).
   - Responsive PWA metadata (`viewport-fit=cover`, Web App Manifest, mobile status bar styling).

2. **Mobile Ergonomics & Keyboard Docking**:
   - Viewport height auto-adjusting via `window.visualViewport` to smoothly dock the `iNoU > ` input bar above the Android on-screen keyboard.
   - Optimized mobile input attributes (`autocapitalize="none"`, `autocorrect="off"`, `spellcheck="false"`, `enterkeyhint="send"`).

3. **Core Functional Flow**:
   - Submits text commands and conversational prompts to `/api/command`.
   - Listens to real-time execution via Server-Sent Events (`/api/events`).
   - Supports `/engine <name>` fast switching (`ollama`, `gemini`, `claude`, `openai`).
   - Command history navigation (Up / Down quick buttons for mobile).
   - Renders interactive choice chips for disambiguation and spec-engineering intakes.

---

## 3. Proposed Changes

### Web & API Server
#### [MODIFY] `src/api/routes/Router.ts`
- Add route handler for `GET /m` and `GET /mobile` to serve `public/mobile.html`.

### Mobile Frontend Assets
#### [NEW] `public/mobile.html`
- Clean, semantic HTML5 mobile terminal layout with stream viewport, status bar, and pinned input prompt.

#### [NEW] `public/mobile.css`
- Monospace high-contrast dark theme, visual viewport dynamic sizing, touch-friendly tap targets, and smooth autoscroll.

#### [NEW] `browser/mobile.ts`
- Client-side TypeScript controller handling SSE connection, command history, engine selector, and interactive choice chips.

---

## 4. Verification Plan

### Automated Tests
- Build verification: `npm run build` (ensuring `tsconfig.browser.json` compiles `mobile.ts` to `public/mobile.js`).
- Dynamic routing test: `node --test tests/dynamicEngineRouting.test.js`.

### Browser Emulation Verification
- Verify `http://localhost:3000/m` in mobile device emulation mode (Pixel 8 / iPhone 15) for layout responsiveness, virtual keyboard docking, and command execution.
