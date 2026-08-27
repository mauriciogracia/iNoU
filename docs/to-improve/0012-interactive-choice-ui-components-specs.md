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
|  │  ● 100% Remoto   │  │  ○ Híbrido       │  │  ○ Presencial    │           |
|  └──────────────────┘  └──────────────────┘  └──────────────────┘           |
|                                                                             |
|  ┌──────────────────────────────────────────────────────────────┐           |
|  │ ✏ Otra opción (Escribir): [ 2 días oficina / 3 remoto...   ] │           |
|  └──────────────────────────────────────────────────────────────┘           |
|                                                                             |
|  [ Continuar / Enviar ↵ ]                                                   |
+─────────────────────────────────────────────────────────────────────────────+
```

---

## 2. Component Types & Behavior

### 2.1 Single-Choice Component (`SingleChoiceSelector`)
- **Use Case**: Mutually exclusive options (e.g., Work modality, seniority level, yes/no confirmation, LLM provider selection).
- **Behavior**:
  - Tapping a chip immediately highlights it and unselects others.
  - Includes a default **"Otro / Write-in"** expandable input field.
  - Tapping a chip automatically triggers submission or allows confirmation via `[ Continuar ]`.

### 2.2 Multiple-Choice Component (`MultiChoiceSelector`)
- **Use Case**: Multi-select tags and requirements (e.g., Tech stack: `[☑ TypeScript] [☑ React] [☑ Node.js] [☑ PostgreSQL] [☑ Docker]`).
- **Behavior**:
  - Tapping chips toggles checkmarks on/off.
  - Includes **"Otro / Write-in"** chip that appends custom tags to the selected array.
  - Clear **`[ Confirmar Selección (3 seleccionados) ↵ ]`** action button.

### 2.3 The "Other / Write-in" Action (`OtherActionField`)
- **Always Available**: Ensures the user is never boxed into predefined choices.
- **Dynamic Insertion**: Typing into "Other" and pressing Enter adds it as an active selected choice.

---

## 3. Data Structure Contract (`InteractiveChoicePayload`)

When the AI generates a question with choices, it emits a structured JSON block:

```json
{
  "type": "INTERACTIVE_CHOICE",
  "question": "¿Cuál es la modalidad requerida?",
  "isMultiSelect": false,
  "options": [
    { "id": "opt_remote", "label": "100% Remoto", "recommended": true },
    { "id": "opt_hybrid", "label": "Híbrido" },
    { "id": "opt_onsite", "label": "Presencial en Oficina" }
  ],
  "allowOther": true,
  "otherPlaceholder": "Especificar otra modalidad..."
}
```

---

## 4. UI Implementation (Web & Mobile CLI Parity)

1. **Rich Web / Desktop UI**:
   - Modern glassmorphism pill buttons with active glow, hover animations, and checkmark toggles.
2. **Minimalist Mobile CLI (`/m`)**:
   - Numbered interactive chips (e.g. `[1] Remoto`, `[2] Híbrido`, `[3] Presencial`, `[4] Otro`) where tapping or typing `1` instantly selects the option.
