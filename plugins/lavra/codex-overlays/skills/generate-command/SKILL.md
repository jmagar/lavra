---
name: generate-command
description: Create a reusable Codex skill from a requested workflow.
---

# Create a Codex skill

Ask what behavior and trigger the user needs only if it cannot be inferred. Create a directory under `.agents/skills/<name>/` with a focused `SKILL.md` frontmatter name and description. Keep the entrypoint concise and move long reference material into `references/`. Use the tools available in the current Codex task, such as shell, patch, web search, and subagents when appropriate; use Codex-native tool names in the skill. Verify the skill's links, triggering description, and a representative invocation before reporting it complete.
