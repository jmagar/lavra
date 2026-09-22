#!/usr/bin/env bash
set -euo pipefail
root="${BEADS_MARKETPLACE_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
exec node "$root/scripts/codex-install.cjs" install "$@"
