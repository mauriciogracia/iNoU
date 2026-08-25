#!/usr/bin/env bash
# scripts/restart-web.sh
# Rebuilds and launches the iNoU Express Web Server daemon on the specified port (default: 3000).

set -e

PORT="${1:-3000}"
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "Building TypeScript backend and browser bundles..."
npm run build

echo "Starting iNoU Web Server on port $PORT..."
exec node bin/inuo.js web "$PORT"
