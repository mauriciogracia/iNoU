# Chat Feature Specification

| Property      | Value                                              |
| :------------ | :------------------------------------------------- |
| **Status**    | `DRAFT — elicited 2026-08-17`                      |
| **Features**  | Multiple Chats · Chat Merge · Chat Attachments     |
| **Entities**  | `chat`, `chat_message`, `chat_attachment`          |
| **Dev Rules** | §7.1 Semantic Command Spec Parity · §7.2 UI Parity |

---

## 1. Multiple Chats

### 1.1 Concept

`chat` is a first-class iNoU entity — equivalent to `project`, `task`,
`preference`. It follows all entity lifecycle rules:

- Stored in local SQLite (`.inuo.db`) by default
- Syncable via Colmena like any other entity
- CRUD through `semanticDispatcher` + `shell.ts`
- Listed with IDs and human-friendly titles
  Only **one chat is active at a time** (analogous to `activeProject`).
  The active chat is where all prompts are executed. Each chat maintains its
  own independent LLM context window.
  If no chat is active when the user sends a message, iNoU auto-creates a new
  chat with an AI-generated title and sets it as active.

---

### 1.2 CLI Command Surface (`chat` entity)

```
chat add [--title "<title>"]            — create a new chat (auto-title if omitted)
chat list                               — list all chats (active first)
chat open <id|title>                    — set a chat as active
chat rename <id|title> --title "<new>"  — rename a chat
chat remove <id|title>                  — delete a chat and its messages
chat export <id|title> [--format json|md]  — export chat history
chat check <id|title>                   — detect inconsistencies in a chat
chat merge <id1> <id2> [<id3>…]        — merge two or more chats
```

**Multilingual aliases** (normalised by `semanticDispatcher`):
| Token | Maps to |
|---|---|
| `chat` / `conversacion` / `conversation` / `gespräch` | `chat` entity |
| `open` / `abrir` / `ouvrir` | `enable` action |
| `rename` / `renombrar` / `renommer` | `update` action |
| `check` / `verificar` / `vérifier` | custom action `check` |
| `merge` / `combinar` / `fusionner` | custom action `merge` |

---
