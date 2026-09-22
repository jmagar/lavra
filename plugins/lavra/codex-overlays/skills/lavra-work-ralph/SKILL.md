---
name: lavra-work-ralph
description: Run a bounded iterative Codex implementation loop over ready beads with verification between steps.
---

# Bounded Codex work loop

Run `bd prime` and inspect `bd ready`. Choose one independent, scoped issue at a time, claim it, implement it, run its focused checks, and inspect the diff before closing it. Repeat only while the user-requested objective still has ready work and the session has capacity. Use Codex subagents for bounded independent pieces when available; give them explicit file ownership and acceptance criteria. Never request a permission bypass mode from a subagent. Use the current sandbox and approval policy.

Stop the loop on an unresolved dependency, failed verification, or a needed user decision. Record the issue state and report the exact blocker. Follow the user's Git publication instructions.
