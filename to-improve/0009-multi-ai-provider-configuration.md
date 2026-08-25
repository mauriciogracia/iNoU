# Multi-AI Provider Configuration — OpenAI, Anthropic, Ollama, Provider Dispatch

- id: 0009
- status: pending
- createdAt: 2026-08-16
- owner: iNoU Team
- source: docs/toImprove.md

## Context

Only Google Gemini is supported. API key, model, and costs are partially
hardcoded. Users need to configure additional providers (OpenAI, Anthropic,
local Ollama) and switch between them without touching source code.

Full design is documented in `docs/toImprove.md` (Multi-AI Provider Configuration section).

Also referenced by open ticket `0001` (Copilot Runtime Integration Gap) —
this ticket is a prerequisite for `0001`.

## Proposed Change

New types:
- `src/types/AIProvider.ts` — `'gemini' | 'openai' | 'anthropic' | 'ollama' | 'custom'`
- `src/types/AICapability.ts` — `'intent-classification' | 'decomposition' | 'evolve' | 'embedding' | …`

New interface:
- `src/interfaces/AIProviderConfig.ts` — `id`, `provider`, `model`, `apiKeyRef`,
  `isActive`, `baseUrl?`, `costPerInputToken`, `costPerOutputToken`,
  `tokenBudgetLimit?`, `capabilities[]`, `addedAt`

State changes:
- `StateData.aiProviders?: AIProviderConfig[]`
- `Environment.geminiApiKey` kept for backward compatibility but deprecated

Provider-agnostic dispatch in `aiClient.ts`:
- `invokeAI(prompt, rootDir)` reads active `AIProviderConfig` and dispatches to
  `geminiAdapter` / `openaiAdapter` / `anthropicAdapter` / `ollamaAdapter`
- Returns normalized `{ text, inputTokens, outputTokens }`

CLI commands:
- `ai status` / `ai list` / `ai add` / `ai set-active` / `ai remove`
- `ai budget --provider <id> --limit <USD>`
- `ai models`

Agent file generation:
- `agent generate agents-md` / `agent generate copilot-instructions` / `agent generate all`
- Sources content from active principles, engines, skills, and trust gates

## Acceptance

- [ ] `AIProviderConfig` persisted to state; active provider switchable via `ai set-active`
- [ ] `invokeAI` dispatches to the correct adapter based on active provider
- [ ] OpenAI-compatible endpoint supported via `baseUrl` (covers Ollama)
- [ ] `ai add --provider ollama --model llama3 --key-ref local` registers a local provider
- [ ] Copilot ticket `0001` unblocked (runtime dispatch uses active provider)
- [ ] `agent generate agents-md` writes `AGENTS.md` from current state
- [ ] `Environment.geminiApiKey` still works but logs a deprecation warning
- [ ] Unit tests for provider registration, `set-active`, and `invokeAI` dispatch
