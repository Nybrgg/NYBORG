#!/bin/bash
# Installs playwright-cli in Claude Code cloud sessions (the container is fresh each time).
set -euo pipefail
[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0
command -v playwright-cli >/dev/null 2>&1 || npm install -g @playwright/cli@latest >/dev/null 2>&1
