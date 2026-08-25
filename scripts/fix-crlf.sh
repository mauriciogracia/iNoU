#!/usr/bin/env bash
# iNoU CRLF -> LF normalizer
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
node "$SCRIPT_DIR/fix-crlf.js"
