#!/usr/bin/env bash

# Build Lavra's Codex distribution through Microsoft Agent Package Manager.
#
# Claude commands have no native Codex target in APM. Before invoking APM, this
# script promotes each unique command to a portable skill in an isolated copy of
# the plugin. APM then performs every provider-specific conversion and produces
# the agents, skills, and hooks committed under plugins/lavra/codex/.

set -euo pipefail

umask 077

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLUGIN_SOURCE="$REPO_ROOT/plugins/lavra"
OUTPUT_DIR="$PLUGIN_SOURCE/codex"
EXPECTED_LOSSY_AGENT="every-style-editor.md"

if ! command -v apm >/dev/null 2>&1; then
  echo "Error: Microsoft Agent Package Manager (apm) is required." >&2
  echo "Install it from https://microsoft.github.io/apm/." >&2
  exit 1
fi

BUILD_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/lavra-codex-build.XXXXXX")"
trap 'rm -rf "$BUILD_ROOT"' EXIT

STAGED_PLUGIN="$BUILD_ROOT/lavra"
CONSUMER="$BUILD_ROOT/consumer"
APM_LOG="$BUILD_ROOT/apm-install.log"

mkdir -p "$STAGED_PLUGIN" "$CONSUMER"

# Stage the package without previously generated Codex output.
rsync -a --exclude codex/ "$PLUGIN_SOURCE/" "$STAGED_PLUGIN/"

# APM's Claude-plugin adapter discovers first-level skill directories. Flatten
# Lavra's optional skill packages only in the isolated staging copy so they are
# included in the Codex distribution without changing their canonical layout.
if [ -d "$STAGED_PLUGIN/skills/optional" ]; then
  for optional_skill in "$STAGED_PLUGIN"/skills/optional/*; do
    [ -d "$optional_skill" ] || continue
    cp -R "$optional_skill" "$STAGED_PLUGIN/skills/$(basename "$optional_skill")"
  done
  rm -rf "$STAGED_PLUGIN/skills/optional"
fi

# Codex does not support APM's command primitive. Promote command procedures to
# skills so Codex can discover and invoke them. A native skill with the same
# name takes precedence over its command counterpart.
while IFS= read -r command_file; do
  command_name="$(basename "$command_file" .md)"
  skill_dir="$STAGED_PLUGIN/skills/$command_name"

  if [ -e "$skill_dir/SKILL.md" ]; then
    continue
  fi

  mkdir -p "$skill_dir"
  cp "$command_file" "$skill_dir/SKILL.md"

  perl -0pi -e 's/\A(---\n.*?\n---\n)/$1\n> Codex compatibility: in this skill, `$ARGUMENTS` means the user request and any arguments supplied when the skill is invoked.\n/' \
    "$skill_dir/SKILL.md"
done < <(find "$STAGED_PLUGIN/commands" -type f -name '*.md' | sort)

# APM routes skill files but intentionally leaves their prose untouched. Rewrite
# provider-specific paths in the staging copy so the generated Codex skills
# refer to the locations APM actually deploys.
while IFS= read -r markdown_file; do
  perl -pi -e '
    s#~/.claude/skills/#~/.agents/skills/#g;
    s#\.claude/skills/#.agents/skills/#g;
    s#~/.claude/agents/#~/.codex/agents/#g;
    s#\.claude/agents/#.codex/agents/#g;
    s#\.claude/hooks/#.codex/hooks/lavra/hooks/#g;
    s#\.claude/commands/#.agents/skills/#g;
  ' "$markdown_file"
done < <(find "$STAGED_PLUGIN/skills" -type f -name '*.md' | sort)

(
  cd "$CONSUMER"
  git init -q
  apm init --yes --target codex >/dev/null
  apm install "$STAGED_PLUGIN" --target codex --no-policy --no-audit 2>&1 | tee "$APM_LOG"
  apm audit --ci
)

# APM 0.31 cannot preserve Claude tool allowlists in Codex agent TOML. Lavra has
# one known occurrence. Keep that limitation explicit and reject any new lossy
# agent conversion until it is reviewed.
lossy_agents="$({
  sed -nE "s/.*Codex agent ([^:]+): frontmatter field 'tools'.*/\1/p" "$APM_LOG"
} | sort -u)"

if [ "$lossy_agents" != "$EXPECTED_LOSSY_AGENT" ]; then
  echo "Error: unexpected Codex agent conversion diagnostics." >&2
  printf 'Lossy agents: %s\n' "${lossy_agents:-none}" >&2
  exit 1
fi

GENERATED_CODEX="$CONSUMER/.codex"
GENERATED_SKILLS="$CONSUMER/.agents/skills"

if [ ! -d "$GENERATED_CODEX/agents" ] || [ ! -d "$GENERATED_SKILLS" ]; then
  echo "Error: APM did not generate the expected Codex agents and skills." >&2
  exit 1
fi

rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

cp -R "$GENERATED_CODEX" "$OUTPUT_DIR/.codex"
mkdir -p "$OUTPUT_DIR/.agents"
cp -R "$GENERATED_SKILLS" "$OUTPUT_DIR/.agents/skills"

# APM handles routing; Codex-native overlays preserve provider semantics that
# its Claude converter cannot express (workflow APIs, hooks, agent policies).
python3 "$REPO_ROOT/scripts/codex-postprocess.py" "$OUTPUT_DIR"

agent_count="$(find "$OUTPUT_DIR/.codex/agents" -type f -name '*.toml' | wc -l | tr -d ' ')"
skill_count="$(find "$OUTPUT_DIR/.agents/skills" -type f -name 'SKILL.md' | wc -l | tr -d ' ')"
hook_script_count="$(find "$OUTPUT_DIR/.codex/hooks" -type f | wc -l | tr -d ' ')"

source_agent_count="$(find "$PLUGIN_SOURCE/agents" -type f -name '*.md' | wc -l | tr -d ' ')"
source_skill_count="$(find "$STAGED_PLUGIN/skills" -type f -name 'SKILL.md' | wc -l | tr -d ' ')"

if [ "$agent_count" -ne "$source_agent_count" ] || [ "$skill_count" -ne "$source_skill_count" ]; then
  echo "Error: generated artifact counts changed unexpectedly." >&2
  echo "Agents: $agent_count (expected $source_agent_count)" >&2
  echo "Skills: $skill_count (expected $source_skill_count)" >&2
  exit 1
fi

echo "Built Codex artifacts with $(apm --version | head -n 1):"
echo "  Agents: $agent_count"
echo "  Skills: $skill_count"
echo "  Hook files: $hook_script_count"
echo "  Every style editor is read-only in Codex because APM cannot preserve its Claude tool allowlist."
