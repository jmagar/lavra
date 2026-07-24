---
name: lavra-work
description: Execute beads with auto-routing: single-bead (full quality, review) or multi-bead (parallel dispatch). Primary path for features, bugs, refactoring.
---

# Lavra Work Skill

## Objective

Execute work on beads efficiently while maintaining quality and finishing features. Auto-routes between single-bead direct execution and multi-bead parallel dispatch based on input.

## Auto-Routing

The skill determines which path to use based on bead count:

- **Single-bead path**: Full-quality interactive flow with built-in review, fix loop, and learn phases
- **Multi-bead path**: Parallel agent dispatch with wave-based execution and orchestration

## Phase 0: Parse Arguments and Auto-Route

Parse flags from arguments:
- `--yes`: skip user approval gate (but NOT pre-push review)
- `--no-parallel`: disable parallel dispatch in multi-bead mode

Count beads to decide routing:
1. **If single bead ID provided**: SINGLE route
2. **If epic ID provided**: Check child beads
   - If 1 bead: SINGLE route
   - If N > 1 beads: MULTI route
3. **If comma-separated IDs**: Count them
   - If 1 ID: SINGLE route
   - If N > 1: MULTI route
4. **If nothing provided**: Get `bd ready --json`
   - If 0 beads: inform user and exit
   - If 1 bead: SINGLE route
   - If N > 1: MULTI route

## Single-Bead Path

### Phase 1: Quick Start

1. **Read bead and clarify**
   - Read full bead with `bd show {BEAD_ID} --long`
   - Extract: What, Context, Decisions (Locked/Discretion/Deferred), Testing, Validation, Dependencies, Comments
   - If parent epic exists, read its Locked Decisions section too
   - Use AskUserQuestion to clarify ambiguities

2. **Recall relevant knowledge**
   - Run `.lavra/memory/recall.sh "{keywords from bead title}"`
   - MUST output results before continuing

3. **Check dependencies & related beads**
   - Run `bd dep list {BEAD_ID} --json`
   - Fetch related bead titles and descriptions

4. **Setup environment**
   - Check current branch
   - Use AskUserQuestion to decide: work on current branch, create feature branch, or use worktree

5. **Update bead status**
   - Run `bd update {BEAD_ID} --status in_progress`

6. **Create task list**
   - Break bead description into actionable tasks
   - Use TaskCreate for each task

### Phase 2: Implement (IMPLEMENTING state)

1. **Read workflow config** (no-op if missing)
   - Parse `commit_granularity`, `model_profile`, `testing_scope`, `workflow.review_scope`

2. **Detect installed skills**
   - List `.claude/skills/` directory
   - Filter to skills with explicit "Use when" or "Triggers on" phrase

3. **Follow deviation rules**
   - Rule 1: Bug blocking your task -> auto-fix OK
   - Rule 2: Missing critical functionality -> auto-add OK
   - Rule 3: Blocking infrastructure -> auto-fix OK
   - Rule 4: Architectural changes -> STOP, ask user
   - 3-attempt limit on fixes

4. **Task execution loop**
   - For each task: mark in_progress, implement, write tests, run tests, mark completed
   - Commit per task or per phase depending on config
   - Use installed skills when applicable

5. **Log knowledge as you work** (MANDATORY)
   - Log immediately when: surprising code, non-obvious choices, errors figured out, patterns noticed, constraints discovered
   - Trigger on: FACT, DECISION, LEARNED, PATTERN
   - MUST log at least one comment per task
   ```bash
   bd comments add {BEAD_ID} "LEARNED: {key technical insight}"
   ```

6. **Write session state** (at milestones)
   - Update `.lavra/memory/session-state.md` with current position, completed work, next steps

7. **Follow existing patterns**
   - Read referenced files first, match naming conventions
   - Reuse existing components, follow project standards

### Phase 3: Review (REVIEWING state) [MANDATORY]

**This phase MUST complete before Phase 4. Do NOT skip any step.**

1. **Run core quality checks**
   - Run full test suite (use project's test command)
   - Run linting (per CLAUDE.md or AGENTS.md)

2. **Focused self-review**
   - Review diff of all changes
   - Check: Security, Debug leftovers, Spec compliance, Error handling, Edge cases
   - Fix issues before continuing

3. **Multi-agent review via `/lavra-review`** [MANDATORY]
   - `review_scope: "full"`: Always run
   - `review_scope: "targeted"`: Only for P0/P1, or "architecture"/"schema"/"auth"/"security" keywords
   - If parent epic exists, pass its Locked Decisions to reviewer

4. **Goal verification** (skippable via config)
   - If bead has `## Validation` section, dispatch goal-verifier agent
   - Interpret results: exists-level/substantive failures = CRITICAL (return to Phase 2)

5. **Fix loop** (FIXING -> RE_REVIEWING states)
   - Create fix items from review findings
   - Implement fixes following Phase 2 conventions
   - Run tests after each fix
   - Log knowledge for non-obvious fixes
   - Re-review after fixes (max 3 iterations)

6. **Phase 3 exit gate** [MANDATORY]
   Output checklist with all items verified:
   ```
   ## Phase 3 Review Gate
   [ ] lavra-review: Skill(lavra-review) invoked
   [ ] Findings: {N} issues / {N} fixed / {N} deferred
   [ ] Self-review: clean | {N} issues fixed
   [ ] Goal verification: passed | failed-and-fixed | skipped
   ```

### Phase 4: Learn (LEARNING state)

**Prerequisite:** Phase 3 exit gate must be complete with all boxes checked.

1. **Gather raw entries** from bead comments matching knowledge prefixes
2. **Check for duplicates** against existing knowledge
3. **Structure and store**: Rewrite terse entries, ensure clarity and searchability
4. **Synthesize patterns**: If 3+ entries share theme, create connecting entry

### Phase 5: Ship It (DONE state)

1. **Final validation**: All tasks completed, tests pass, linting passes, spec criteria met

2. **Create commit** (if not already done incrementally)
   ```bash
   git add <changed files>
   git commit -m "feat(scope): description of what and why"
   ```

3. **Create pull request**
   ```bash
   gh pr create --title "BD-{BEAD_ID}: {description}" --body "## Summary..."
   ```

4. **Verify knowledge was captured**: Run `bd show {BEAD_ID}` and check comments

5. **Offer next steps**: Based on LEARNED/INVESTIGATION comments found

## Multi-Bead Path

For multiple beads:

1. **Gather beads** from epic ID, comma-separated IDs, or all ready beads
2. **Validate IDs** with pattern `^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$`
3. **Skip .lavra/ deletion beads**
4. **Analyze file scope per bead** and detect overlaps
5. **Force sequential ordering** where independent beads overlap
6. **Build execution waves** based on dependencies (use `bd swarm validate` or `bd graph`)
7. **Check branch** and offer to create working branch if on default
8. **User approval**: Present plan with beads, waves, and file assignments
9. **Recall knowledge** with combined bead keywords
10. **Spawn agents in parallel** -- one per bead per wave
11. **Verify results** after each wave: check outputs, run tests, linting, handle failures
12. **Create incremental commits** per wave
13. **Show pre-push diff** and require confirmation (even with `--yes`)
14. **Push to remote** and backup beads
15. **Output summary** with wave count, closures, failures, knowledge captured

## Success Criteria

- For single-bead: Bead closed, all knowledge logged, changes pushed
- For multi-bead: All resolved beads closed, knowledge logged, changes pushed, failures reported with reasons
- Phase 3 Review Gate completed (single-bead path)
- No silent failures -- all issues reported
