#!/usr/bin/env bash
# Root launcher for iNoU Cloud Deployment
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "$SCRIPT_DIR/scripts/deploy-inou.sh" "$@"
