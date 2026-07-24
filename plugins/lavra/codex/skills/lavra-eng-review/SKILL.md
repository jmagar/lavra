---
name: lavra-eng-review
description: Multi-agent engineering audit -- 4 parallel agents diagnose architecture, simplicity, security, and performance issues before build.
---

# Lavra Engineering Review

Review an epic plan using multiple specialized agents in parallel to catch technical issues before implementation begins. Engineering layer review: given we're building this, is the architecture sound? N+1s? Security holes? Run after CEO review so engineering effort is spent on a validated direction.

## Input

Provide the epic bead ID to review (e.g., `BD-001`). Optionally include `--small` flag for compact output.

**Parse `--small` flag:**
- If `--small` is present, set BIG_SMALL_MODE=small
- Default: BIG_SMALL_MODE=big
- In `--small` mode, each agent returns only its **single most important finding**; synthesis produces a compact prioritized list

If the epic bead ID is empty, check for recent epic beads and ask which one you want reviewed.

## Step 1: Load the Plan

Load the full plan content from the epic and all child beads:

```bash
# Read the epic
bd show {EPIC_ID}

# List and read all child beads
bd list --parent {EPIC_ID} --json
```

For each child bead, read its full description:

```bash
bd show {CHILD_ID}
```

**Retrospective check:**

```bash
git log --oneline -20
```

If prior commits suggest a previous review cycle on this branch (e.g., "address review feedback", reverted changes, refactor-after-review commits), note which areas were previously problematic. Pass this context to agents so they review those areas more aggressively. Recurring problem areas are architectural smells.

## Step 2: Recall Relevant Knowledge + Read Workflow Config

Search for knowledge related to the plan's topic and tech stack:

```bash
.lavra/memory/recall.sh "{keywords from epic title}"
.lavra/memory/recall.sh "{tech stack keywords}"
```

Include any relevant LEARNED/DECISION/FACT/PATTERN entries as context for reviewers.

Read workflow config for model profile:

```bash
[ -f .lavra/config/lavra.json ] && cat .lavra/config/lavra.json
```

Parse `model_profile` (default: `"balanced"`). When `model_profile` is `"quality"`, dispatch `architecture-strategist`, `security-sentinel`, and `performance-oracle` with `model: opus`.

## Step 3: Dispatch Review Agents in Parallel

**In `--small` mode:** Instruct each agent to return only its single most important finding.

**In default (big) mode:** Full parallel dispatch with complete analysis.

Run these 4 agents simultaneously, passing the full plan content + retrospective context to each. Also request: (a) one realistic production failure scenario per new codepath (timeout, nil, race condition, etc.) and (b) any work that could be deferred without blocking the core objective:

1. **architecture-strategist** -- Review for architectural soundness, scalability, and maintainability. For each new codepath, identify one realistic production failure. Flag any work deferrable without blocking the core objective. (add `model: opus` if profile=quality)

2. **code-simplicity-reviewer** -- Review for unnecessary complexity, over-engineering, and opportunities to simplify. For each new codepath, identify one realistic production failure. Flag any work deferrable without blocking the core objective.

3. **security-sentinel** -- Review for security vulnerabilities, missing auth checks, data exposure risks. For each new codepath, identify one realistic production failure. (add `model: opus` if profile=quality)

4. **performance-oracle** -- Review for performance bottlenecks, N+1 queries, missing caching, scalability issues. For each new codepath, identify one realistic production failure. (add `model: opus` if profile=quality)

## Step 4: Synthesize Findings

After all agents complete, synthesize their feedback into a categorized report:

**In `--small` mode:** Produce a compact prioritized list (top finding per agent + single combined recommendation).

**In default (big) mode:**

```markdown
## Engineering Review: {EPIC_ID} - {epic title}

### Architecture
[Findings from architecture-strategist]
- Strengths: [what's well designed]
- Concerns: [architectural issues]
- Suggestions: [improvements]

### Simplicity
[Findings from code-simplicity-reviewer]
- Over-engineering risks: [what could be simpler]
- Unnecessary abstractions: [what to remove]
- Suggestions: [simplifications]

### Security
[Findings from security-sentinel]
- Vulnerabilities: [security risks found]
- Missing protections: [what needs adding]
- Suggestions: [security improvements]

### Performance
[Findings from performance-oracle]
- Bottlenecks: [performance concerns]
- Missing optimizations: [what to add]
- Suggestions: [performance improvements]

### Failure Modes
Per-new-codepath analysis from agent findings:
```
CODEPATH | FAILURE MODE   | RESCUED? | TEST? | USER SEES?     | LOGGED?
---------|----------------|----------|-------|----------------|--------
[path]   | [failure]      | Y/N      | Y/N   | [visible/silent]| Y/N
```
Flag any row with RESCUED=N AND TEST=N AND USER SEES=Silent as **CRITICAL GAP**.

### NOT in Scope
Work the agents flagged as deferrable without blocking the core objective:
- [item] -- [one-line rationale]
- [item] -- [one-line rationale]

### Summary
- **Critical issues:** [count] - Must fix before implementing
- **Important suggestions:** [count] - Should consider
- **Minor improvements:** [count] - Nice to have

### Recommended Changes
1. [Most impactful change]
2. [Second most impactful]
3. [Third most impactful]

### Completion Summary
```
Architecture issues: N  |  Simplicity: N  |  Security: N  |  Performance: N
Critical gaps: N  |  TODOs proposed: N
```
```

## Step 5: Log Key Findings + TODOS Protocol

Log significant findings:

```bash
bd comments add {EPIC_ID} "LEARNED: Engineering review found: {key insight}"
```

**TODOS section:** For each deferrable item surfaced by agents, present as its own question -- never batch:

- **What**: One-line description of the work.
- **Why**: The concrete problem it solves or value it unlocks.
- **Pros**: What you gain by doing this work.
- **Cons**: Cost, complexity, or risks.
- **Context**: Enough detail for someone picking this up in 3 months.
- **Effort estimate**: S/M/L/XL

**Options:** **A)** Create a backlog bead **B)** Skip — not valuable enough **C)** Build it now in this plan instead of deferring.

## Success Criteria

- All 4 review agents dispatched and completed
- Retrospective check performed (prior review cycles noted if any)
- Findings synthesized into categorized report with severity levels
- Failure modes table produced with CRITICAL GAP flagging
- NOT in scope section included
- Completion summary table produced
- TODOs presented one-per-question
- Critical issues clearly identified
- Key findings logged as knowledge comments

## Next Steps After Review

After presenting the review, present these options:

**Options:**
1. **Apply feedback** - Update child beads with review suggestions
2. **Run `/lavra-research`** - Gather additional evidence with domain-matched agents
3. **Start `/lavra-work`** - Begin implementing the first child bead
4. **Run `/lavra-work {EPIC_ID}`** - Work on multiple child beads in parallel
5. **Dismiss** - Acknowledge review without changes

## Applying Feedback (when option 1 is selected)

**Follow this exact protocol.**

### Step A: Build the Recommendation Checklist

Before touching any bead, extract every actionable recommendation from the review report. Number them sequentially.

Print this numbered list to the user before starting. Also include any critical/important issues from each category.

**Total count:** State how many recommendations you found.

### Step B: Apply Each Recommendation

Work through the list one at a time. For each recommendation:

1. **Identify the target bead** - Which child bead (or epic) does this apply to?
2. **Read the current description**: `bd show {BEAD_ID}`
3. **Update it**: `bd update {BEAD_ID} -d "{updated description with recommendation applied}"`
4. **Mark complete** in your working list

If a recommendation applies to multiple beads, update each one.

If a recommendation is contradictory or inapplicable, mark it `[SKIPPED: reason]` -- do NOT silently omit it.

### Step C: Completeness Verification

After applying all changes:

1. Re-read the original review report
2. Compare each recommendation against your working checklist
3. For any item not marked complete or skipped, apply it now

Print the final checklist state showing applied and skipped items.

### Step D: Log Changes

```bash
bd comments add {EPIC_ID} "DECISION: Applied engineering review feedback. {N} recommendations applied across {K} beads. Key changes: {top 3 changes}"
```
