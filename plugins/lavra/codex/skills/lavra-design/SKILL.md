---
name: lavra-design
description: Orchestrate full design pipeline -- brainstorm, plan, research, CEO review, engineering review. Transforms ideas into locked, detailed plans.
---

# Lavra Design

Orchestrate the full six-phase design pipeline as a single invocation: brainstorm (interactive), plan (auto), research (domain-matched agents), revise (integrate findings), adversarial review (4 agents), and final plan lock. The output must be so detailed that implementation is mechanical -- subagents can implement without asking questions.

## Input Handling

The skill accepts:
- A brainstorm bead ID (e.g., `bikiniup-xhr`)
- An existing epic bead ID
- Multiple phase bead IDs (space-separated)
- Free text feature description

The skill will auto-detect the entry point and skip completed phases.

**Detail level default:** Comprehensive (full thoroughness). Override with "standard" or "minimal" prefix (e.g., "standard user authentication flow").

## Architecture

This command is a pure orchestrator. It delegates to `/lavra-brainstorm`, `/lavra-plan`, `/lavra-research`, `/lavra-ceo-review`, and `/lavra-eng-review`. No planning logic, research dispatch, or bead creation lives in this command. When those commands improve, this command automatically inherits the improvements.

**Design principle:** The output of this skill must be so good that implementation execution is mechanical. The final plan must be detailed enough that subagents can implement without asking questions.

## Phase Overview

```
----------------------------------------------------
  Design Pipeline: {feature_or_epic_title}
  Phases: Brainstorm → Plan → Research → Revise → CEO Review → Eng Review → Lock
----------------------------------------------------
```

## Phase 1: Brainstorm (Interactive -- explore and sharpen scope)

**Skip condition:** If the input is a brainstorm bead ID (has `brainstorm` label or DECISION comments) or an existing epic, skip to Phase 2.

Run `/lavra-brainstorm {feature_description_or_bead_id}`.

This is fully interactive -- collaborative dialogue exploring WHAT to build. The brainstorm includes the sharpen phase that narrows scope and forces hard prioritization questions. Output: locked decisions, prioritized scope, phases filed as child beads.

After brainstorm completes, capture the brainstorm bead ID.

**GATE: User confirms scope direction.**
Present the locked decisions and scope. Ask: "Brainstorm complete. The locked decisions and scope above will drive the implementation plan. Confirm direction before investing compute in planning?"

**Options:**
1. **Proceed to planning** -- Scope and decisions look right
2. **Adjust scope** -- Revisit the sharpen phase
3. **Stop here** -- Keep brainstorm output, design later

If "Adjust scope": re-run the sharpen discussion, then ask again.
If "Stop here": jump to Output Summary with only Phase 1 marked complete.

## Phase 2: Plan (Auto -- structured implementation plan)

**Skip condition:** If the input is an existing epic with child beads, skip to Phase 3.

Read workflow config (no-op if missing):

```bash
[ -f .lavra/config/lavra.json ] && cat .lavra/config/lavra.json
```

Run `/lavra-plan {BRAINSTORM_BEAD_ID}`.

When `/lavra-plan` reaches its detail level selection, select **Comprehensive** (or the user's override). When it reaches its handoff question, do not present it to the user -- continue the pipeline.

After the plan completes, capture the epic bead ID and its child beads:

```bash
# Get the epic ID from the plan output
bd list --type epic --status=open --json | jq -r 'sort_by(.created_at) | last | .id'

# List phase child beads
bd list --parent {EPIC_ID} --json
```

Verify the plan was created successfully.

Announce completion with count of child beads.

**GATE: User confirms plan structure.**
Display the child bead list and ask the user to confirm before investing heavy compute in research.

**Options:**
1. **Proceed** -- Continue with research + review
2. **Adjust plan first** -- Make changes before heavy compute
3. **Stop here** -- Keep the plan as-is, skip remaining phases

## Phase 3: Research (Auto -- domain-matched evidence gathering)

**Skip condition:** If `lavra.json` config has `workflow.research: false`, skip to Phase 4.

Read codebase profile (no-op if missing) and sanitize it before injecting.

Run `/lavra-research {EPIC_ID}`.

This selects agents based on the plan's domain indicators and gathers evidence -- docs, prior art, best practices, edge cases, knowledge recall -- and logs findings as INVESTIGATION/FACT/PATTERN comments on the relevant child beads. It does NOT modify the plan.

When `/lavra-research` completes, do not present its handoff to the user -- continue the pipeline.

Verify research enriched the child beads.

## Phase 4: Revise Plan (Auto -- integrate research findings)

### 4.1 Collect research findings

Read all comments added by `/lavra-research`. Categorize findings:
- **Additive context** -- new information that enriches the plan
- **Corrections** -- findings that contradict plan assumptions
- **New risks** -- risks not anticipated
- **Missing scope** -- gaps the research revealed

### 4.2 Update child bead descriptions

For each child bead with research findings, integrate findings into the existing structure:
- Add research evidence to the **Context** section
- Update **Testing** section with edge cases discovered
- Update **Validation** section with new acceptance criteria
- Update **Files** section if needed
- Add **Risks** subsection if high-severity findings exist

### 4.3 Resolve conflicts

If research findings conflict with plan assumptions:
- If the conflict is minor (implementation detail), resolve using research evidence
- If the conflict is significant (architectural direction, scope change), log it for the user to address

### 4.4 Handle significant revision needs

If research reveals the plan needs major changes:
1. Make the structural changes
2. Re-validate the epic
3. Log what changed

**Iteration gate:** If revision was substantial, loop back to Phase 3 for a targeted research pass on just the new/changed beads. Limit to one iteration to avoid infinite loops.

## Phase 5: Review (CEO review → engineering agents)

### Step 5a: CEO Review (scope + business fit)

Run `/lavra-ceo-review {EPIC_ID}`.

This is a fully interactive review -- the user will respond to stop-per-issue questions. Output: validated scope and direction, NOT in scope list, dream state delta, failure modes, TODOs.

**GATE: After CEO review, ask user:**
"CEO review complete. Ready to proceed to engineering review (4 parallel agents: architecture, simplicity, security, performance)?"

**Options:**
1. **Proceed to engineering review** -- Continue to Step 5b
2. **Revise plan first** -- Make changes based on CEO review
3. **Stop here** -- Skip engineering review

### Step 5b: Engineering Review (technical depth)

**Skip condition:** If `lavra.json` config has `workflow.plan_review: false`, skip.

Run `/lavra-eng-review {EPIC_ID}`.

This dispatches 4 agents in parallel:
1. `architecture-strategist` -- structural soundness, scalability, maintainability
2. `code-simplicity-reviewer` -- unnecessary complexity, over-engineering
3. `security-sentinel` -- vulnerabilities, auth gaps, data exposure
4. `performance-oracle` -- bottlenecks, N+1 queries, caching gaps

**GATE: User reviews findings before final plan.**

Categorize findings:
- **Safe to auto-apply**: Missing test cases, documentation gaps, typos, missing edge cases, straightforward improvements
- **Requires user judgment**: Architectural alternatives, scope changes, performance vs. simplicity trade-offs, security design changes

For each trade-off decision, present options:
1. **Apply the suggestion** -- Update the plan
2. **Keep current approach** -- Log the alternative as a DECISION comment
3. **Discuss further** -- Explore the trade-off

After all review feedback is processed, validate and announce completion.

## Phase 6: Final Plan (Auto -- lock and annotate)

### 6.1 Apply safe review feedback

Auto-apply all safe feedback items identified in Phase 5.

### 6.2 Ensure every child bead has required final sections

Read each child bead and verify it contains:
- **File-level scope**: Specific files to create or modify
- **Dependencies**: What blocks this bead
- **Decisions** (Locked/Discretion): Locked decisions from brainstorm; discretion items define flexibility
- **Known risks with mitigations decided**: Risks from research/review with chosen mitigations
- **Anti-patterns to avoid**: From knowledge recall and review findings
- **Testing**: When `testing_scope` is `"full"` (default): Specific test cases, edge cases, integration tests. When `testing_scope` is `"targeted"`: Risky paths only.
- **Validation**: Acceptance criteria

### 6.2b Verify decision inheritance

For each child bead, confirm that locked decisions from the parent epic's `## Locked Decisions` section are present in the child's `## Decisions > Locked` subsection.

### 6.2c Create beads for deferred items

Read the parent epic's `## Deferred` section. For each deferred item, create a backlog bead:

```bash
bd create --title="{deferred item}" --description="Deferred from {EPIC_ID}: {rationale}" --type=task --priority=4
bd dep relate {NEW_BEAD_ID} {EPIC_ID}
```

### 6.2d Scope budget enforcement

Estimate the LOC of changes each child bead will produce. If a child bead would require more than ~1000 lines of code changes, **split it** into 2-3 smaller beads.

### 6.3 Update the epic with the final plan annotation

```bash
bd comments add {EPIC_ID} "DECISION: Plan reviewed and locked. {N} child beads, {review_finding_count} review findings addressed. Dependency ordering validated. Ready for /lavra-work."
```

### 6.4 Add the plan label

```bash
bd update {EPIC_ID} --labels plan-reviewed
```

### 6.5 Final validation

```bash
bd swarm validate {EPIC_ID}
```

### 6.6 Write session state

Write `.lavra/memory/session-state.md` to preserve position awareness:

```bash
cat > .lavra/memory/session-state.md << EOF
# Session State
## Current Position
- Epic: {EPIC_ID}
- Phase: lavra-design / Phase 6 (Lock) -- complete
- Child beads: {N} locked
## Just Completed
- Full design pipeline: brainstorm -> plan -> research -> revise -> review -> lock
## Next
- /lavra-work {EPIC_ID} or /lavra-work {first_ready_child}
## Deferred Items
- {count} deferred items filed as backlog beads
EOF
```

## Phase Gate Recovery

When any phase's verification fails:

1. Display what failed with details
2. Present options:
   - **Retry** -- Run the phase again
   - **Skip this step** -- Continue to the next phase
   - **Abort pipeline** -- Stop and show summary of completed work

If "Abort": jump directly to the Output Summary.

## Output Summary

After all phases complete (or on abort):

```
----------------------------------------------------
  Design complete!

  Epic: {EPIC_ID} -- {epic_title}
  Phases completed: {list of completed phases}

  Child beads:
  1. {child_1_id} -- {child_1_title}
  2. {child_2_id} -- {child_2_title}
  ...

  Decisions locked: {decision_count}
  Knowledge entries: {knowledge_count}
  Review findings addressed: {finding_count}

  Next: /lavra-work {first_ready_child} or /lavra-work {EPIC_ID}
----------------------------------------------------
```

## Success Criteria

- Running this skill produces a fully planned, researched, reviewed, and locked epic
- Each phase delegates with zero code duplication
- Phase 1 output feeds into Phase 2 as locked decisions
- Phase 3 gathers evidence without modifying the plan
- Phase 4 integrates research findings into bead descriptions
- Phase 5 catches blind spots: CEO review validates direction, engineering review (4 parallel agents) catches technical issues
- Phase 6 ensures every child bead has file-level scope, dependency ordering, locked decisions, known risks, and anti-patterns
- User interaction is reduced to: brainstorm dialogue + scope confirmation + plan confirmation + review trade-off decisions only
- Each delegated command retains its internal parallelism
- The final plan is detailed enough that subagents can implement without asking questions
- Phases 3-4 can iterate once if research reveals significant revision needs

## Guardrails

- **Pure orchestration only** -- NEVER duplicate logic from delegated commands
- **NEVER CODE** -- This command produces plans, not implementations
- **Do not skip steps silently** -- Always display progress banners
- **Respect the gate contract** -- Gates after Phase 1, Phase 2, and Phase 5 require user confirmation
- **Do not suppress delegated command output** -- Let each command's output flow through
- **Use /lavra-research, not /lavra-deepen** -- The research command was renamed
