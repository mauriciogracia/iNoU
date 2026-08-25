# LLM Configuration Management (CLI, UI, REST)

- id: 0001
- status: done
- completedAt: 2026-08-14
- owner: iNoU Team
- source: user request

## What Changed

Added non-secret LLM profile management across CLI, UI modal flow, and REST endpoints.

Included command surface:

- `llm add <engineName>`
- `llm list`
- `llm status`
- `llm remove <configurationName>`

Included web/API support:

- `GET /api/llm/configurations`
- `POST /api/llm/configurations`
- `DELETE /api/llm/configurations/:configurationName`
- `POST /api/command` `uiMode` handshake for `llm add <engineName>`

## Validation

- [x] focused llm/web tests passed
- [x] full test suite passed
- [x] no secret fields are accepted in profile payloads
