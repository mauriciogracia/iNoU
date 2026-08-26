#!/usr/bin/env bash
# ==============================================================================
# idwc.sh – Root Launcher for iNoU Docker Web Client
# Starts Docker container stack and launches browser to the Docker web UI.
# ==============================================================================
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec bash "$DIR/scripts/idwc.sh" "$@"
