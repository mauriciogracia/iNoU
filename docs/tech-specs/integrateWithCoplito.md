# Integrate With Coplito (Copilot) - iNoU

## Purpose

Document the current status and next steps for enabling real Copilot interaction inside iNoU.

This document is focused on provider integration, not Colmena node dispatch.

## Current Status

iNoU already supports non-secret LLM profile configuration for multiple engines, including copilot.

Implemented now:

- `llm add <engineName>` with interactive prompts (no secrets requested)
- `llm list`
- `llm status`
- `llm remove <configurationName>`
- Browser `uiMode` flow for `llm add <engineName>`
- REST profile management endpoints

Current behavior for copilot:

- A copilot profile can be created and persisted.
- Setup guidance is shown.
- No API key is requested or stored in iNoU state.
- The profile is configuration-only for now.

## What Is Still Missing for Real Copilot Interaction

To actually use Copilot as an active runtime provider, iNoU still needs:

1. Provider dispatch integration

- Route AI calls through a provider-agnostic execution layer.
- Resolve active profile and select the correct adapter.

2. Copilot runtime adapter

- Implement a `copilot` adapter that executes text generation requests.
- Normalize response shape to iNoU format (`text`, `inputTokens`, `outputTokens`, metadata).

3. Capability contract mapping

- Map per-profile flags (`supportsPlanMode`, `supportsExecuteMode`) to real adapter behavior.
- Enforce mode compatibility before execution.

4. Credential runtime boundary

- Keep secrets outside persisted state.
- Read credentials/tokens only from runtime environment or delegated secure provider.

5. Health and fallback

- Add provider health checks and user-facing status.
- Support fallback provider policy when copilot is unavailable.

## Security and Data Boundaries

iNoU must preserve these constraints:

- Never ask users for API keys in CLI wizard or web modal.
- Never write tokens/secrets to `.inuo-state.json`.
- Reject secret-like fields on REST profile create/update payloads.
- Keep profile metadata and credential material strictly separated.

## Recommended Implementation Plan

### Phase 1 - Runtime Adapter Boundary

- Introduce a provider-agnostic invocation function (single entry point).
- Keep current Gemini path working as baseline.
- Add adapter registry keyed by `engineName`.

Exit criteria:

- Existing intent flows still pass tests.
- Provider selection is no longer hardwired in call sites.

### Phase 2 - Copilot Adapter

- Implement copilot adapter for text generation.
- Add adapter contract tests for success/failure normalization.
- Wire `llm status` to show runtime readiness per profile.

Exit criteria:

- Active copilot profile can answer a basic intent path.
- Token/cost fields are handled consistently with other providers.

### Phase 3 - Policy and Fallback

- Add policy checks for plan/execute compatibility.
- Add optional fallback chain per profile.
- Add clear error messages when capability mismatch occurs.

Exit criteria:

- Unsupported mode usage fails fast with actionable output.
- Fallback behavior is deterministic and tested.

## CLI and API Contract (Current)

CLI:

- `llm add <engineName>`
- `llm list`
- `llm status`
- `llm remove <configurationName>`

HTTP:

- `GET /api/llm/configurations`
- `POST /api/llm/configurations`
- `DELETE /api/llm/configurations/:configurationName`

Command UI negotiation:

- `POST /api/command` with `uiMode: true` and command `llm add <engineName>`
- Returns `input_required` plus provider setup defaults for modal rendering.

## Definition of Done for "Copilot Integrated"

Copilot integration is considered complete when all are true:

- A configured copilot profile can be selected by runtime dispatch.
- iNoU can execute at least one production intent path using copilot output.
- Plan/execute capability constraints are enforced.
- No credentials are collected or persisted by profile commands.
- Full regression suite remains green.
