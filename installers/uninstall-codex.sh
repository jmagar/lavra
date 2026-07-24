#!/bin/bash
#
# Uninstall lavra plugin from Codex CLI
#
# What this removes:
#   - Hooks from .codex/hooks/ (or ~/.codex/hooks/)
#   - Skills from .codex/skills/ (or ~/.codex/skills/)
#   - Agents from .codex/agents/ (or ~/.codex/agents/)
#   - Hook configuration from .codex/hooks.json (or ~/.codex/hooks.json)
#
# What this PRESERVES:
#   - .beads/ directory and all data
#   - .lavra/ directory and knowledge.jsonl (your accumulated knowledge)
#   - Any beads you created
#   - codex_hooks feature flag in config.toml
#
# Usage:
#   Global uninstall:
#     ./uninstall-codex.sh                         # uninstalls from ~/.codex
#
#   Project-specific uninstall:
#     ./uninstall-codex.sh /path/to/your-project
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Default to ~/.codex if no argument provided
if [ $# -eq 0 ]; then
  TARGET="$HOME/.codex"
  GLOBAL_UNINSTALL=true
else
  TARGET="${1}"
  GLOBAL_UNINSTALL=false
fi

TARGET="$(cd "$TARGET" && pwd)"

echo "lavra plugin uninstaller (Codex CLI)"
if [ "$GLOBAL_UNINSTALL" = true ]; then
  echo "Target: $TARGET (global)"
else
  echo "Target: $TARGET (project-specific)"
fi
echo ""

REMOVED_COUNT=0

# Remove hooks
echo "[1/4] Removing hooks..."

if [ "$GLOBAL_UNINSTALL" = true ]; then
  HOOKS_DIR="$TARGET/hooks"
else
  HOOKS_DIR="$TARGET/.codex/hooks"
fi

if [ -d "$HOOKS_DIR" ]; then
  for hook in memory-capture.sh auto-recall.sh knowledge-db.sh provision-memory.sh recall.sh; do
    if [ -f "$HOOKS_DIR/$hook" ]; then
      rm "$HOOKS_DIR/$hook"
      echo "  - Removed $hook"
      REMOVED_COUNT=$((REMOVED_COUNT + 1))
    fi
  done
else
  echo "  - No hooks directory found"
fi

# Remove skills (only those with .lavra marker)
echo "[2/4] Removing skills..."

if [ "$GLOBAL_UNINSTALL" = true ]; then
  SKILLS_DIR="$TARGET/skills"
else
  SKILLS_DIR="$TARGET/.codex/skills"
fi

if [ -d "$SKILLS_DIR" ]; then
  for skill_dir in "$SKILLS_DIR"/*/; do
    if [ -d "$skill_dir" ]; then
      skill_name=$(basename "$skill_dir")
      if [ -L "$skill_dir" ]; then
        echo "  - Kept $skill_name (symlink, not ours)"
      elif [ -f "$skill_dir/.lavra" ]; then
        rm -rf "$skill_dir"
        echo "  - Removed $skill_name"
        REMOVED_COUNT=$((REMOVED_COUNT + 1))
      else
        echo "  - Kept $skill_name (not managed by this plugin)"
      fi
    fi
  done

  # Remove skills dir if empty
  if [ -d "$SKILLS_DIR" ] && [ -z "$(ls -A "$SKILLS_DIR" 2>/dev/null)" ]; then
    rmdir "$SKILLS_DIR"
    echo "  - Removed empty skills directory"
  fi
else
  echo "  - No skills directory found"
fi

# Remove agents (TOML files)
echo "[3/4] Removing agents..."

if [ "$GLOBAL_UNINSTALL" = true ]; then
  AGENTS_DIR="$TARGET/agents"
else
  AGENTS_DIR="$TARGET/.codex/agents"
fi

if [ -d "$AGENTS_DIR" ]; then
  # Remove known lavra agent TOML files
  LAVRA_AGENTS=(
    agent-native-reviewer ankane-readme-writer architecture-strategist
    best-practices-researcher bug-reproduction-validator code-simplicity-reviewer
    data-integrity-guardian data-migration-expert deployment-verification-agent
    design-implementation-reviewer design-iterator dhh-rails-reviewer
    every-style-editor figma-design-sync framework-docs-researcher
    git-history-analyzer goal-verifier julik-frontend-races-reviewer
    kieran-python-reviewer kieran-rails-reviewer kieran-typescript-reviewer
    learnings-researcher lint migration-drift-detector
    pattern-recognition-specialist performance-oracle pr-comment-resolver
    repo-research-analyst security-sentinel spec-flow-analyzer
  )

  for agent in "${LAVRA_AGENTS[@]}"; do
    if [ -f "$AGENTS_DIR/${agent}.toml" ]; then
      rm "$AGENTS_DIR/${agent}.toml"
      echo "  - Removed ${agent}.toml"
      REMOVED_COUNT=$((REMOVED_COUNT + 1))
    fi
  done

  # Remove agents dir if empty
  if [ -d "$AGENTS_DIR" ] && [ -z "$(ls -A "$AGENTS_DIR" 2>/dev/null)" ]; then
    rmdir "$AGENTS_DIR"
    echo "  - Removed empty agents directory"
  fi
else
  echo "  - No agents directory found"
fi

# Update hooks.json to remove hook configuration
echo "[4/4] Updating hooks.json..."

if [ "$GLOBAL_UNINSTALL" = true ]; then
  HOOKS_JSON="$TARGET/hooks.json"
else
  HOOKS_JSON="$TARGET/.codex/hooks.json"
fi

if [ -f "$HOOKS_JSON" ]; then
  if command -v jq &>/dev/null; then
    EXISTING=$(cat "$HOOKS_JSON")

    UPDATED=$(echo "$EXISTING" | jq '
      .hooks.SessionStart = [(.hooks.SessionStart // [])[] | select(.hooks[]?.command | contains("auto-recall") | not)] |
      if (.hooks.SessionStart | length) == 0 then del(.hooks.SessionStart) else . end |
      .hooks.PostToolUse = [(.hooks.PostToolUse // [])[] | select(.hooks[]?.command | contains("memory-capture") | not)] |
      if (.hooks.PostToolUse | length) == 0 then del(.hooks.PostToolUse) else . end |
      if (.hooks | to_entries | length) == 0 then del(.hooks) else . end
    ')

    echo "$UPDATED" > "$HOOKS_JSON"
    echo "  - Removed hook configuration from hooks.json"
    REMOVED_COUNT=$((REMOVED_COUNT + 1))
  else
    echo "  [!] jq not found -- manual hooks.json cleanup required"
  fi
else
  echo "  - No hooks.json found"
fi

# Summary
echo ""
if [ $REMOVED_COUNT -gt 0 ]; then
  echo "Uninstall complete. Removed $REMOVED_COUNT component(s)."
  echo ""
  echo "PRESERVED:"
  echo "  - .beads/ directory with all your data"
  echo "  - .lavra/ directory with accumulated knowledge and config"
  echo "  - codex_hooks feature flag in ~/.codex/config.toml"
  echo ""
  echo "To fully remove Lavra data:"
  echo "  rm -rf $TARGET/.lavra/"
  echo ""
  echo "Restart Codex CLI to complete uninstallation."
else
  echo "Nothing to uninstall. lavra may not be installed here."
fi
