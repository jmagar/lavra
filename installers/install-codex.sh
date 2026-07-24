#!/bin/bash
#
# Install lavra plugin for Codex CLI
#
# What this installs:
#   - Memory capture and auto-recall hooks
#   - Knowledge store (.lavra/memory/knowledge.jsonl)
#   - Skills (converted from commands + native skills)
#   - Agents (TOML format)
#   - Enables codex_hooks feature flag in config.toml
#
# Usage:
#   Called by install.sh -codex [target]
#

set -euo pipefail

# Security: Set restrictive umask
umask 077

# Use marketplace root from router if available, else derive from script location
if [ -n "${BEADS_MARKETPLACE_ROOT:-}" ]; then
  SCRIPT_DIR="$BEADS_MARKETPLACE_ROOT"
else
  SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
fi

PLUGIN_DIR="$SCRIPT_DIR/plugins/lavra"

# Source shared functions
INSTALLER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$INSTALLER_DIR/shared-functions.sh"

# Parse flags
AUTO_YES=false
GLOBAL_INSTALL=false
NO_BANNER=false
POSITIONAL_ARGS=()

for arg in "$@"; do
  case "$arg" in
    --yes|-y)      AUTO_YES=true ;;
    --global)      GLOBAL_INSTALL=true ;;
    --no-banner)   NO_BANNER=true ;;
    --*)           ;;  # ignore unknown flags
    *)             POSITIONAL_ARGS+=("$arg") ;;
  esac
done

# Resolve target
if [ "$GLOBAL_INSTALL" = true ]; then
  TARGET="$HOME/.codex"
elif [ ${#POSITIONAL_ARGS[@]} -gt 0 ]; then
  TARGET="${POSITIONAL_ARGS[0]}"
else
  TARGET="$HOME/.codex"
  GLOBAL_INSTALL=true
fi

# Resolve target to absolute path
TARGET="$(resolve_target_dir "$TARGET")"

# Detect if user is trying to install into the plugin directory itself
if [[ "$TARGET" == "$SCRIPT_DIR" || "$TARGET" == "$PLUGIN_DIR" ]]; then
  echo "[!] Error: Cannot install plugin into itself."
  echo ""
  echo "    You're trying to install into: $TARGET"
  echo "    This is the plugin source directory, not a project."
  echo ""
  echo "    Usage:"
  echo "      ./install.sh -codex                      # global install to ~/.codex"
  echo "      ./install.sh -codex /path/to/project     # project-specific install"
  echo ""
  exit 1
fi

# Verify plugin directory exists
if [ ! -d "$PLUGIN_DIR" ]; then
  echo "[!] Error: Plugin directory not found at $PLUGIN_DIR"
  echo "    Expected marketplace structure with plugins/lavra/"
  exit 1
fi

LAVRA_GLOBAL_DEFAULT="$HOME/.codex"
LAVRA_HOOKS_ARE_GLOBAL=false
[ "$NO_BANNER" = false ] && print_banner "Codex CLI" "0.7.4"
echo "  Target: $TARGET"
if [ "$GLOBAL_INSTALL" = true ]; then
  echo "  Type: Global installation"
else
  echo "  Type: Project-specific installation"
fi
echo ""

# Security: Verify target is not a symlink
if [[ -L "$TARGET" ]]; then
  echo "[!] Error: Target directory is a symlink: $TARGET"
  echo "    This is a security risk. Please use a real directory."
  exit 1
fi

# Security: Verify ownership
TARGET_OWNER=$(stat -f%Su "$TARGET" 2>/dev/null || stat -c%U "$TARGET" 2>/dev/null)
if [[ "$TARGET_OWNER" != "$USER" ]]; then
  echo "[!] Error: Target directory is owned by a different user"
  echo "    Owner: $TARGET_OWNER"
  echo "    Current user: $USER"
  exit 1
fi

# Global install: warn about memory features and confirm
if [ "$GLOBAL_INSTALL" = true ] && [ "$AUTO_YES" = false ]; then
  echo "[!] Note: Global install provides skills and agents everywhere,"
  echo "    but memory features (auto-recall, knowledge capture) require per-project"
  echo "    installation. You'll be prompted automatically in projects that use beads."
  echo ""
  read -r -p "    Continue? [Y/n] " response
  case "$response" in
    [nN]|[nN][oO])
      echo "Aborted."
      exit 0
      ;;
  esac
  echo ""
fi

# [1/8] Check for bd (skip for global install)
if [ "$GLOBAL_INSTALL" = true ]; then
  echo "[1/8] Skipping bd check (global install)"
  echo "[2/8] Skipping .beads init (global install)"
else
  if ! command -v bd &>/dev/null; then
    echo "[!] beads CLI (bd) not found."
    echo ""
    echo "    Install it first:"
    echo "      macOS:  brew install steveyegge/beads/bd"
    echo "      npm:    npm install -g @beads/bd"
    echo "      go:     go install github.com/steveyegge/beads/cmd/bd@latest"
    echo ""
    exit 1
  fi

  echo "[1/8] bd found: $(which bd)"

  # [2/8] Initialize .beads if needed
  if [ ! -d "$TARGET/.beads" ]; then
    echo "[2/8] Initializing .beads..."
    (cd "$TARGET" && bd init)
  else
    echo "[2/8] .beads already exists"
  fi
fi

# [3/8] Set up memory directory and recall script (skip for global install)
if [ "$GLOBAL_INSTALL" = true ]; then
  echo "[3/8] Skipping memory system (global install)"
else
  echo "[3/8] Setting up memory system..."

  PROVISION_SCRIPT="$PLUGIN_DIR/hooks/provision-memory.sh"

  if [ -f "$PROVISION_SCRIPT" ]; then
    source "$PROVISION_SCRIPT"
    migrate_beads_to_lavra "$TARGET"
    provision_memory_dir "$TARGET" "$PLUGIN_DIR/hooks"
    echo "  - Memory system configured"
  fi
fi

# [4/8] Install hooks
if [ "$GLOBAL_INSTALL" = true ]; then
  echo "[4/8] Installing global hooks..."

  mkdir -p "$TARGET/hooks"

  for hook in auto-recall.sh memory-capture.sh knowledge-db.sh provision-memory.sh recall.sh; do
    if [ -f "$PLUGIN_DIR/hooks/$hook" ]; then
      cp "$PLUGIN_DIR/hooks/$hook" "$TARGET/hooks/$hook"
      chmod +x "$TARGET/hooks/$hook"
    fi
  done

  echo "  - Installed hook scripts"
else
  echo "[4/8] Installing hooks..."

  HOOKS_DIR="$TARGET/.codex/hooks"
  create_dir_with_symlink_handling "$HOOKS_DIR"

  for hook in memory-capture.sh auto-recall.sh knowledge-db.sh provision-memory.sh; do
    cp "$PLUGIN_DIR/hooks/$hook" "$HOOKS_DIR/$hook"
    chmod +x "$HOOKS_DIR/$hook"
    echo "  - Installed $hook"
  done
fi

# Detect if skills/agents are already installed globally
GLOBALLY_INSTALLED=false

if [ "$GLOBAL_INSTALL" = false ] && [ -d "$HOME/.codex/skills/lavra-plan" ]; then
  GLOBALLY_INSTALLED=true
fi

# [5/8] Install skills
echo "[5/8] Installing skills..."

if [ "$GLOBALLY_INSTALLED" = true ]; then
  SKILL_COUNT=0
  echo "  - Already installed globally -- skipping"
else
  if [ "$GLOBAL_INSTALL" = true ]; then
    SKILLS_DIR="$TARGET/skills"
  else
    SKILLS_DIR="$TARGET/.codex/skills"
  fi
  mkdir -p "$SKILLS_DIR"

  SKILL_COUNT=0
  SKILL_SKIPPED=0

  if [ -d "$PLUGIN_DIR/codex/skills" ]; then
    for skill_dir in "$PLUGIN_DIR/codex/skills"/*/; do
      if [ -d "$skill_dir" ]; then
        skill_name=$(basename "$skill_dir")

        if [ -L "$SKILLS_DIR/$skill_name" ]; then
          echo "  - Skipped $skill_name (symlink, not ours)"
          SKILL_SKIPPED=$((SKILL_SKIPPED + 1))
          continue
        elif [ -d "$SKILLS_DIR/$skill_name" ]; then
          if [ -f "$SKILLS_DIR/$skill_name/.lavra" ]; then
            rm -rf "$SKILLS_DIR/$skill_name"
          else
            echo "  - Skipped $skill_name (already exists, not ours)"
            SKILL_SKIPPED=$((SKILL_SKIPPED + 1))
            continue
          fi
        fi

        cp -r "$skill_dir" "$SKILLS_DIR/$skill_name"
        touch "$SKILLS_DIR/$skill_name/.lavra"
        SKILL_COUNT=$((SKILL_COUNT + 1))
      fi
    done
  fi

  # Also install native lavra skills (from plugins/lavra/skills/)
  if [ -d "$PLUGIN_DIR/skills" ]; then
    for skill_dir in "$PLUGIN_DIR/skills"/*/; do
      if [ -d "$skill_dir" ] && [ -f "$skill_dir/SKILL.md" ]; then
        skill_name=$(basename "$skill_dir")
        [ "$skill_name" = "optional" ] && continue

        if [ -L "$SKILLS_DIR/$skill_name" ]; then
          SKILL_SKIPPED=$((SKILL_SKIPPED + 1))
          continue
        elif [ -d "$SKILLS_DIR/$skill_name" ]; then
          if [ -f "$SKILLS_DIR/$skill_name/.lavra" ]; then
            rm -rf "$SKILLS_DIR/$skill_name"
          else
            SKILL_SKIPPED=$((SKILL_SKIPPED + 1))
            continue
          fi
        fi

        cp -r "$skill_dir" "$SKILLS_DIR/$skill_name"
        touch "$SKILLS_DIR/$skill_name/.lavra"
        SKILL_COUNT=$((SKILL_COUNT + 1))
      fi
    done
  fi

  echo "  - Installed $SKILL_COUNT skills"
  if [ "${SKILL_SKIPPED:-0}" -gt 0 ]; then
    echo "  - Skipped $SKILL_SKIPPED existing skill(s) not managed by this plugin"
  fi
fi

# [6/8] Install agents
echo "[6/8] Installing agents..."

if [ "$GLOBALLY_INSTALLED" = true ]; then
  AGENT_COUNT=0
  echo "  - Already installed globally -- skipping"
else
  if [ "$GLOBAL_INSTALL" = true ]; then
    AGENTS_DIR="$TARGET/agents"
  else
    AGENTS_DIR="$TARGET/.codex/agents"
  fi
  mkdir -p "$AGENTS_DIR"

  AGENT_COUNT=0

  if [ -d "$PLUGIN_DIR/codex/agents" ]; then
    for agent in "$PLUGIN_DIR/codex/agents"/*.toml; do
      if [ -f "$agent" ]; then
        cp "$agent" "$AGENTS_DIR/$(basename "$agent")"
        AGENT_COUNT=$((AGENT_COUNT + 1))
      fi
    done
  fi

  echo "  - Installed $AGENT_COUNT agents"
fi

# [7/8] Configure hooks.json
echo "[7/8] Configuring hooks.json..."

if [ "$GLOBAL_INSTALL" = true ]; then
  HOOKS_JSON="$TARGET/hooks.json"
  HOOK_PREFIX="bash ~/.codex/hooks"
else
  HOOKS_JSON="$TARGET/.codex/hooks.json"
  HOOK_PREFIX="bash .codex/hooks"
fi

if [ -f "$HOOKS_JSON" ]; then
  if command -v jq &>/dev/null; then
    EXISTING=$(cat "$HOOKS_JSON")

    UPDATED=$(echo "$EXISTING" | jq \
      --arg recall "$HOOK_PREFIX/auto-recall.sh" \
      --arg capture "$HOOK_PREFIX/memory-capture.sh" '
      .hooks.SessionStart = (
        [(.hooks.SessionStart // [])[] | select(.hooks[]?.command | contains("auto-recall") | not)] +
        [{"hooks":[{"type":"command","command":$recall,"timeout":30}]}]
      ) |
      .hooks.PostToolUse = (
        [(.hooks.PostToolUse // [])[] | select(.hooks[]?.command | contains("memory-capture") | not)] +
        [{"matcher":"Bash","hooks":[{"type":"command","command":$capture,"timeout":10}]}]
      )
    ')
    echo "$UPDATED" > "$HOOKS_JSON"
    echo "  - Merged hooks into existing hooks.json"
  else
    echo "  [!] jq not found -- manual hooks.json setup required"
  fi
else
  cat > "$HOOKS_JSON" << HOOKS_EOF
{
  "hooks": {
    "SessionStart": [
      {"hooks": [{"type": "command", "command": "$HOOK_PREFIX/auto-recall.sh", "timeout": 30}]}
    ],
    "PostToolUse": [
      {"matcher": "Bash", "hooks": [{"type": "command", "command": "$HOOK_PREFIX/memory-capture.sh", "timeout": 10}]}
    ]
  }
}
HOOKS_EOF
  echo "  - Created hooks.json"
fi

# [8/8] Enable codex_hooks feature flag in config.toml
echo "[8/8] Enabling codex_hooks feature flag..."

CONFIG_TOML="$HOME/.codex/config.toml"

if [ -f "$CONFIG_TOML" ]; then
  if grep -q 'codex_hooks' "$CONFIG_TOML"; then
    # Already has the key -- make sure it's true
    sed -i 's/codex_hooks *= *false/codex_hooks = true/' "$CONFIG_TOML"
    echo "  - codex_hooks already configured"
  elif grep -q '^\[features\]' "$CONFIG_TOML"; then
    # [features] section exists, append to it
    sed -i '/^\[features\]/a codex_hooks = true' "$CONFIG_TOML"
    echo "  - Added codex_hooks = true to existing [features] section"
  else
    # No [features] section -- append one
    printf '\n[features]\ncodex_hooks = true\n' >> "$CONFIG_TOML"
    echo "  - Added [features] section with codex_hooks = true"
  fi
else
  mkdir -p "$(dirname "$CONFIG_TOML")"
  cat > "$CONFIG_TOML" << TOML_EOF
[features]
codex_hooks = true
TOML_EOF
  echo "  - Created config.toml with codex_hooks = true"
fi

# Summary
echo ""
echo "Done."
echo ""

if [ "$GLOBAL_INSTALL" = true ]; then
  echo "$SKILL_COUNT skills and $AGENT_COUNT agents are now available in all Codex CLI sessions."
  echo ""
  echo "For beads integration (memory system + hooks):"
  echo "  bunx @lavralabs/lavra@latest --codex /path/to/your-project"
  echo ""
else
  echo "$SKILL_COUNT skills and $AGENT_COUNT agents installed."
  echo ""
  echo "Main workflow:"
  echo "  /skills:lavra-design <feature description>   Plan a feature end-to-end before writing code"
  echo "  /skills:lavra-work <bead id>                 Execute work on a bead"
  echo "  /skills:lavra-qa                             Browser-based QA verification (web apps)"
  echo "  /skills:lavra-ship                           Finalize, open PR, close beads"
  echo ""
fi

echo "Restart Codex CLI to load the plugin."
echo ""

if [ "$GLOBAL_INSTALL" = false ]; then
  echo "To uninstall: bunx @lavralabs/lavra@latest --uninstall"
fi
