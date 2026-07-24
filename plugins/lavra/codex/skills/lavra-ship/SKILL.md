---
name: lavra-ship
description: One-command ship: code ready → PR open, beads closed, knowledge captured. Tests, security checks, goal verification, automated pipeline.
compatibility: Requires git repository, GitHub CLI (gh), beads (bd) CLI, uncommitted changes allowed (will be staged)
---

# Lavra Ship

Fully automated ship sequence from code-ready to PR-open with beads closed and knowledge captured.

## When to Use

- Code is ready and you want to ship it to a PR in one fully automated command
- You want to ensure tests pass, security checks pass, and all beads are properly closed
- You want knowledge automatically captured from your work
- You want a deterministic pipeline that halts on any issue with a clear reason

## Execution

### Phase 1: Pre-Flight Checks

Validate that the workspace is in a shippable state. Any failure here halts the pipeline.

**Branch Safety**:

```bash
current_branch=$(git branch --show-current)
```

If `current_branch` is `main` or `master`: HALT. Print "Cannot ship from main/master. Create a feature branch first."

**Working Tree Status**:

```bash
git status --porcelain
```

If there are uncommitted changes:
- Show the list of modified/untracked files
- Ask: "There are uncommitted changes. Commit them now before shipping?"
- If yes: stage relevant files, create a commit with conventional message
- If no: HALT. Print "Uncommitted changes must be resolved before shipping."

**Bead Status**:

If a bead ID was provided as argument, use that. Otherwise, detect from branch name or in-progress beads:

```bash
bead_id=$(echo "$current_branch" | grep -oE 'bd-[a-z0-9-]+' | head -1)

if [ -z "$bead_id" ]; then
  bd list --status=in_progress --json | jq -r '.[].id'
fi
```

If beads are `in_progress`:
- List them with titles
- Warn: "These beads are still in_progress. They will be closed after the PR is created."
- Proceed (warning, not blocker)

If no beads found: proceed without bead tracking (branch-only ship).

### Phase 2: Sync with Upstream

Rebase onto the latest default branch to avoid merge conflicts:

```bash
default_branch=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')
if [ -z "$default_branch" ]; then
  default_branch=$(git rev-parse --verify origin/main >/dev/null 2>&1 && echo "main" || echo "master")
fi

git fetch origin "$default_branch"
git rebase "origin/$default_branch"
```

If rebase conflicts occur: HALT. Print conflicting files and instruct:
- "Rebase conflicts detected. Resolve conflicts, then run `git rebase --continue` and re-run /lavra-ship."

Do not force-push. Do not skip the rebase.

### Phase 3: Run Tests

Auto-detect the project's test runner and execute it.

**Detection order** (check for existence, run the first match):

| Check | Command |
|-------|---------|
| `package.json` has `"test"` script | `npm test` or `yarn test` or `bun test` |
| `package.json` has `"check"` script | `npm run check` |
| `Makefile` has `test` target | `make test` |
| `pytest.ini`, `pyproject.toml` with pytest, or `tests/` dir | `pytest` |
| `Gemfile` with rspec or `spec/` dir | `bundle exec rspec` |
| `Cargo.toml` | `cargo test` |
| `go.mod` | `go test ./...` |
| `.github/workflows/` with test jobs | Note: "CI will run tests. Skipping local test run." |

If tests fail: HALT. Print failure output. Do not proceed -- broken code does not ship.

If no test runner detected: print "No test runner detected. Skipping local tests." and proceed.

### Phase 4: Pre-Landing Review Gate

Run a lightweight review focused on ship-blockers only.

**4a. Goal Verification** (skippable via `lavra.json` `workflow.goal_verification: false`):

Read workflow config:

```bash
[ -f .lavra/config/lavra.json ] && cat .lavra/config/lavra.json
```

Parse `model_profile` from config (default: `"balanced"`). For each bead with a `## Validation` section, dispatch the goal-verifier agent.

**Interpret results**:
- Exists-level failures → CRITICAL (halt the ship)
- Substantive-level failures → CRITICAL (halt the ship)
- Wired-level failures → WARNING (proceed but include in PR body)

Store goal verification results for the PR body.

**4b. Security & Quality Scan**:

Scan the diff:

```bash
git diff "origin/$default_branch"...HEAD
```

**Check for**:

1. **Security issues**: hardcoded secrets, API keys, passwords, tokens, private keys
2. **Debug leftovers**: `console.log`, `debugger`, `binding.pry`, `byebug`, `import pdb`, `print(`, `TODO: remove`
3. **Hardcoded values**: localhost URLs, hardcoded IPs, test credentials
4. **Unresolved conflicts**: `<<<<<<<`, `=======`, `>>>>>>>`

**Severity classification**:

- CRITICAL (halts the ship): secrets, unresolved conflicts, credentials
- WARNING (noted but proceeds): debug leftovers, TODOs, hardcoded localhost

If CRITICAL issues found: HALT. List each issue with file and line number.

If only WARNING issues: print warnings, then proceed. Include them in PR description.

### Phase 5: Create PR

Generate the PR from accumulated context.

**Gather PR context**:

```bash
git log --oneline "origin/$default_branch"..HEAD
git diff --stat "origin/$default_branch"...HEAD
bd show {BEAD_ID} --json | jq -r '.title'
```

**Generate PR title**:

- If single bead: use bead title, prefixed with bead ID
- If multiple beads: summarize the common theme
- If no beads: derive from branch name
- Keep under 70 characters

**Push and create PR**:

```bash
git push -u origin "$current_branch"

gh pr create --title "{generated title}" --body "$(cat <<'PRBODY'
## Summary

{1-3 bullet points describing what changed and why}

## Beads Addressed

{list of bead IDs and titles, or "N/A" if no beads}

## Goal Verification

{goal-verifier results table, or "Skipped"}

## Deviations

{count} deviation(s) logged during implementation:
{list of DEVIATION: comments from beads, or "None"}

## Test Results

{test runner output summary, or "No local test runner detected"}

## Review Notes

{any WARNING items from Phase 4, or "No issues detected"}

## Changes

{git diff --stat summary}
PRBODY
)"
```

Capture and store the PR URL.

### Phase 6: Close Beads and Capture Knowledge

For each bead that was in_progress:

**Check for knowledge comments**:

```bash
bd show {BEAD_ID} | grep -cE "LEARNED:|DECISION:|FACT:|PATTERN:|INVESTIGATION:|DEVIATION:"
```

If zero knowledge comments exist: log at least one:

```bash
bd comments add {BEAD_ID} "LEARNED: {most significant insight from the work}"
```

**Close the bead**:

```bash
bd close {BEAD_ID} --reason="Shipped in PR {PR_URL}"
```

**Check for compound-worthy findings**:

```bash
bd show {BEAD_ID} | grep -cE "LEARNED:|INVESTIGATION:"
```

If LEARNED or INVESTIGATION comments exist, note this for summary.

### Phase 7: Push Beads Backup

Persist the bead state:

```bash
bd backup
git add .beads/backup/
git commit -m "chore: sync beads backup after shipping"
git push
```

### Phase 8: Summary

Print a concise ship report:

```
## Ship Complete

**PR:** {PR_URL}
**Branch:** {current_branch} -> {default_branch}

### Beads Closed
- {BEAD_ID}: {title}
(or "No beads tracked for this ship")

### Knowledge Captured
- {count} knowledge entries logged across {count} beads
(or "No knowledge entries -- consider running knowledge capture")

### Warnings
- {any WARNING items from Phase 4}
(or "None")

### Suggested Follow-ups
- Review the PR: {PR_URL}
- Monitor CI results: gh pr checks {PR_NUMBER}
```

## Success Criteria

- Branch is not main/master
- No uncommitted changes at ship time
- Rebased on latest default branch without conflicts
- Tests pass (or no test runner detected)
- No critical security or quality issues in the diff
- PR created with descriptive title and body
- All in_progress beads closed with reason linking to PR
- At least one knowledge comment per closed bead
- Beads backup pushed to remote
- Summary printed with PR URL and next steps

## Guardrails

- **Never Force-Push**: Use `git push`, never `git push --force`. Diagnose and fix if push fails.
- **Never Push to Main/Master**: If current branch is main/master, halt immediately.
- **Stop on Test Failures**: If tests fail, halt. Broken code does not ship.
- **Stop on Critical Review Findings**: Secrets, credentials, and unresolved conflicts are ship-blockers.
- **Do Not Substitute for Full Review**: Phase 4 is a safety net, not a code review. Use `/lavra-review` before or after for thorough review.
- **Bead Closure is Permanent**: Beads are closed with reason linking to PR. If PR is rejected, manually reopen beads.
