---
title: Platform Support
description: Installation and setup for Claude Code, Codex, OpenCode, Gemini CLI, and Cortex Code
order: 4
---

# Multi-Platform Support

Lavra supports Claude Code, Codex, OpenCode, Gemini CLI, and Cortex Code. Codex receives APM-generated agents and skills with Codex-specific workflow and hook overlays.

## What works where

| Feature | Claude Code | Codex | OpenCode | Gemini CLI | Cortex Code |
|---------|-------------|-------|----------|------------|-------------|
| Memory capture | ✓ | ✓ | ✓ | ✓ | ✓ |
| Auto-recall | ✓ | ✓ | ✓ | ✓ | ✓ |
| Commands as skills | ✓ | ✓ | ✓ | ✓ | ✓ |
| Agents | ✓ | ✓ | ✓ | ✓ | ✓ |
| Skills | ✓ | ✓ | ✓ | ✓ | ✓ |
| Context7 MCP | ✓ | ✓ | ✓ | ✓ | manual |

## Codex

```bash
npx @lavralabs/lavra@latest --codex --yes           # current project
npx @lavralabs/lavra@latest --codex --global --yes  # user scope
npx @lavralabs/lavra@latest --codex --uninstall     # current project
```

The installer deploys 30 agent definitions to `.codex/agents/`, 45 skills to `.agents/skills/`, three supported hooks to `.codex/hooks.json`, and Context7 to `.codex/config.toml`. Codex reads a project's `.codex/config.toml` after the project is trusted. It records owned files in `.codex/lavra-install.json`; uninstall preserves user files and modified Lavra files. Codex commands are exposed as skills. The `every-style-editor` agent is read-only and provides suggested edits because Codex cannot enforce its Claude tool allowlist.

For source development, install [Microsoft APM](https://microsoft.github.io/apm/) 0.31.0 and run `apm run build-codex`. The build applies native Codex overlays after APM conversion and CI rejects generated drift. A fresh install needs the beads CLI, `jq`, and `sqlite3` for the memory workflow. Restart Codex after installing so it discovers the new agents, skills, hooks, and MCP server.

## Claude Code

```bash
npx @lavralabs/lavra@latest --claude       # local project
npx @lavralabs/lavra@latest --global       # all projects (~/.claude/)
```

## OpenCode

```bash
npx @lavralabs/lavra@latest --opencode           # local project
npx @lavralabs/lavra@latest --opencode --yes     # skip model selection prompts
```

The installer copies a TypeScript plugin to `.opencode/plugins/lavra/` (local) or `~/.config/opencode/plugins/lavra/` (global) and installs dependencies with Bun. Commands, agents, and skills are converted to OpenCode format automatically.

You'll be prompted to choose which models to map to each tier (haiku/sonnet/opus). See [Model Selection](/docs/model-selection) for details.

**Verify:**
```bash
ls -la .opencode/plugins/lavra/plugin.ts
ls -la .opencode/hooks/
```

Check plugin is loading (look for these in OpenCode output):
```
[lavra] Plugin loaded successfully
[lavra] session.created hook triggered
```

## Gemini CLI

```bash
npx @lavralabs/lavra@latest --gemini       # local project
```

The installer converts commands to `.toml` format and copies commands, agents, skills, and hooks to `.gemini/` (local) or `~/.config/gemini/` (global). Memory capture and auto-recall work via the same stdin/stdout JSON protocol as Claude Code. Context7 MCP is configured automatically in `~/.config/gemini/settings.json`.

**Verify:**
```bash
ls -la .gemini/hooks/
cat gemini-extension.json | jq '.hooks'
```

## Cortex Code

```bash
bash /path/to/lavra/installers/install-cortex.sh
```

The installer copies hooks to `.cortex/hooks/` (local) or `~/.snowflake/cortex/hooks/` (global). Commands, agents, and skills use `.md` format (same as Claude Code). Hooks are configured via `hooks.json`.

Context7 MCP is not installed automatically. To enable framework documentation lookup, add it manually to `~/.snowflake/cortex/mcp.json`:

```json
{
  "mcpServers": {
    "context7": {
      "url": "https://mcp.context7.com/mcp",
      "type": "http"
    }
  }
}
```

> Cortex Code also reads `.claude/` directories for compatibility, but native `.cortex/` paths are preferred.

## See Also

- [Model Selection](/docs/model-selection) — customize which models map to each tier in OpenCode
- [Cost Optimization](/docs/cost) — how Lavra assigns agents to model tiers
