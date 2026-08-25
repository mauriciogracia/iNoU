# Fix Broken Internal Spec Links After `mv tech-specs/ docs/`

- id: 0002
- status: pending
- createdAt: 2026-08-16
- owner: iNoU Team
- source: gap-analysis / tech-specs review

## Context

All 16 spec files under `docs/tech-specs/` and the supporting docs still use the
old path prefix `tech-specs/…` in every cross-reference, `Architecture Reference:`
header, and `§` link. After the rename (`mv tech-specs/ docs/`), every internal
link is broken and resolves to a missing file.

Affected files: all `docs/tech-specs/*.md`, `docs/current-status.md`,
`AGENTS.md` (line 5 references `tech-specs/dev-rules.md`).

Additionally, `docs/deployGaps.md` §2.2 fix still says
`COPY tech-specs/ ./tech-specs/` — the Dockerfile must copy `docs/` instead.

## Proposed Change

1. Search-replace `tech-specs/` → `docs/tech-specs/` in every internal markdown
   link across all spec files and docs.
2. Update `AGENTS.md` line 5 to `docs/tech-specs/dev-rules.md`.
3. Update `docs/deployGaps.md` §2.2 fix to reflect the new path in the Dockerfile.
4. Validate with a `grep -r "tech-specs/" docs/ AGENTS.md` to confirm zero remaining stale references.

## Acceptance

- [ ] `grep -r "\(tech-specs/" docs/ AGENTS.md` returns zero matches
- [ ] All spec cross-links open correctly in a markdown renderer
- [ ] `AGENTS.md` `Architecture Rules Reference` link resolves correctly
- [ ] `docs/deployGaps.md` Dockerfile fix uses the correct `docs/` path
