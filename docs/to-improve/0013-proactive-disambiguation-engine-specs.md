# Technical Specification 0013: Proactive Disambiguation Engine & Intent Clarification

## 1. Core Principle & Behavioral Mandate

**"Never assume or hallucinate on ambiguous intent — proactively ask to clarify."**

Whenever a user's prompt is ambiguous, polysemic, or underspecified, the **iNoU Intent Router** must detect the ambiguity and prompt the user with clarifying options using the interactive choice UI.

```
[ User Input ] ──► "cuéntame sobre el radio"
         │
         ▼
[ iNoU SLM / Disambiguation Detector ]
  • Detects multiple high-probability semantic domains (Audio, Geometry, Chemistry, Anatomy, Matching Radar)
  • Triggers: `INTERACTIVE_CHOICE` Disambiguation Card
         │
         ▼
[ Interactive Clarification Prompt ]
"Tu consulta 'radio' puede referirse a distintos temas. ¿A cuál te refieres?"

┌─────────────────────────────────────────────────────────────┐
│  ● 📻 Aparato y Transmisión de Audio / Ondas Electromagnéticas│
│  ○ 📐 Geometría y Matemáticas (Radio de un círculo)         │
│  ○ 🧪 Elemento Químico (Radio / Radium)                     │
│  ○ 🦴 Anatomía Humana (Hueso del Antebrazo)                 │
│  ○ 🎯 Alcance / Radar de ConnectingNeeds                    │
├─────────────────────────────────────────────────────────────┤
│  ✏ Otro: [ Especificar detalle...                         ] │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Disambiguation Triggers & Criteria

The engine triggers proactive disambiguation when:

1. **Polysemic Terms (Multiple Meanings)**:
   - Example: *"radio"*, *"banco"*, *"planta"*, *"mercurio"*, *"llave"*, *"pipeline"*.
2. **Underspecified Command Intent**:
   - Example: *"hazme una app"* (Needs clarification: Web, Mobile iOS/Android, Desktop, or CLI?).
   - Example: *"necesito ayuda"* (Needs category clarification: `JOB_WORK`, `SOCIAL_PARTNER`, or `HUMANITARIAN_AID`?).
3. **Low Intent Confidence (< 75% Score)**:
   - When the SLM calculates a close probability split between two or more intents (e.g. `QUERY` vs `NEED_CREATE`).

---

## 3. Integration with Interactive Choice Component

When ambiguity is detected, the engine outputs the canonical `INTERACTIVE_CHOICE` format:

```json
{
  "type": "INTERACTIVE_CHOICE",
  "isDisambiguation": true,
  "question": "Tu consulta 'radio' puede referirse a varios temas. ¿A cuál de estos te refieres?",
  "isMultiSelect": false,
  "options": [
    { "id": "opt_audio", "label": "📻 Transmisión y Ondas de Audio" },
    { "id": "opt_geometry", "label": "📐 Geometría (Radio de una circunferencia)" },
    { "id": "opt_chemistry", "label": "🧪 Elemento Químico (Radio)" },
    { "id": "opt_anatomy", "label": "🦴 Hueso del Antebrazo" },
    { "id": "opt_connectingneeds", "label": "🎯 Radar de Matching en iNoU" }
  ],
  "allowOther": true
}
```

---

## 4. Flow Continuity & Memory

- Once the user taps an option (e.g. `📻 Transmisión y Ondas de Audio`), iNoU immediately resumes execution with the disambiguated context and answers the question or executes the command without requiring the user to retype the prompt.
