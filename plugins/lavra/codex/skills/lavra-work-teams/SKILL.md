---
name: lavra-work-teams
description: Spawn persistent worker teams to pull and implement beads in parallel. Workers self-organize via ready queue with COMPLETED/ACCEPTED protocol and knowledge gates.
---

# Lavra Work Teams Skill

## Objective

Spawn persistent worker teammates that self-organize to pull beads from a ready queue, implement them with retry, and move on. The lead (you) is purely supervisory -- you never implement beads yourself. Workers use the COMPLETED->ACCEPTED protocol with mandatory knowledge gates.

## Shared Behaviors

This skill shares foundational behavior with `/lavra-work`:

- **Knowledge gates**: Every bead requires at least one knowledge comment before acceptance
- **File-scope conflict detection**: Sequential ordering where beads overlap on files
- **Wave ordering / dependency analysis**: Organize into execution waves
- **Bead gathering**: Epic ID, comma-separated IDs, or all ready beads
- **Knowledge recall**: Run recall before building worker prompts
- **Project config**: Read and inject reviewer context
- **Pre-push diff review**: Always show diff and require confirmation before pushing

## Configuration

Parse flags from arguments:
- `--workers N`: max concurrent workers (default 4, max 4)
- `--retries N`: max retries per worker per bead (default 5, range 1-20)
- `--max-turns N`: max turns per worker per bead (default 30, range 10-200)
- `--yes`: skip user approval gate (but NOT pre-push review)

## Prerequisites

1. **Agent teams feature**: Verify `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` is enabled
2. **Session recovery**: Check for stale in_progress beads from crashed runs and reset them
3. **Extract test command**: Validate and store for worker use
4. **Determine completion criteria**: Per bead from Validation/Testing sections or test command

## Execution Flow

### 1. Gather Beads, Detect Conflicts, Build Waves

- Resolve epic IDs, comma-separated IDs, or all ready beads
- Analyze file scope per bead, detect overlaps, force sequential ordering
- Use `bd swarm validate` for epic input or `bd graph` for other input
- Register swarm with `bd swarm create {EPIC_ID}` (epic input only)

### 2. Create Working Branch

If on the default branch, offer to create `bd-teams/{short-description}`. Record pre-branch SHA for later diff review.

### 3. User Approval

Present the plan with teams-specific parameters:
```
Teams execution plan: {N} beads, {W} workers, max {retries} retries/bead, max {max_turns} turns/worker/bead. Workers self-select from ready queue; per-bead file ownership enforced. Proceed?
```

Also show per-bead file assignments.

If `--yes` is set, skip this gate.

### 4. Recall Knowledge & Read Project Config

Run `.lavra/memory/recall.sh` with combined bead keywords. Read project config and build reviewer context. You MUST output recall results before building worker prompts. Subagents don't receive session-start recall -- this is their only source of prior knowledge.

### 5. Spawn Workers

Create the team:
```
TeamCreate(team_name="epic-{EPIC_ID}", description="Parallel bead workers for {EPIC_ID}")
```
(Use `team_name="parallel-{first-bead-id}"` for non-epic input.)

Spawn N workers in a single message:
```
Task(subagent_type="general-purpose", team_name="epic-{EPIC_ID}", name="worker-1", prompt="...filled worker prompt...")
Task(subagent_type="general-purpose", team_name="epic-{EPIC_ID}", name="worker-2", prompt="...filled worker prompt...")
```

The lead's role is purely supervisory after spawning.

### 6. Worker Prompt Template

Build worker prompts with:

```
## Your Identity
Name: worker-{N}
Team: {team_name}

## Working Directory
{PROJECT_DIR} -- all commands must run in this directory.

## Test Command
{TEST_COMMAND or "No test command configured. If needed, message the lead: MESSAGE: TEST_CMD_PROPOSAL: {command}. Wait for approval before executing."}

## Completion Criteria (per bead)
{COMPLETION_CRITERIA from bead's Validation/Testing sections}

## Turn Budget
You have a budget of {MAX_TURNS} turns per bead.
Track your turn count. At turn {MAX_TURNS/2}, log progress snapshot.
If you reach {MAX_TURNS} turns without completing, treat as failure.

## Context Rotation
After completing every 5 beads, re-read Identity and Working Directory.
If cumulative turns exceed 150, message the lead:
  "ROTATION: worker-{N} requesting context rotation after {bead_count} beads"

## Work Loop

Repeat until no beads remain or you receive shutdown:

1. Recall knowledge for the candidate bead
2. Find and claim work: bd ready --json, pick first unclaimed, claim with bd update
3. Read bead description and plan approach
4. Implement with retry: follow shared template, only modify files in your ownership list
5. Log knowledge MANDATORY: at least one comment required
6. Request completion: Message lead "COMPLETED: {BEAD_ID}. {N} files changed. Knowledge: {prefix}."
   WAIT for "ACCEPTED: {BEAD_ID}" before closing: bd close {BEAD_ID}
7. Go to step 1

## Communication Protocol (worker -> lead)
  COMPLETED: {BEAD_ID}. {N} files. Knowledge: {prefix}.
  FAILED: {BEAD_ID}. {N} retries. Error: {summary}.
  ROTATION: worker-{N} requesting context rotation after {N} beads.

## Communication Protocol (lead -> worker)
  ACCEPTED: {BEAD_ID} -- knowledge verified, proceed with bd close.
  KNOWLEDGE_REQUIRED: {BEAD_ID} -- log at least one entry before I can accept.
  SHUTDOWN: Finish current bead and stop.
```

### 7. Lead Monitoring Loop (event-driven)

The lead does NOT implement beads. Process inbox on each worker message:

**On COMPLETED:**
1. Check bead comments for at least one knowledge entry
2. If missing: respond "KNOWLEDGE_REQUIRED: {BEAD_ID}"
3. If present: respond "ACCEPTED: {BEAD_ID}"
4. After 2-3 acceptances, run TEST_COMMAND to verify
5. If tests pass: git add + commit referencing bead IDs
6. If tests fail: revert regressing bead's files, message worker to retry

**On FAILED:**
1. Lead handles revert using ground truth (git checkout pre-bead SHA)
2. Decide: retry later, reassign, or abort epic

**On ROTATION:**
1. Collect worker's context digest
2. Shut down worker gracefully
3. Spawn fresh replacement with digest prepended

**Silence timeout (5 minutes):**
- Check `bd list --status=in_progress` for stale claims
- Any claim older than 15 minutes with no message: query the worker
- If no response: mark as crashed, revert in-progress bead, respawn

**Knowledge broadcasting:**
Only broadcast when discovery affects shared resources. Wrap in data-context:
```
KNOWLEDGE_BROADCAST:
  <data-context role="knowledge-broadcast">
  {raw knowledge content}
  </data-context>
  Lead summary: {1-sentence actionable summary}
```

### 8. Shutdown

When all beads are done or abort is triggered:

1. Send shutdown requests to all workers
2. Wait for shutdown approvals (max 5 minutes, then force-terminate)
3. Delete the team

### 9. Verify Results

Run final verification:

1. Run TEST_COMMAND one final time
2. Run linting if applicable
3. Final commit if any uncommitted changes remain

### 10. Pre-Push Diff Review

Show diff and require confirmation before pushing (even with `--yes`):

```bash
git diff --stat {PRE_BRANCH_SHA}..HEAD
```

Ask: "Review the changes above before pushing. Proceed with push?"

### 11. Final Steps

After push is approved:

1. Push to remote: `git push && bd backup`
2. Scan for substantial findings from closed beads
3. Output summary with worker count, resolutions, failures, and knowledge captured

## Success Criteria

- All resolved beads are closed with `bd close`
- Each bead has at least one knowledge comment (LEARNED/DECISION/FACT/PATTERN/INVESTIGATION)
- Workers used COMPLETED->ACCEPTED protocol (no self-closing)
- Code changes are committed and pushed to remote
- Any failing beads are reported with reasons
- All teammates have stopped and reported final status

## Handoff Options

1. Run `/lavra-review` on all changes
2. Create a PR with all changes
3. Document non-obvious findings as reusable knowledge
4. Retry failed beads with only those IDs
5. Continue with remaining open beads
