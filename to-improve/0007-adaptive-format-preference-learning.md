# Adaptive User Format Preference Learning

- id: 0007
- status: pending
- createdAt: 2026-08-16
- owner: iNoU Team
- source: docs/toImprove.md

## Context

Users must repeat formatting instructions every session ("make it shorter",
"use bullet lists", "avoid tables"). These preferences are not retained
across sessions, causing repeated corrections.

Full design is documented in `docs/toImprove.md` (Adaptive User Format
Preference Learning section).

## Proposed Change

- `PreferenceEngine` signal detection (no LLM call) for: responseLength,
  responseFormat, preferTables — across EN/ES/FR/DE/PT.
- Persist per-user preferences in `.inuo-state.json` → `userPreferences[]`.
- Inject `buildPreferencePromptBlock()` into every LLM prompt call.
- Export `userPreferences` in training dataset with `PrivateUser` scope.

New / modified files (from design doc):
- `src/types/ResponseLength.ts`, `src/types/ResponseFormat.ts`
- `src/interfaces/UserPreferenceProfile.ts`
- `src/cli/preferenceEngine.ts`
- `src/cli/shell.ts`, `src/cli/aiClient.ts`, `src/cli/learningEngine.ts`

Open items after initial implementation:
- Detect tone preferences (`formal` / `casual`)
- Surface in `mode status` output
- CLI override: `mode format bullets`, `mode length brief`
- Signal decay over time

## Acceptance

- [ ] "make it shorter" in EN/ES/FR/DE/PT saves `responseLength: 'brief'`
- [ ] LLM prompt includes injected preference block on next call
- [ ] Preference survives shell restart (persisted to state)
- [ ] Export includes `userPreferences` with `scope: 'PrivateUser'`
- [ ] Unit tests for signal detection regex in all 5 languages
