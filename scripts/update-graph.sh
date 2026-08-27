#!/usr/bin/env bash
# scripts/update-graph.sh
# Updates codebase AST knowledge graph using graphify.

set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." >/dev/null 2>&1 && pwd )"
cd "$DIR"

# Ensure Python Scripts directory is included in PATH if present
for p in "$LOCALAPPDATA/Programs/Python/Python312/Scripts" "/c/Users/${USER:-${USERNAME}}/AppData/Local/Programs/Python/Python312/Scripts" "/mnt/c/Users/${USER:-${USERNAME}}/AppData/Local/Programs/Python/Python312/Scripts"; do
  if [ -d "$p" ]; then
    export PATH="$p:$PATH"
  fi
done

if command -v graphify >/dev/null 2>&1; then
  graphify . --update --code-only "$@"
else
  node "$DIR/scripts/update-graph.js" "$@"
fi
