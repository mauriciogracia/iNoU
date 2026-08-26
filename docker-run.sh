#!/usr/bin/env bash
# ==============================================================================
# docker-run.sh – Root Launcher for iNoU Local Docker Containers
# ==============================================================================
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec bash "$DIR/scripts/docker-run.sh" "$@"
