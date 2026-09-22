---
name: lavra-ship
description: Verify a completed bead, prepare its Git handoff, and report release readiness in Codex.
---

# Ship a bead from Codex

Read the bead's acceptance criteria and current Git state. Run the focused tests and required project checks, inspect the final diff, and verify no unrelated files are included. If a goal verifier subagent is available, give it the bead id and criteria for an independent read-only assessment. Otherwise verify the criteria directly.

Close the bead only when the evidence supports completion. Commit or publish only within the user's current authorization and repository policy. Report commit, branch, checks, remaining risks, and any human merge or deployment step separately.
