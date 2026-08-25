# MCP Server — Tool Catalogue, STDIO/SSE Transport, DAG Integration

- id: 0010
- status: pending
- createdAt: 2026-08-16
- owner: iNoU Team
- source: gap-analysis / Phase 4 / main-specs-goals.md §8

## Context

`main-specs-goals.md` §8 Phase 4 requires `InouMcpServer.ts` exposing iNoU
planning and execution tools to VSCode, Antigravity, Cursor, and AI agents.
`clients_api_event_bus.specs.md` §2.5 mentions MCP in one sentence.
No dedicated spec file or implementation file exists.

The `inou mcp start --stdio` CLI command is listed in the CLI reference
(§7) but is a stub.

## Proposed Change

### Spec (create first)
Create `docs/tech-specs/mcp_server.specs.md` covering:
- Exposed tool catalogue (e.g., `inuo_plan_create`, `inuo_node_run`,
  `inuo_workflow_list`, `inuo_memory_add`)
- Tool input/output JSON schemas
- STDIO transport mode (for local IDE integration)
- SSE transport mode (for remote agents)
- Authentication / trust level enforcement

### Implementation
- `src/cli/InouMcpServer.ts` using the MCP SDK (`@modelcontextprotocol/sdk`)
- Tool handlers mapped to existing CLI engine functions
- `inou mcp start --stdio` starts STDIO server
- `inou mcp start --sse --port <port>` starts SSE server

## Acceptance

- [ ] `mcp_server.specs.md` written, cross-linked from `main-specs-goals.md` §8 and `road-map.md` Phase 4
- [ ] `inou mcp start --stdio` launches a working MCP server
- [ ] At least: `inuo_workflow_list`, `inuo_node_add`, `inuo_memory_add` tools registered
- [ ] Tool schemas validated against MCP spec
- [ ] VSCode MCP extension can discover and call tools via STDIO
- [ ] Unit/integration test for at least one tool call round-trip
