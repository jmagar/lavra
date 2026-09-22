#!/usr/bin/env bash
set -euo pipefail
candidate="${1:-.}"
[[ -d "$candidate" ]] || candidate="."
dir="$(cd "$candidate" && pwd -P)"
while :; do
  if [[ -d "$dir/.beads" || -d "$dir/.lavra" || -e "$dir/.git" || -f "$dir/.codex/lavra-install.json" ]]; then
    printf '%s\n' "$dir"
    exit 0
  fi
  [[ "$dir" == / ]] && break
  dir="$(dirname "$dir")"
done
cd "$candidate" && pwd -P
