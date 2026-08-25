#!/usr/bin/env bash
# scripts/run-tests.sh
# Builds TypeScript and executes the full iNoU unit test suite.

set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." >/dev/null 2>&1 && pwd )"
cd "$DIR"

find_node() {
  for n in node node.exe /mnt/c/Program\ Files/nodejs/node.exe /c/Program\ Files/nodejs/node.exe; do
    if command -v "$n" >/dev/null 2>&1; then
      command -v "$n"
      return 0
    fi
  done
  return 1
}

NODE_BIN="$(find_node || echo node)"

echo "=== [1/2] Building TypeScript ==="
if command -v npm >/dev/null 2>&1; then
  npm run build
elif command -v npm.cmd >/dev/null 2>&1; then
  npm.cmd run build
else
  "$NODE_BIN" ./node_modules/typescript/bin/tsc
fi

echo ""
echo "=== [2/2] Running Unit Tests ==="
"$NODE_BIN" --test tests/*.test.js "$@"
