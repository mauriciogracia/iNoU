# Resolve escenario_03.md vs scenario_03.md Duplication

- id: 0012
- status: pending
- createdAt: 2026-08-16
- owner: iNoU Team
- source: gap-analysis / tech-specs review

## Context

`docs/tech-specs/` contains two files that share the same scenario number:

- `escenario_03.md` — Spanish-language scenario: incapacitation, delegated
  access, and emergency trust protocol
- `scenario_03.md` — presumably the English counterpart (same topic per filenames)

It is unclear if these are:
1. **Duplicate** (same content, one should be removed)
2. **Complementary** (Spanish canonical + English translation — relationship
   should be documented)

Additionally, `e2e_cli_scenario_integration.specs.md` references
`scenario_02.md`, `scenario_03.md`, and `scenario_04.md` but not
`escenario_03.md`.

## Proposed Change

1. Read both files and compare content.
2. If duplicate: remove `escenario_03.md`, update any links that reference it.
3. If complementary: add a bilingual preamble noting the relationship,
   and decide on a canonical naming convention for bilingual scenarios
   (e.g., prefix `es_` for Spanish variants).
4. Update `e2e_cli_scenario_integration.specs.md` references accordingly.
5. Document the naming convention in a `docs/tech-specs/README.md` index file.

## Acceptance

- [ ] Only one file covers scenario 03 (or two with explicit bilingual relationship documented)
- [ ] No broken references to the removed/renamed file
- [ ] `docs/tech-specs/README.md` index lists all spec files with one-line descriptions
