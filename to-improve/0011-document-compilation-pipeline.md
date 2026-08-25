# Document Compilation Pipeline — Pandoc DOCX, Typst PDF, ExcelJS XLSX

- id: 0011
- status: pending
- createdAt: 2026-08-16
- owner: iNoU Team
- source: gap-analysis / Phase 2 / main-specs-goals.md §8

## Context

`main-specs-goals.md` §8 Phase 2 and CLI reference §7 include:
- `inou export docx --node <path> --template <path.docx>`
- `inou export pdf --node <path> --engine typst|chrome`
- `inou export xlsx --node <path>`

These commands are listed in the CLI reference but are stubs. No spec file
defines the pipeline, and no implementation file exists. `current-status.md`
lists this as a Phase 2 pending item.

## Proposed Change

### Spec (create first)
Create `docs/tech-specs/document_pipeline.specs.md` covering:
- Tool discovery (how iNoU locates `pandoc`, `typst`, headless Chrome, `exceljs`)
- DOCX template schema and variable substitution
- PDF engine selection and fallback order
- XLSX column/sheet mapping from tabular artifact JSON
- Error handling when tools are not installed
- Artifact naming conventions and storage in `.inou/artifacts/`

### Implementation
- `src/cli/documentPipelineEngine.ts` — tool discovery, dispatch, error handling
- CLI export subcommand handlers: `docx`, `pdf`, `xlsx`
- Artifact output registered in `ArtifactRegistry` after successful compilation
- Graceful error if `pandoc`/`typst` not found (install hint shown)

## Acceptance

- [ ] `document_pipeline.specs.md` written, cross-linked from `main-specs-goals.md` §8
- [ ] `inou export pdf --node 1.1 --engine typst` compiles a PDF when `typst` is installed
- [ ] `inou export docx` errors gracefully with install instructions when `pandoc` is missing
- [ ] Output artifacts are stored in `.inou/artifacts/` and registered
- [ ] Unit tests mock tool invocation and verify argument construction
