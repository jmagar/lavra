---
name: lavra-plan
description: Break down feature requests/bugs into researched epics with detailed child beads. Runs parallel research, SpecFlow analysis, detail-level selection, and thorough validation. Beads include locked decisions, acceptance criteria, files, and dependencies.
---

# lavra-plan

Transform feature descriptions, bug reports, or improvement ideas into well-structured beads with comprehensive research and multi-phase planning. Provides flexible detail levels to match your needs.

## Overview

This skill breaks down feature ideas into actionable, researched work items. It gathers evidence, captures decisions, structures child tasks with complete information, and validates the plan before execution.

## Input

Accepts either a bead ID or a feature description:

```bash
/lavra-plan "Add OAuth login to user signup flow"
/lavra-plan BD-042
```

## Determining Input Type

Check if the argument matches a bead ID pattern:
- Pattern: lowercase alphanumeric segments separated by hyphens
- Examples: `bikiniup-xhr`, `beads-123`, `fix-auth-bug2`

**If it's a bead ID:**
1. Load: `bd show {BEAD_ID} --json`
2. Use the bead's description as the feature description
3. If the bead already has children, ask whether to continue or stop

**If it's a description:** Use it as-is

**If empty:** Ask "What would you like to plan? Please provide either a bead ID or describe the feature."

## Process

### Phase 0: Idea Refinement

Check for brainstorm output first. Stop at the first match and skip idea refinement:

#### Step 0a: Label-Based Detection (fast)

If the argument is a bead ID, check whether the bead or its parent has a `brainstorm` label:

```bash
bd show "{BEAD_ID}" --json | jq -r '.[0].labels // [] | .[]'
```

If label match found: jump to "Brainstorm Detected" section below.

#### Step 0b: Keyword Match — Recent (≤14 days)

Search for brainstorm-related knowledge and beads:

```bash
.lavra/memory/recall.sh "brainstorm"
.lavra/memory/recall.sh "{keywords from feature description}"
bd list --status=open --json | jq -r '.[] | select(.title | test("brainstorm|explore|investigate"; "i"))'
```

If a relevant brainstorm bead found within 14 days: jump to "Brainstorm Detected".

#### Step 0c: Keyword Match — Older (>14 days)

If a semantically matching brainstorm bead exists but is older than 14 days, ask: "Found brainstorm `{BRAINSTORM_ID}` from [date]. Use it as context?"

#### Step 0d: No Brainstorm — Run Idea Refinement

If no brainstorm found, refine the idea through collaborative dialogue:
- Ask questions one at a time
- Focus on: purpose, constraints, success criteria
- Continue until idea is clear OR user says "proceed"

**Brainstorm Detected** (when found at 0a-0c):

1. Read the brainstorm bead and comments in full
2. Extract **locked decisions** (marked "LOCKED", "DECIDED", "DECISION:")
3. Skip idea refinement dialogue -- brainstorm already answered WHAT to build
4. Store: `BRAINSTORM_ID`, `BRAINSTORM_TITLE`, `LOCKED_DECISIONS`
5. In Step 5 (Create Epic): Epic's Sources section MUST include `Brainstorm: {BRAINSTORM_ID} — {title} (locked decisions: ...)`

### Phase 0.5: Read Workflow Config

```bash
[ -f .lavra/config/lavra.json ] && cat .lavra/config/lavra.json
```

Use default values if file doesn't exist: `research: true`, `plan_review: true`, `goal_verification: true`, `max_parallel_agents: 3`, `commit_granularity: "task"`, `testing_scope: "full"`.

### Phase 1: Local Research (Always Runs - Parallel)

Run in parallel:
- Task: repo-research-analyst(feature_description)
- Task: learnings-researcher(feature_description)

**What to look for:**
- Existing patterns and conventions
- CLAUDE.md or AGENTS.md guidance
- Technology familiarity and consistency
- Applicable knowledge.jsonl entries (gotchas, patterns, lessons)

### Phase 1.5: Research Decision

Based on signals from Phase 0 and findings from Phase 1, decide on external research:

**High-risk topics -> always research:** Security, payments, external APIs, data privacy.

**Strong local context -> skip external research:** Codebase has good patterns, CLAUDE.md has guidance, user knows what they want.

**Uncertainty or unfamiliar territory -> research:** User is exploring, codebase has no examples, new technology.

### Phase 1.5b: External Research (Conditional)

Only run if Phase 1.5 indicates external research is valuable. Run in parallel:
- Task: best-practices-researcher(feature_description)
- Task: framework-docs-researcher(feature_description)

### Phase 1.6: Consolidate Research

After all research steps complete:
- Document relevant file paths from repo research (e.g., `app/services/example_service.rb:42`)
- Include relevant institutional learnings from knowledge.jsonl
- Note external documentation URLs and best practices
- List related issues or PRs discovered
- Capture CLAUDE.md or AGENTS.md conventions

### Phase 2: Epic Bead Planning & Structure

- Draft clear, searchable title (e.g., `Add user authentication`, `Fix cart total calculation`)
- Determine type: feature, bug, refactor, chore
- Log a DECISION comment explaining the chosen approach
- Identify stakeholders who will be affected
- Consider implementation complexity and required expertise
- Choose appropriate detail level based on complexity

### Phase 3: SpecFlow Analysis

Run: Task spec-flow-analyzer(feature_description, research_findings)

Review SpecFlow analysis results:
- Identify any gaps or edge cases
- Update acceptance criteria based on findings

### Phase 4: Choose Implementation Detail Level

Use **AskUserQuestion** to present options:

**MINIMAL (Quick Plan)** -- Simple bugs, small improvements, clear features
- Problem statement or feature description
- Basic acceptance criteria
- Essential context only

**STANDARD (Recommended)** -- Most features, complex bugs, team collaboration
- Everything from MINIMAL plus:
- Detailed background and motivation
- Technical considerations
- Success metrics
- Dependencies and risks
- Basic implementation suggestions

**COMPREHENSIVE (Deep Plan)** -- Major features, architectural changes, complex integrations
- Everything from STANDARD plus:
- Detailed implementation plan with phases
- Alternative approaches considered
- Extensive technical specifications
- Risk mitigation strategies
- Future considerations and extensibility

### Phase 5: Create Epic and Child Beads

**Create the epic bead with Sources section:**

The epic bead description MUST include a Sources section capturing where the plan came from:

```
## Sources
- Brainstorm: {BRAINSTORM_BEAD_ID} — {title} (locked decisions: X, Y, Z)
- File: path/to/file.ext:42 — existing pattern used
- Knowledge: {knowledge-key} (LEARNED) — key insight
- Doc: https://example.com/docs — reference documentation
- Research: best-practices-researcher found X pattern
```

**Create the epic:**
```bash
bd create "{title}" --type epic -d "{overview description with research findings and Sources section}"
```

**For each implementation step, create a child bead with thorough descriptions:**

Each child bead description MUST follow this structure:

```
## What
[Clear description of what needs to be implemented]

## Context
[Relevant findings from research - constraints, patterns, decisions]

## Decisions

### Locked
[Decisions inherited from parent epic that MUST be honored.]
- {locked decision from epic}

### Discretion
[Areas where the implementing agent can choose.]
- {area where agent can decide approach}

## Testing

When testing_scope is "full" (default):
- [ ] [Specific test case 1]
- [ ] [Specific test case 2]
- [ ] [Edge case tests]
- [ ] [Integration tests if needed]

## Validation

- [ ] [Acceptance criterion 1]
- [ ] [Acceptance criterion 2]
- [ ] [Performance/security requirements if applicable]

## Files

[Specific file paths or glob patterns this bead will modify]
- path/to/file.ext
- path/to/directory/*

## Dependencies

[List any child beads that must be completed first]

## References

[Sources relevant to this child bead — freeform bullet list]
- File: path/to/file.ext:42 — pattern used
- Knowledge: {key} (LEARNED) — relevant insight
```

**Scope budget:** Each child bead targets ~1000 LOC of changes or fewer. Split larger beads.

**File-scope conflict prevention:** If two child beads would modify the same file:
1. Merge them into a single bead, OR
2. Add an explicit dependency: `bd dep add {later} {earlier}`

**Create child beads:**
```bash
bd create "{step title}" --parent {EPIC_ID} -d "{comprehensive description}"
```

**Add research context as comments:**
```bash
bd comments add {CHILD_ID} "INVESTIGATION: {key research findings}"
bd comments add {CHILD_ID} "PATTERN: {recommended patterns}"
bd comments add {CHILD_ID} "FACT: {constraints or gotchas}"
```

**Relate beads that share context:**
```bash
bd dep relate {BEAD_A} {BEAD_B}
```

Use `relate` for non-blocking context sharing (e.g., "auth login" and "auth logout" share auth knowledge). Use `dep add` for blocking dependencies.

### Phase 5.5: Cross-Check Validation

**Checks to perform:**

1. **Required sections** -- Each child bead includes What/Context/Decisions/Testing/Validation/Files/Dependencies
2. **File-scope conflicts** -- No two independent beads claim overlapping files
3. **Sources section** -- Epic has non-empty Sources section
4. **Brainstorm reference** -- If brainstorm was used, Sources includes Brainstorm: entry
5. **Completeness** -- Each child bead has enough detail for zero judgment calls
6. **Scope budget** -- Each child bead targets ~1000 LOC or fewer

All checks are **warnings only** -- they do not block. Ask whether to proceed or fix warnings.

### Phase 6: Final Review & Submission

**Pre-submission Checklist:**

- [ ] Epic title is searchable and descriptive
- [ ] All child bead descriptions include What/Context/Testing/Validation sections
- [ ] Dependencies between beads are correctly set
- [ ] No two independent child beads modify the same files
- [ ] Research findings are captured as knowledge comments
- [ ] Epic bead description includes a non-empty Sources section

**Validate the epic structure:**

```bash
bd swarm validate {EPIC_ID}
```

This checks for dependency cycles, orphaned issues, disconnected subgraphs, and ready fronts.

## Important Guidelines

- Don't create vague beads like "Add authentication" with no testing criteria
- Do create thorough beads like "Implement OAuth2 login flow" with specific test scenarios, validation criteria, and constraints
- All research findings are logged to the epic with appropriate prefixes
- Each child bead description is complete enough for implementing agent to make zero judgment calls
- NEVER CODE! Just research and write the plan.

## Next Steps

After creating the epic and child beads, present options:

1. **Run `/lavra-research`** - Gather evidence for each child bead
2. **Run `/lavra-eng-review`** - Get feedback from reviewers
3. **Start `/lavra-work`** - Begin implementing the first child bead
4. **Run `/lavra-work {EPIC_ID}`** - Work on multiple child beads in parallel
5. **Simplify** - Reduce detail level
