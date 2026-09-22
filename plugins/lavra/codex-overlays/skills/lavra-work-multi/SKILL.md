---
name: lavra-work-multi
description: Coordinate several independent beads with Codex subagents and integrate their results.
---

# Work multiple beads in Codex

Run `bd prime`, inspect `bd ready`, and read every selected issue with `bd show`. Identify dependencies and avoid running dependent work concurrently. Claim the parent or coordination issue before editing.

If Codex collaboration tools are available, spawn one worker per independent, bounded issue. Give each worker an explicit issue id, file ownership, acceptance criteria, and verification command. Tell workers they share a workspace and must preserve each other's edits. Use at most the available concurrency. Wait for each worker, inspect its result and diff, then integrate and test the combined change. If subagents are unavailable, perform the work sequentially.

Use `bd update`, `bd dep add`, and child issues to track state. Capture discoveries as bead comments. Close only verified issues; report blocked or unfinished issues precisely. Follow the user's current Git publication instructions.
