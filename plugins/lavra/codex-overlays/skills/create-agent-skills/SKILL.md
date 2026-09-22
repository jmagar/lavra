---
name: create-agent-skills
description: Create or improve a Codex skill with a concise entrypoint and tested references.
---

# Create a Codex skill

Define the exact trigger, inputs, procedure, and expected output. Add `.agents/skills/<name>/SKILL.md` with frontmatter `name` and a description that says when to use the skill. Put long examples, templates, and background material in `references/`, `assets/`, or `scripts/`. Use Codex-native tools and paths. Store credentials in an operator-owned secret store; do not put them in a skill or project file. Validate referenced paths, run any bundled scripts in a scratch directory, and test a representative invocation. Report where the skill was installed and how it is triggered.
