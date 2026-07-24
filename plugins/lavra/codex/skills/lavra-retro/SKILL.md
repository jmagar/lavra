---
name: lavra-retro
description: Weekly retrospective analyzing shipping, velocity, and knowledge patterns. Surfaces recurring themes, identifies gaps, synthesizes team learning.
compatibility: Requires beads (bd) CLI, git repository, GitHub CLI (gh) optional
---

# Lavra Retrospective

Run a retrospective that analyzes what shipped, how the team performed, and what patterns emerged. Synthesizes knowledge.jsonl entries to surface recurring themes, compound learning, and knowledge gaps. Outputs a markdown report and saves a snapshot for trend tracking.

## When to Use

- End of week or sprint to review progress and performance
- Analyzing team velocity and work patterns over a time period
- Synthesizing knowledge entries to find recurring themes and systemic issues
- Creating trend snapshots for future retrospective comparison
- Identifying knowledge gaps in heavily-worked areas

## Execution

### Phase 1: Time Window

Parse arguments for time range:
- Default: last 7 days
- `--window Nd` sets the window to N days back from today
- `--since YYYY-MM-DD` sets an explicit start date

Calculate the since date:

```bash
if [ -n "$SINCE" ]; then
  since_date="$SINCE"
elif [ -n "$WINDOW" ]; then
  days="${WINDOW%d}"
  since_date=$(date -v-${days}d +%Y-%m-%d 2>/dev/null || date -d "${days} days ago" +%Y-%m-%d)
else
  since_date=$(date -v-7d +%Y-%m-%d 2>/dev/null || date -d "7 days ago" +%Y-%m-%d)
fi
until_date=$(date +%Y-%m-%d)
```

Load previous retro snapshot for trend comparison:

```bash
ls -1 .lavra/retros/*.json 2>/dev/null | sort | tail -1
```

### Phase 2: Shipping Analysis

Analyze git history within the window.

**Identify the current user**:

```bash
git config user.email
git config user.name
```

Use this to distinguish "You" from teammates in all output.

**Commit breakdown**:

```bash
git log --since="$since_date" --until="$until_date" --format="%H|%an|%ae|%s" --no-merges
```

Compute:
- Total commits by author
- Commit type breakdown using conventional commit prefixes (feat/fix/refactor/test/chore/docs)
- Commits that don't follow conventional format (flag as "untyped")

**Diff statistics**:

```bash
git log --since="$since_date" --until="$until_date" --shortstat --no-merges --format=""
```

Aggregate: files changed, lines added, lines removed.

**Hotspot files** (most frequently changed):

```bash
git log --since="$since_date" --until="$until_date" --name-only --no-merges --format="" | sort | uniq -c | sort -rn | head -10
```

**PR activity**:

```bash
gh pr list --state merged --search "merged:>=$since_date" --json number,title,author,mergedAt,additions,deletions
gh pr list --state open --json number,title,author,createdAt
```

Compute: PRs merged, PRs still open, merge rate.

### Phase 3: Beads Analysis

Analyze bead activity within the window.

**Bead throughput**:

```bash
bd list --json
```

Filter by timestamps within the window:
- Beads created in the window
- Beads closed in the window
- Beads still open/in-progress

**Cycle time**:

For beads closed in the window, calculate time from creation to closure. Report:
- Average cycle time
- Fastest and slowest beads (with IDs and titles)

**Blocked beads**:

```bash
bd list --status=blocked --json 2>/dev/null || true
```

List blocked beads with their blocking reasons.

**Epic progress**:

```bash
bd list --type=epic --json 2>/dev/null || true
```

For each epic, count children by status and report percentage complete.

### Phase 4: Work Patterns

Analyze temporal patterns from git timestamps.

**Session detection**:

Parse commit timestamps and group into sessions using a 45-minute gap threshold. Classify sessions:
- **Deep work**: 3+ commits spanning 60+ minutes
- **Quick fix**: 1-2 commits spanning less than 30 minutes
- **Standard**: everything else

Report: number of sessions by type, average session length.

**Peak hours**:

```bash
git log --since="$since_date" --until="$until_date" --format="%H" --no-merges | sort | uniq -c | sort -rn | head -5
```

Report the top 5 most active hours.

**Velocity trend**:

If a previous retro snapshot exists, compare:
- Commits this period vs last period
- Beads closed this period vs last period
- Knowledge entries this period vs last period

Express as percentage change with direction indicator.

### Phase 5: Team Breakdown

For each contributor in the window (skip for solo projects):

**What they shipped**:

List their specific commits grouped by type. Limit to the 10 most significant commits per person (prioritize feat > fix > refactor > others).

**Strengths demonstrated**:

Anchor observations in actual work:
- "Shipped 3 security fixes across auth and payments" (not "Good at security")
- "Refactored the billing pipeline from 400 to 180 lines" (not "Writes clean code")

Only make claims directly supported by commit data.

**Growth opportunities**:

Be specific, constructive, and kind:
- "12 of 15 commits lack conventional prefixes -- adopting them would make changelogs easier"
- "No test commits this week -- consider pairing tests with the 3 new features"

Frame as opportunities, not criticisms.

**AI-assisted work**:

Count commits with `Co-Authored-By` trailers containing AI indicators (Claude, Copilot, GPT, etc.). Report as a percentage of their total commits.

### Phase 6: Knowledge Synthesis

Read and analyze the knowledge base.

**Load knowledge entries from the window**:

```bash
cat .lavra/memory/knowledge.jsonl | while IFS= read -r line; do
  ts=$(echo "$line" | jq -r '.ts')
  if [ "$ts" -ge "$(date -j -f '%Y-%m-%d' "$since_date" +%s 2>/dev/null || date -d "$since_date" +%s)" ]; then
    echo "$line"
  fi
done
```

**Tag frequency analysis**:

Group entries by tags. Report the top 10 most frequent tags with counts.

**Type breakdown**:

Count entries by type (LEARNED, DECISION, FACT, PATTERN, INVESTIGATION). A healthy distribution has all types represented.

**Recurring patterns**:

Identify clusters: topics that appear 3+ times in the window. For each cluster:
- Summarize the theme
- List the specific entries
- Assess whether this is a systemic issue or normal domain complexity

For genuine recurring issues, create a new PATTERN entry:

```bash
bd comments add {RELEVANT_BEAD_ID} "PATTERN: Recurring theme from retro -- {description of the pattern and its frequency}"
```

**Knowledge gaps**:

Cross-reference: for each hotspot file and each closed bead, check whether any knowledge entries reference them. Files or beads with significant activity but zero knowledge entries represent gaps.

Report these gaps with a recommendation: "Consider running knowledge capture on {bead} to document what was learned."

**Trend comparison**:

If a previous retro snapshot exists, compare:
- Top tags this period vs last period
- New topics that appeared
- Topics that disappeared (potentially resolved)

### Phase 7: Output

**Generate markdown report** with sections:

```markdown
# Retrospective: {since_date} to {until_date}

## Summary
This week: N features shipped, M bugs fixed, K knowledge entries captured.
Top pattern: {most frequent recurring theme}.
Velocity: {up/down/stable} vs previous period.

## Shipping
{Commit breakdown table}
{Hotspot files}
{PR activity}

## Beads
{Throughput: created vs closed}
{Cycle time stats}
{Blocked beads}
{Epic progress}

## Work Patterns
{Session analysis}
{Peak hours}
{Velocity trend}

## Team
{Per-contributor breakdown -- omit for solo projects}

## Knowledge
{Tag frequency}
{Type breakdown}
{Recurring patterns}
{Knowledge gaps}
{Trend comparison}

## Action Items
{Synthesized from all sections: what to do differently next week}
```

**Save snapshot** to `.lavra/retros/{until_date}.json` containing:

```json
{
  "date": "{until_date}",
  "window": { "since": "{since_date}", "until": "{until_date}" },
  "shipping": {
    "total_commits": N,
    "by_type": { "feat": N, "fix": N, "refactor": N, "test": N, "chore": N, "docs": N },
    "files_changed": N,
    "lines_added": N,
    "lines_removed": N,
    "prs_merged": N,
    "hotspot_files": ["file1", "file2"]
  },
  "beads": {
    "created": N,
    "closed": N,
    "avg_cycle_time_hours": N,
    "blocked": N
  },
  "patterns": {
    "sessions": { "deep_work": N, "quick_fix": N, "standard": N },
    "peak_hours": [H1, H2, H3]
  },
  "knowledge": {
    "total_entries": N,
    "by_type": { "learned": N, "decision": N, "fact": N, "pattern": N, "investigation": N },
    "top_tags": ["tag1", "tag2", "tag3"],
    "recurring_themes": ["theme1", "theme2"],
    "gaps": ["file_or_bead_with_no_knowledge"]
  }
}
```

## Success Criteria

- Time window correctly parsed (default 7d, or from arguments)
- Git history analyzed with commit type breakdown
- Bead throughput and cycle time calculated
- Work patterns detected (sessions, peak hours)
- Team breakdown shows specific, anchored observations (or skipped for solo projects)
- Knowledge.jsonl entries analyzed for tag frequency and recurring themes
- Knowledge gaps identified (active areas with no captured knowledge)
- Snapshot saved to .lavra/retros/ for future trend comparison
- Markdown report output with all sections

## Guardrails

- **Praise is Specific**: Never write generic praise like "Great work this week." Every positive observation must reference a specific commit, PR, or metric.
- **Growth Feedback is Constructive**: Frame growth areas as opportunities with clear next steps. Never criticize.
- **Identify "You" Correctly**: Use `git config user.email` to determine the current user. Label their work as "You" in the report.
- **Handle Solo Projects Gracefully**: If all commits belong to a single author, skip the Team Breakdown section entirely.
- **Knowledge Synthesis is the Priority**: The shipping and pattern analysis is table stakes. The real value is in Phase 6: surfacing recurring themes, identifying knowledge gaps, and creating PATTERN entries.
- **Snapshots Enable Trends**: Always save the snapshot, even for the first retro. Future retros depend on having historical data for comparison.
