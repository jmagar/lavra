---
name: lavra-work-single
description: Implement one ready beads issue in Codex, verify its acceptance criteria, and record the result.
---

# Work one bead in Codex

Run `bd prime`, then `bd ready` and `bd show <id>` to select and inspect the issue. Claim it with `bd update <id> --claim` before changing files. Respect the repository's `AGENTS.md` and the user's Git publication instructions.

Break the issue into concrete steps in the issue description or notes with `bd update`; use `bd create --parent=<id>` for independently trackable follow-up work.

Inspect the affected code and tests. Make the smallest coherent change, run focused tests, review the diff, and capture relevant discoveries with `bd comments add <id> "LEARNED: ..."`. Ask for an available reviewer subagent only when the task benefits from independent review. Give it a bounded scope and keep the parent responsible for integration. Close the bead only after its acceptance criteria are met. Report the changed files, test evidence, remaining risks, and Git state.
