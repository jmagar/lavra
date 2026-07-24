---
name: lavra-quick
description: Fast-track simple bugs/config/refactors with minimal plan (1-3 tasks) then execution. Auto-escalates if scope signals detected (multi-file, cross-bead deps, architectural choices). Maintains knowledge capture throughout.
---

# lavra-quick

Fast-track small tasks with an abbreviated plan and immediate execution. Skips brainstorm and deep research phases, runs a MINIMAL plan (1-3 child tasks), then transitions directly to execution. Still captures knowledge throughout.

## Overview

This skill is optimized for quick wins and small, well-understood work. It provides fast planning and immediate execution while maintaining knowledge capture and quality standards.

## When to Use

Use for:
- Simple bug fixes
- Config changes
- Small refactors
- Adding a field
- Writing a utility function
- Small improvements

Do NOT use for:
- Complex features
- Architectural changes
- Tasks with unclear requirements
- Work that needs extensive research

## Input

Accepts either a bead ID or a task description:

```bash
/lavra-quick "Fix typo in welcome email"
/lavra-quick BD-042
```

## Determining Input Type

Check if the argument matches a bead ID pattern:
- Pattern: lowercase alphanumeric segments separated by hyphens
- Examples: `fix-auth`, `beads-123`

**If bead ID pattern:**
1. Load: `bd show {BEAD_ID} --json`
2. If exists: extract title and description, announce "Quick-tracking bead #$ARGUMENTS: {title}"
3. If not found: report error and stop

**If task description:**
1. Create a bead: `bd create --title="{concise title}" --description="{description}" --type=task`
2. Capture the new bead ID

**If empty:**
Ask: "What small task do you want to quick-track? Provide a bead ID or describe the task."

## Process

### Step 1: Quick Context Scan

Run in parallel:

```bash
# Recall relevant knowledge
.lavra/memory/recall.sh "{keywords from task}"

# Quick repo scan for related patterns
```

Output recall results. If nothing found, state "No relevant knowledge found."

### Step 2: Abbreviated Plan (MINIMAL)

Create 1-3 child tasks as beads. No deep research, no deepen, no review.

```bash
bd create "{step title}" --parent {BEAD_ID} -d "## What
{what to implement}

## Validation
- [ ] {acceptance criterion}"
```

Keep descriptions short -- this is the fast path. Each child bead needs only What and Validation sections.

If two tasks touch the same file, add a dependency:
```bash
bd dep add {later_bead} {earlier_bead}
```

### Step 3: Scope Escalation Check

After creating the abbreviated plan but BEFORE starting implementation, evaluate whether the task has outgrown quick-fix territory.

Check for these signals:

- **File count**: More than 3 files need changes
- **Cross-bead dependencies**: Dependencies on other existing beads discovered
- **Architectural decisions**: Task requires architectural choices, not just implementation choices
- **Security implications**: Auth, permissions, data exposure, or input validation concerns
- **Multi-component impact**: Changes span multiple components, services, or layers
- **Change volume**: Estimated total changes exceed ~100 lines

**If one or more signals are detected**, pause and report:

```
This task has grown beyond quick-fix scope.

Signals detected:
- {list each signal with brief explanation}

Switch to /lavra-design for proper planning? This preserves all work done so far.
```

**If user accepts escalation:**

1. Save current progress -- update parent bead with note:
   ```bash
   bd comments add {BEAD_ID} "DECISION: Escalated from /lavra-quick to /lavra-design. Signals: {signals}. Child tasks preserved as starting point."
   ```

2. Invoke `/lavra-design` with the bead ID so full planning picks up where this left off.

3. Stop the lavra-quick workflow.

**If user declines escalation:**

1. Log the decision:
   ```bash
   bd comments add {BEAD_ID} "DECISION: User chose to proceed with /lavra-quick despite scope signals: {signals}. Rationale: user preference."
   ```

2. Continue to step 4.

**If no signals detected**, proceed to step 4 without interruption.

### Step 4: Begin Execution

Update the parent bead status:

```bash
bd update {BEAD_ID} --status in_progress
```

**Light deviation rules for quick tasks:**
- Auto-fix bugs and blockers that prevent task completion -> log `DEVIATION:`
- Do NOT expand scope beyond the original task description
- If you encounter something requiring scope expansion, log it and move on

Execute using the `/lavra-work` workflow on the first ready child bead. Follow all `/lavra-work` phases (Quick Start, Execute, Quality Check, Ship It) -- the abbreviated plan does not mean abbreviated execution.

**Log knowledge as you work** -- at least one LEARNED/DECISION/FACT/PATTERN/DEVIATION comment per task:

```bash
bd comments add {BEAD_ID} "LEARNED: {insight}"
bd comments add {BEAD_ID} "DEVIATION: {what was changed outside original scope and why}"
```

### Step 5: Wrap Up

After all child tasks are complete:

1. Run tests and linting
2. Commit with conventional format
3. Close the bead: `bd close {BEAD_ID}`

## Success Criteria

- Bead created (if description provided) or loaded (if ID provided)
- 1-3 child tasks created with What/Validation sections
- All tasks executed and tests passing
- At least one knowledge comment captured
- Bead closed on completion

## Important Guidelines

- Do NOT use for complex features, architectural changes, or tasks with unclear requirements
- If scope creep is detected, the formal escalation check in step 3 handles it -- do not skip that checkpoint
- Do NOT skip knowledge capture -- the fast path still feeds the memory system
- Do NOT skip tests -- abbreviated planning does not mean lower quality

## Next Steps

After completion, present options:

1. **Quick-track another task** -- run `/lavra-quick` again
2. **Review the work** -- run `/lavra-review` for a code review
3. **Checkpoint** -- run `/lavra-checkpoint` to save progress
