---
name: lavra-qa
description: Test implemented changes with agent-browser CLI from user perspective. Detect changed files, map to routes, generate test scenarios, verify interactions/content/errors. Smoke test (--quick) or full mode. Catch regressions unit tests miss.
---

# lavra-qa

Verify that implemented changes work correctly from the user's perspective by running systematic browser-based tests against the running application. Sits between implementation and shipping, catching visual regressions, broken interactions, console errors, and workflow breakages that unit tests miss.

## Overview

This skill automates QA testing using the `agent-browser` CLI. It identifies changed files, maps them to routes, generates test scenarios, and executes browser tests to verify functionality.

## Important Guardrails

**DO NOT use Chrome MCP tools (mcp__claude-in-chrome__*).**

This skill uses the `agent-browser` CLI exclusively. The agent-browser CLI is a Bash-based tool from Vercel that runs headless Chromium. It is NOT the same as Chrome browser automation via MCP.

**DO NOT force browser QA on non-UI work.** If the diff shows only backend/CLI/library/infra changes with no web UI impact, suggest skipping.

## Input

Optional arguments:
- `--quick` flag: smoke test mode (load pages, check for errors, done)
- No flag: full mode (all test scenarios, interactive elements, edge cases)
- Bead ID: use bead description to understand what was implemented

## Process

### Phase 0: Mode Detection

Parse arguments to determine mode:
- `--quick` = smoke test (fast)
- No flag = full test suite
- Bead ID = use for context

If a bead ID provided:
```bash
bd show {BEAD_ID} --json
```

Read the bead description to understand acceptance criteria and what was implemented.

### Phase 1: Scope Detection

**Identify changed files:**

```bash
# If on a feature branch
git diff --name-only $(git merge-base HEAD main)..HEAD

# Fallback: unstaged + staged changes
git diff --name-only HEAD
```

**Detect framework and map files to routes:**

| Framework | Detection | Route Mapping |
|-----------|-----------|---------------|
| Next.js | `next.config.*` or `src/app/` | `src/app/**/page.tsx` -> URL path |
| Rails | `Gemfile` with `rails` | `config/routes.rb` + controllers/views |
| Django | `manage.py` or `urls.py` | `urls.py` patterns + views |
| Laravel | `artisan` | `routes/web.php` + controllers |
| Remix | `remix.config.*` | `app/routes/` directory |
| SvelteKit | `svelte.config.*` | `src/routes/` directory |
| Nuxt | `nuxt.config.*` | `pages/` directory |
| Generic SPA | `index.html` + router | Router config file |

**Check for non-UI changes:**

If ALL changed files are backend-only (models, services, APIs, migrations, infrastructure), suggest skipping QA.

**Build test URL list** from file-to-route mapping.

Present the QA test plan to the user and ask:
1. What is the base URL for the running app? (default: http://localhost:3000)
2. What routes should be tested? (can add/remove from list)

### Phase 2: Server Verification

**Verify agent-browser is installed:**

```bash
command -v agent-browser >/dev/null 2>&1 && echo "Ready" || (echo "Installing..." && npm install -g agent-browser && agent-browser install)
```

**Ask browser mode:**

Do you want to watch the browser tests run?
1. **Headed (watch)** - Visible browser window
2. **Headless (faster)** - Background (invisible)

**Verify server is reachable:**

```bash
agent-browser open {BASE_URL}
agent-browser snapshot -i
```

If server is not running, ask user to start it and provide correct URL.

### Phase 3: Test Plan Generation

For each affected route, generate test scenarios based on mode:

**--quick mode (smoke test):**
- Page loads without errors
- No console errors/warnings
- Key heading/content is present
- Screenshot for evidence

**Full mode (default):**
- Page loads without errors
- Console has no errors/warnings
- Key headings and content render correctly
- Navigation elements work (links, tabs, breadcrumbs)
- Forms: fields present, validation fires, submission works
- Buttons and interactive elements respond to clicks
- Changed functionality behaves as specified in the bead
- Data displays correctly (tables, lists, cards)
- Responsive check: viewport resize if layout changes
- Authentication-gated pages accessible when logged in

Present the test plan for user approval before executing.

### Phase 4: Execution

For each route in the test plan:

**Step 1: Navigate and assess**
```bash
agent-browser open "{BASE_URL}{route}"
agent-browser snapshot -i
agent-browser get title
```

**Step 2: Check for errors**
```bash
agent-browser snapshot -i --json
```

Look for error messages, 404/500 pages, missing content, broken layouts.

**Step 3: Test interactive elements (full mode only)**

For forms:
```bash
agent-browser snapshot -i
agent-browser fill @e1 "test input"
agent-browser click @submit_ref
agent-browser snapshot -i  # Check result
```

For navigation:
```bash
agent-browser click @nav_ref
agent-browser snapshot -i
agent-browser back
```

For dynamic content:
```bash
agent-browser click @trigger_ref
agent-browser wait 1000
agent-browser snapshot -i
```

**Step 4: Take screenshots**
```bash
agent-browser screenshot qa-{route-slug}.png
agent-browser screenshot --full qa-{route-slug}-full.png
```

**Step 5: Record result**

Assign each page a health score:
- **PASS** - Page loads, no errors, interactions work as expected
- **WARN** - Page loads but has minor issues (non-critical warnings, minor visual issues)
- **FAIL** - Page broken, console errors, interactions fail, content missing

### Phase 5: Handle Failures

When a test fails:

1. **Document the failure:**
   ```bash
   agent-browser screenshot qa-fail-{route-slug}.png
   ```

2. **Ask user how to proceed:**
   - **Fix now** - Investigate and fix the issue
   - **Create bead** - Track as a bug for later
   - **Skip** - Accept and continue testing

3. **If "Fix now":**
   - Investigate root cause
   - Propose and apply fix
   - Re-run the failing test to verify

4. **If "Create bead":**
   ```bash
   bd create "QA failure: {description} on {route}" --type bug --priority 1
   ```
   Continue testing remaining routes.

5. **If "Skip":**
   - Log as skipped with reason
   - Continue testing

### Phase 6: Results

After all routes tested, present summary:

```markdown
## QA Results

**Mode:** [quick/full]
**Base URL:** {BASE_URL}
**Bead:** {BEAD_ID} (if provided)

### Pages Tested: [count]

| Route | Health | Notes |
|-------|--------|-------|
| /users | PASS | |
| /settings | WARN | Minor layout shift on mobile |
| /dashboard | FAIL | Console error: TypeError in chart.js |

### Console Errors: [count]
- [List errors with route]

### Failures: [count]
- {route} - {issue description}

### Beads Created: [count]
- {BEAD_ID}: {title}

### Result: [PASS / WARN / FAIL]
```

**Log knowledge for unexpected findings:**
```bash
bd comments add {BEAD_ID} "LEARNED: {unexpected behavior discovered during QA}"
```

**Close the browser:**
```bash
agent-browser close
```

### Phase 7: Next Steps

After QA completes:

**If PASS:**
1. Run `/lavra-review` - Code review before shipping
2. Close bead - Mark as complete: `bd close {BEAD_ID}`
3. Ship it - Push and create PR

**If WARN or FAIL:**
1. Fix issues - Address failures before shipping
2. Run `/lavra-review` - Code review (issues noted but accepted)
3. Create beads for failures - Track issues separately and ship
4. Re-run QA - Test again after fixes

## Success Criteria

- [ ] Changed files identified and mapped to routes
- [ ] Non-UI changes correctly detected (skip suggested)
- [ ] Dev server verified as running
- [ ] All affected pages tested with agent-browser CLI
- [ ] Each page has a PASS/WARN/FAIL health score
- [ ] Console errors captured and reported
- [ ] Screenshots taken as evidence
- [ ] Failures documented with reproduction steps
- [ ] Fix beads created for unresolved failures
- [ ] Knowledge logged for unexpected behaviors
