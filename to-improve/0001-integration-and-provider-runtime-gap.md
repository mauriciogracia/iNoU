# Copilot Runtime Integration Gap

- id: 0001
- status: pending
- createdAt: 2026-08-14
- owner: iNoU Team
- source: multi-provider roadmap

## Context

Copilot profile configuration is available, but runtime provider dispatch and adapter execution are not fully implemented for active usage.

## Proposed Change

Implement provider-agnostic dispatch and a runtime copilot adapter with capability checks and fallback policy.

## Acceptance

- [ ] copilot profile can be selected by runtime dispatch
- [ ] at least one intent path runs end-to-end using copilot adapter
- [ ] plan/execute capability checks are enforced
- [ ] no secret capture or persistence is introduced
