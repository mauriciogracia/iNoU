#!/usr/bin/env bash
# inou.sh – Platform-Agnostic iNoU Launcher
# Supports Linux, macOS, WSL, Git Bash, MSYS, and Windows.

set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

# Detect Node.js runtime across environments
find_node() {
  for n in node node.exe /mnt/c/Program\ Files/nodejs/node.exe /c/Program\ Files/nodejs/node.exe; do
    if command -v "$n" >/dev/null 2>&1; then
      command -v "$n"
      return 0
    fi
  done
  return 1
}

NODE_BIN="$(find_node || true)"

if [ -z "$NODE_BIN" ]; then
  echo "Error: Node.js runtime not found in PATH or standard installation directories." >&2
  echo "Please install Node.js (v18+) to run iNoU." >&2
  exit 1
fi

cd "$DIR"

# Build dist if missing
if [ ! -d "dist" ] || [ ! -f "dist/cli/shell.js" ]; then
  if command -v npm >/dev/null 2>&1; then
    npm run build >/dev/null 2>&1 || true
  elif command -v npm.cmd >/dev/null 2>&1; then
    npm.cmd run build >/dev/null 2>&1 || true
  fi
fi

if [ $# -eq 0 ]; then
  # Interactive mode: launch ASCII Web Client connected to Express Web Server
  exec "$NODE_BIN" dist/cli/asciiWebClient.js
else
  # Command mode: execute CLI command directly
  exec "$NODE_BIN" bin/inuo.js "$@"
fi

