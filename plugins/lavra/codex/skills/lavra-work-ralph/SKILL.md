---
name: lavra-work-ralph
description: Autonomous retry mode for beads. Self-healing agents iterate until completion or retry budget exhausted. For unattended execution with max turns and completion promises.
---

# Lavra Work Ralph Skill

## Objective

Work on beads autonomously with iterative retry. Each agent loops until completion criteria pass or retries are exhausted, using the ralph-wiggum promise pattern. Combines the full lavra-work quality standard with self-healing execution.

## Key Concepts

**Completion Promise:** Agents signal completion with `<promise>DONE</promise>` when all criteria are met.

**Retry Loop:** On failure, agents analyze root cause, fix, and retry up to max budget.

**Completion Criteria:** Derived from bead's Validation section, Testing section, or test command.

## Configuration

Parse flags from arguments:
- `--retries N`: max retries per agent (default 5, range 1-20)
- `--max-turns N`: max turns per agent (default 50, range 10-200)
- `--yes`: skip user approval gate (but NOT pre-push review)

## Execution Flow

### 1. Permission Check

Subagents in ralph mode need Bash, Write, and Edit tool access without human approval. If tool permissions appear restricted, warn the user but continue.

### 2. Determine Completion Criteria

For each bead, derive completion criteria from (in priority order):
1. **`## Validation` section** in the bead description -- use directly
2. **`## Testing` section** in the bead description -- "all specified tests pass"
3. **Test command exists** -- "all tests pass"
4. **None of the above** -- "implementation matches bead description and no errors on manual review"

### 3. Gather Beads & Organize Waves

- Resolve epic IDs, comma-separated IDs, or empty (all ready beads)
- Validate bead IDs
- Skip beads recommending `.lavra/` deletion
- Detect file-scope conflicts and force sequential ordering where needed
- Organize into waves based on dependencies

### 4. Create Working Branch

If on the default branch, offer to create `bd-ralph/{short-description}`. Record the pre-branch SHA for later diff review.

### 5. User Approval

Present the plan once:
```
Autonomous execution plan: {N} beads across {M} waves, max {retries} retries/bead, max {max_turns} turns/agent. Estimated max agent invocations: {beads * (retries + 1)}. Proceed?
```

If `--yes` flag is set, skip this gate.

### 6. Recall Knowledge & Read Project Config

Run `.lavra/memory/recall.sh` with combined bead keywords. Read project config and detect installed skills. Output recall results before building agent prompts.

### 7. Execute Waves (Autonomous Retry)

For each wave, spawn general-purpose agents in parallel -- one per bead.

Each agent gets:
- Full bead description
- Related bead context
- Relevant knowledge entries from recall
- Clear completion criteria
- Retry budget and turn limit

**Agent receives:**
```
## Completion Criteria
{COMPLETION_CRITERIA}

You are DONE when ALL completion criteria above are satisfied.
When done, output exactly: <promise>DONE</promise>

## Test Command
{TEST_COMMAND or "none -- no test suite configured"}

## Retry Loop

After implementing:

1. Verify completion:
   - If test command exists, run it
   - Check each item in Completion Criteria
   - If ALL met: proceed to step 3
   - If ANY fails: proceed to step 2

2. Fix and retry (max {MAX_RETRIES} retries):
   - Analyze failure, identify root cause, fix
   - Go back to step 1
   - On repeated same error, pivot to different approach
   - If retries exhausted: log failure, do NOT output <promise>DONE</promise>

3. Report results and signal completion:
   - If all criteria met: <promise>DONE</promise>
```

### 8. Verify Results Per Wave

After each wave completes:

1. Review agent outputs for issues
2. Check for `<promise>DONE</promise>` in output
3. Run tests to verify nothing broke
4. Run linting if applicable
5. Handle failed beads: revert their changes using pre-wave SHA
6. Create incremental commit for the wave
7. Close completed beads with `bd close`

Emit wave status:
```
Wave {N} complete: {X} beads closed, {Y} beads failed, {Z} total retries used.
```

### 9. Pre-Push Diff Review

Show diff and require explicit confirmation before pushing (even with `--yes`):

```bash
git diff --stat {PRE_BRANCH_SHA}..HEAD
```

Ask: "Review the changes above before pushing. Proceed with push?"

### 10. Final Steps

After all waves and pre-push review:

1. Push to remote:
   ```bash
   git push
   bd backup
   ```

2. Scan for substantial findings from closed beads
3. Output summary with waves, closures, failures, and knowledge captured

## Success Criteria

- All resolved beads are closed with `bd close`
- Each bead has at least one knowledge comment (LEARNED/DECISION/FACT/PATTERN/INVESTIGATION)
- Code changes are committed and pushed to remote
- Any failing beads are reported with reasons (not silently dropped)
- All beads either closed or exhausted retries with failure summary
- Completion promise checked for every agent

## Handoff Options

1. Run `/lavra-review` on all changes
2. Create a PR with all changes
3. Document non-obvious findings as reusable knowledge
4. Retry failed beads with only those IDs
5. Continue with remaining open beads
