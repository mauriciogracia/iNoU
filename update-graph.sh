#!/usr/bin/env bash
# ==============================================================================
# update-graph.sh – Root Launcher for iNoU Codebase Knowledge Graph Generator
# Updates codebase AST knowledge graph using graphify (0 tokens / code-only).
# ==============================================================================
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec bash "$DIR/scripts/update-graph.sh" "$@"
