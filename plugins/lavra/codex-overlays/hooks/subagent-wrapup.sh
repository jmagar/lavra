#!/usr/bin/env bash
set -euo pipefail
input="$(cat)"
agent_id="$(jq -r '.agent_id // empty' <<<"$input")"
transcript="$(jq -r '.agent_transcript_path // empty' <<<"$input")"
continued="$(jq -r '.stop_hook_active // false' <<<"$input")"
[[ -n "$agent_id" && "$continued" != true && -f "$transcript" ]] || exit 0
bead_id="$(grep -oE -m1 'BEAD_ID: [A-Za-z0-9._-]+' "$transcript" 2>/dev/null | head -1 | sed 's/BEAD_ID: //' || true)"
[[ -n "$bead_id" ]] || exit 0
jq -cn --arg id "$bead_id" '{decision:"block",reason:("Before completing, record one useful discovery with bd comments add " + $id + " \"LEARNED: ...\", or record SKIP if there was no new insight.")}'
