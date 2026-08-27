# Technical Specification 0012: Interactive Single/Multi-Choice UI Components with "Other" Write-in

## 1. Executive Summary & Objective

To make the conversational intake, spec-engineering, and plugin configuration effortless for end users, the **iNoU UI** (Web, Desktop, and Mobile) provides rich **Interactive Choice Components**.

Whenever iNoU asks clarifying questions or prompts for options (e.g. during `create job offer`, engine selection, or milestone definition), it dynamically renders selectable chips instead of requiring raw manual typing.

```
+─────────────────────────────────────────────────────────────────────────────+
| [iNoU] Paso 3/5: ¿Cuál es la modalidad de trabajo requerida?                |
|                                                                             |
|  Single-Choice Selection (Radio-style):                                     |
|  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐           |
|  │ [1] ● 100% Remoto│  │ [2] ○ Híbrido    │  │ [3] ○ Presencial │           |
|  └──────────────────┘  └──────────────────┘  └──────────────────┘           |
|                                                                             |
|  ┌──────────────────────────────────────────────────────────────┐           |
|  │ [4] ✏ Otra opción (Escribir): [ 2 días oficina / 3 remoto... ]           |
|  └──────────────────────────────────────────────────────────────┘           |
|                                                                             |
|  [ Continuar / Enviar ↵ ]                                                   |
+─────────────────────────────────────────────────────────────────────────────+
```

---

## 2. Core Architectural & Behavioral Requirements

### 2.1 Universal Number / ID Indexing (`Dual-Input Support`)
- **Visual Badge**: Every chip **MUST** display a visible sequential index (e.g. `[1]`, `[2]`, `[3]`) and carry a unique machine `id`.
- **Keyboard / CLI Typing**: The user can either:
  1. **Click/Tap** the chip directly in the UI.
  2. **Type the number** (e.g. typing `1` selects option 1; typing `1, 3` selects options 1 and 3 in multi-select) and press Enter.

### 2.2 Full-Area Click Target (`Click Anywhere`)
- The **entire bounding box** of the chip (badge, icon, label, radio/checkbox) is a clickable hit target (`cursor: pointer`, generous padding for mobile thumbs, visual active/ripple feedback).

### 2.3 Explicit Continue Action Button (`Continue / Submit`)
- The UI **MUST ALWAYS** render a prominent, styled action button:
  - **Single-Choice**: `[ Continuar ↵ ]` / `[ Continue ↵ ]` (submits the selected option or write-in).
  - **Multi-Choice**: `[ Continuar (3 seleccionados) ↵ ]` / `[ Continue (3 selected) ↵ ]` (dynamically counts selected chips).

### 2.4 Complete Internationalization Support (`I18N`)
- All labels, chip prompts, buttons, and placeholders are localized via `getI18n(lang)`:
  - **Spanish (`es`)**:
    - `"continue"`: `"Continuar ↵"`
    - `"selectedCount"`: `"{count} seleccionados"`
    - `"otherPlaceholder"`: `"Escribe otra opción..."`
    - `"otherLabel"`: `"Otra opción"`
  - **English (`en`)**:
    - `"continue"`: `"Continue ↵"`
    - `"selectedCount"`: `"{count} selected"`
    - `"otherPlaceholder"`: `"Type another option..."`
    - `"otherLabel"`: `"Other option"`

---

## 3. Data Structure Contract (`InteractiveChoicePayload`) & Stream Protocol

### 3.1 Universal Marker Emission (`<<<INOU_CHOICE:...>>>`)
When the shell or SLM outputs an interactive choice card, it embeds the payload in a single, universal demarcated block:

```text
¿Cuál es la modalidad requerida?
<<<INOU_CHOICE:{"type":"INTERACTIVE_CHOICE","question":"¿Cuál es la modalidad requerida?","isMultiSelect":false,"options":[{"index":1,"id":"opt_remote","label":"100% Remoto"},{"index":2,"id":"opt_hybrid","label":"Híbrido"},{"index":3,"id":"opt_onsite","label":"Presencial"}],"allowOther":true,"otherIndex":4}>>>
```

- **Web & Mobile Terminal (`/m`)**: Intercepts `<<<INOU_CHOICE:...>>>`, strips the raw JSON from visible text, and mounts interactive clickable chips.
- **Raw ANSI Terminal**: Fallback parser prints clean numbered text: `[1] 100% Remoto  [2] Híbrido  [3] Presencial  [4] Otro`.

### 3.2 JSON Payload Schema
```json
{
  "type": "INTERACTIVE_CHOICE",
  "question": "¿Cuál es la modalidad requerida?",
  "isMultiSelect": false,
  "options": [
    { "index": 1, "id": "opt_remote", "label": "100% Remoto", "recommended": true },
    { "index": 2, "id": "opt_hybrid", "label": "Híbrido" },
    { "index": 3, "id": "opt_onsite", "label": "Presencial en Oficina" }
  ],
  "allowOther": true,
  "otherIndex": 4,
  "i18nKeyPrefix": "choiceComponents"
}
```

---

## 4. UI Implementation (Web, Desktop & Mobile CLI Parity)

1. **Rich Web / Desktop UI**:
   - Modern glassmorphism pill buttons with active glow, hover animations, and checkmark toggles.
2. **Minimalist Mobile Terminal (`/m`)**:
   - Numbered interactive touch chips with `visualViewport` docking.
   - Fast keyboard response (typing `1` selects chip `[1]`).

