#!/usr/bin/env bash
# scripts/setup-local-llm.sh
# Automated Local SLM setup script for Ollama + Qwen 2.5.
#
# Usage:
#   ./scripts/setup-local-llm.sh

set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." >/dev/null 2>&1 && pwd )"
cd "$DIR"

# Ensure TypeScript build is current
npm run build --silent

node scripts/setup-local-llm.js "$@"
