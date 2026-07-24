---
name: lavra-review
description: Exhaustive multi-agent code review with ultra-thinking. Analyzes security, performance, architecture. Creates beads for findings. Run before merge.
compatibility: Requires git repository, GitHub CLI (gh), beads (bd) CLI, git worktrees support optional
---

# Lavra Review

Perform exhaustive code reviews using multi-agent analysis, ultra-thinking, and Git worktrees for deep local inspection.

## When to Use

- Before merging code to main/master
- To ensure code quality across security, performance, architecture, and design
- To catch regressions and potential issues with fresh eyes
- When you need detailed findings organized as actionable beads
- To integrate findings with multi-agent analysis and deep thinking

## Execution

### 1. Determine Review Target & Setup

First, determine the review target type and set up the code for analysis.

**Determine review target**:
- Bead ID (BD-xxx)
- PR number (numeric)
- GitHub URL
- Branch name
- Empty (current in-progress bead)

**Get bead details** (if bead ID provided):

```bash
bd show {BEAD_ID} --json
```

**Find current in-progress bead** (if no target provided):

```bash
bd list --status in_progress --json | jq -r '.[0].id'
```

**Check current git branch** and determine if you need a worktree:

```bash
git branch --show-current
```

- If ALREADY on the target branch → proceed with analysis on current branch
- If DIFFERENT branch → offer to use git-worktree skill: "Use git-worktree skill for isolated checkout."

**Fetch PR metadata** (if PR exists):

```bash
gh pr view --json title,body,files
```

**Set up language-specific analysis tools** based on detected languages.

Ensure the code is ready for analysis (either in worktree or on current branch) before proceeding to step 2.

### 2. Recall Relevant Knowledge

Search for knowledge related to the code being reviewed:

```bash
.lavra/memory/recall.sh "{keywords from bead title}"
.lavra/memory/recall.sh "{tech stack keywords}"
.lavra/memory/recall.sh --recent 10
```

Present any relevant LEARNED/DECISION/FACT/PATTERN entries that reviewers should consider.

**Protected Artifacts**: The following paths are lavra pipeline artifacts and must never be flagged:
- `.lavra/memory/knowledge.jsonl` -- Persistent knowledge store
- `.lavra/memory/knowledge.archive.jsonl` -- Archived knowledge
- `.lavra/memory/recall.sh` -- Knowledge search script
- `.lavra/config/project-setup.md` -- Project configuration
- `.lavra/config/codebase-profile.md` -- Codebase analysis
- `.lavra/config/lavra.json` -- Workflow configuration

If a review agent flags any file in `.lavra/memory/` or `.lavra/config/` for cleanup or removal, discard that finding during synthesis.

### 3. Read Project Config & Dispatch Review Agents

**Read Project Config** (optional):

```bash
[ -f .lavra/config/project-setup.md ] && cat .lavra/config/project-setup.md
[ -f .lavra/config/lavra.json ] && cat .lavra/config/lavra.json
```

From `project-setup.md`, parse the YAML frontmatter for `review_agents` list (if present).

From `lavra.json`, parse `model_profile` (default: `"balanced"`).

**Model override rule**: When `model_profile` is `"quality"`, dispatch these critical agents with higher model tier:
- `security-sentinel`
- `architecture-strategist`
- `performance-oracle`

**Agent allowlist validation** (when `review_agents` is present):

Derive the allowlist dynamically from installed agent directories:

```bash
{ find .claude/agents ~/.claude/agents -name "*.md" 2>/dev/null; } | xargs -I{} basename {} .md | sort -u
```

- Reject any name that does not match `^[a-z][a-z0-9-]*$` or is not in the derived allowlist
- Silently skip invalid names
- If all entries are invalid, fall back to dispatching all agents

**Config-missing behavior**: If `.lavra/config/project-setup.md` does not exist, dispatch ALL agents (backward compatible).

**Dispatch Agents in Parallel**:

Dispatch the validated agent list or all agents:

1. kieran-rails-reviewer
2. dhh-rails-reviewer
3. kieran-typescript-reviewer
4. kieran-python-reviewer
5. git-history-analyzer
6. pattern-recognition-specialist
7. architecture-strategist (add higher model if profile=quality)
8. security-sentinel (add higher model if profile=quality)
9. performance-oracle (add higher model if profile=quality)
10. data-integrity-guardian
11. agent-native-reviewer
12. julik-frontend-races-reviewer

**Conditional Agents** (Run if PR matches criteria):

**If PR contains migrations or schema changes**:
- data-migration-expert
- deployment-verification-agent
- migration-drift-detector

**When to run migration agents**:
- PR includes migration files: `db/migrate/*.rb`, `alembic/versions/*.py`, `prisma/migrations/*/migration.sql`, `drizzle/*/migration.sql`, `migrations/*.js`, `migrations/*.ts`
- PR modifies schema artifacts: `db/schema.rb`, `prisma/schema.prisma`, `drizzle/meta/*.snapshot.json`
- PR modifies columns that store IDs, enums, or mappings
- PR includes data backfill scripts
- PR changes how data is read/written
- PR title/body mentions: migration, backfill, data transformation, ID mapping

### 4. Ultra-Thinking Deep Dive Phases

Spend maximum cognitive effort on each phase:

**Phase A: Stakeholder Perspective Analysis**

- **Developer Perspective**: Understandability, intuitive APIs, debugging, testability
- **Operations Perspective**: Deployment safety, metrics, logging, troubleshooting, resource requirements
- **End User Perspective**: Intuitiveness, error messages, performance, problem-solving
- **Security Team Perspective**: Attack surface, compliance, data protection, audit capabilities

**Phase B: Scenario Exploration**

Explore edge cases and failure scenarios:
- Happy Path: Normal operation with valid inputs
- Invalid Inputs: Null, empty, malformed data
- Boundary Conditions: Min/max values, empty collections
- Concurrent Access: Race conditions, deadlocks
- Scale Testing: 10x, 100x, 1000x normal load
- Network Issues: Timeouts, partial failures
- Resource Exhaustion: Memory, disk, connections
- Security Attacks: Injection, overflow, DoS
- Data Corruption: Partial writes, inconsistency
- Cascading Failures: Downstream service issues

### 5. Simplification Review

Run the code-simplicity-reviewer agent to identify opportunities for simplification.

### 6. Findings Synthesis and Bead Creation

**Step 1: Build Agent Finding Inventory**

Before synthesizing, list every finding from each agent:

```
From kieran-rails-reviewer: [finding 1], [finding 2], ...
From dhh-rails-reviewer: [finding 1], [finding 2], ...
From security-sentinel: [finding 1], [finding 2], ...
...
```

**Step 2: Synthesize All Findings**

- Collect findings from the inventory
- Discard findings recommending deletion of protected artifacts
- Categorize by type: security, performance, architecture, quality, etc.
- Assign severity levels: P1 CRITICAL, P2 IMPORTANT, P3 NICE-TO-HAVE
- Remove duplicates (note: data-migration-expert and migration-drift-detector may overlap)
- Estimate effort for each finding (Small/Medium/Large)

**Step 2a: Completeness Verification**

Verify no agent output was silently dropped:
- Every finding in the inventory is either included OR explicitly marked as duplicate/inapplicable
- Count totals must reconcile
- Do not proceed to bead creation until the inventory is fully accounted for

**Step 3: Create Beads for All Findings**

For each finding, create a child bead:

```bash
bd create "{finding title}" \
  --parent {BEAD_ID} \
  --type {bug|task|improvement} \
  --priority {1-5} \
  --tags "review,{category},{BEAD_ID}" \
  -d "## Issue
{Detailed description}

## Severity
{P1/P2/P3} - {Why this severity}

## Location
{file:line references}

## Why This Matters
{Impact and consequences}

## Validation Criteria
- [ ] {Test that must pass}
- [ ] {Behavior to verify}

## Testing Steps
1. {How to reproduce/test}
2. {Expected outcome}"
```

**Priority mapping**:
- P1 CRITICAL → priority 1 (blocks closing original bead)
- P2 IMPORTANT → priority 2 (should fix before closing)
- P3 NICE-TO-HAVE → priority 3-5 (can defer)

**Step 4: Link Critical Issues**

For P1 findings, create blocking dependencies:

```bash
bd dep relate {FINDING_BEAD_ID} {ORIGINAL_BEAD_ID}
```

**Step 5: Mandatory Knowledge Capture** (required gate)

Every P1 (CRITICAL) and P2 (IMPORTANT) finding must have at least one LEARNED or PATTERN knowledge entry:

```bash
bd comments add {BEAD_ID} "LEARNED: [component] was vulnerable to [issue] because [root cause]"
bd comments add {BEAD_ID} "PATTERN: [anti-pattern name] -- [where it appeared and why it's wrong]"
```

Examples:
- "LEARNED: UserController was vulnerable to XSS because params[:name] was interpolated into HTML without sanitize()"
- "PATTERN: N+1 query in OrdersController#index -- .includes(:line_items) was missing from the scope"

**Gate check**: Run `bd show {BEAD_ID}` and verify that the number of LEARNED/PATTERN comments >= the number of P1 + P2 findings. Do not proceed to the summary until this gate passes.

**Step 6: Summary Report**

After creating all beads, present comprehensive summary:

```
## Code Review Complete

**Review Target:** {BEAD_ID} - {title}
**Branch:** {branch-name}

### Findings Summary:

- **Total Findings:** [X]
- **P1 CRITICAL:** [count] - BLOCKS CLOSURE
- **P2 IMPORTANT:** [count] - Should Fix
- **P3 NICE-TO-HAVE:** [count] - Enhancements

### Created Beads:

**P1 - Critical (BLOCKS CLOSURE):**
- {BD-XXX}: {description}

**P2 - Important:**
- {BD-XXX}: {description}

**P3 - Nice-to-Have:**
- {BD-XXX}: {description}

### Review Agents Used:
- {list of agents}

### Next Steps:

1. **Address P1 Findings**: CRITICAL - must be fixed before closing
2. **Close bead** (if no P1/P2 findings): `bd close {BEAD_ID}`
3. **Resolve in parallel**: `/lavra-work {BEAD_ID}`
4. **View all findings**: `bd list --tags "review,{BEAD_ID}"`
```

### 7. End-to-End Testing (Optional)

Detect project type from PR files and offer appropriate testing.

## Success Criteria

- All review agents dispatched and findings collected
- Complete agent finding inventory built before synthesis
- Every finding accounted for (applied, deduplicated, or explicitly discarded)
- All findings stored as child beads with severity, validation criteria, and testing steps
- P1 findings linked as blocking dependencies
- Knowledge logged for every P1/P2 finding
- Summary report presented with next-step options

## Guardrails

- P1 (CRITICAL) findings must be addressed before closing the bead
- Each reviewer creates beads for issues found (not markdown files)
- Each bead has thorough description with severity, validation criteria, and testing steps
- Beads are tagged with `review,{BEAD_ID}` for easy filtering
- Use `/lavra-work {ISSUE_BEAD_ID}` to fix issues found
- Original bead cannot be closed until all blocking dependencies are resolved
