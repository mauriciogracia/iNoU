# AI Usage Tracking — Token Counts, Budget Limits, CLI & Web UI

- id: 0008
- status: pending
- createdAt: 2026-08-16
- owner: iNoU Team
- source: docs/toImprove.md

## Context

No visibility into token consumption per session, per command, or in total.
No budget control. Users cannot tell how much quota has been used.

Full design is documented in `docs/toImprove.md` (AI Usage Tracking section).

## Proposed Change

New interfaces:
- `src/interfaces/AiUsageRecord.ts` — single LLM call record
  (`providerId`, `model`, `command`, `inputTokens`, `outputTokens`, `estimatedCostUsd`, `timestamp`)
- `src/interfaces/AiUsageSummary.ts` — aggregated summary with optional `budgetLimitUsd`

Engine:
- `src/cli/usageEngine.ts` — `recordUsage()`, `getSummary()`, `formatUsageDisplay()`, `resetUsage()`

Integration:
- `src/cli/aiClient.ts`: capture `response.usageMetadata` after every `generateContent()` call
- `StateData`: add `aiUsageLog?: AiUsageRecord[]` (rolling, capped at 1 000 records)

CLI commands:
- `ai usage` — summary for active provider
- `ai usage --provider <id>` — specific provider
- `ai usage --reset` — clear log

Web UI:
- `usage-pill` in header showing budget % or total tokens
- `aiUsage` field added to `/api/status` response

## Acceptance

- [ ] Token counts captured from `response.usageMetadata` for every Gemini call
- [ ] `ai usage` displays request count, input/output tokens, estimated cost
- [ ] Budget warning triggered at 80% of `tokenBudgetLimit`
- [ ] `ai usage --reset` clears log for active provider
- [ ] Usage pill visible in web header after any AI call
- [ ] `aiUsageLog` persisted in state (survives restart)
- [ ] Unit tests for `recordUsage` and `getSummary` aggregation
