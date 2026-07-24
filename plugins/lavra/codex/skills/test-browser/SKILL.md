---
name: test-browser
description: Test affected pages for regressions, console errors, and workflow breakages. Triggers on "test pages", "browser test", "qa test", "test changes", "verify pages".
compatibility: agent-browser CLI, Git, GitHub CLI
---

# Browser Testing

Test affected pages in your browser to catch integration bugs, CSS/layout regressions, broken workflows, and console errors. This skill helps you verify that your changes work correctly from the user's perspective.

## What You Can Do

This skill helps you:
- Test pages affected by your PR or branch
- Navigate to each changed route and verify functionality
- Capture screenshots of key states
- Click elements and fill forms to test interactions
- Identify console errors and broken behavior
- Document test results with Pass/Fail/Skip status

## Prerequisites

Before using this skill, verify:

- Local development server running (e.g., `bin/dev`, `npm run dev`, `rails server`)
- agent-browser CLI installed globally: `command -v agent-browser`
- Git repository with changes to test
- Access to the remote repository for PR information

## Step 0: Verify agent-browser Installation

Before starting ANY browser testing, verify agent-browser is installed:

```bash
command -v agent-browser >/dev/null 2>&1 && echo "Ready" || \
  (echo "Installing..." && npm install -g agent-browser && agent-browser install)
```

If installation fails, inform the user and stop. The agent-browser CLI downloads Chromium (~160MB) and is required for all testing.

### agent-browser CLI Reference

```bash
# Navigation
agent-browser open <url>           # Navigate to URL
agent-browser back                 # Go back
agent-browser close                # Close browser

# Snapshots (get element references)
agent-browser snapshot -i          # Interactive elements with refs (@e1, @e2)
agent-browser snapshot -i --json   # JSON output of elements

# Interactions (use refs from snapshot)
agent-browser click @e1            # Click element
agent-browser fill @e1 "text"      # Fill input (clears then types)
agent-browser type @e1 "text"      # Type without clearing
agent-browser press Enter          # Press keyboard key

# Screenshots
agent-browser screenshot out.png       # Viewport screenshot
agent-browser screenshot --full out.png # Full page screenshot

# Headed mode (watch tests run)
agent-browser --headed open <url>      # Open visible browser
agent-browser --headed click @e1       # Click in visible browser

# Wait
agent-browser wait @e1             # Wait for element to appear
agent-browser wait 2000            # Wait N milliseconds
```

## Step 1: Choose Browser Mode

Before starting tests, ask the user if they want to watch:

Use AskUserQuestion with:
- Question: "Do you want to watch the browser tests run?"
- Option 1: **Headed (watch)** - Opens visible browser window
- Option 2: **Headless (faster)** - Runs in background, faster

Store the choice and use `--headed` flag when the user selects "Headed".

## Step 2: Determine What to Test

Identify which pages are affected by the changes:

### If PR Number Provided

Query GitHub for changed files:
```bash
gh pr view [number] --json files -q '.files[].path'
```

### If 'current' or No Argument

Compare with main branch:
```bash
git diff --name-only main...HEAD
```

### If Branch Name Provided

Compare branch with main:
```bash
git diff --name-only main...[branch]
```

## Step 3: Map Files to Routes

Create a list of URLs to test based on changed files:

| File Pattern | Route(s) |
|-------------|----------|
| `app/views/users/*` | `/users`, `/users/:id`, `/users/new` |
| `app/controllers/settings_controller.rb` | `/settings`, `/settings/profile` |
| `app/javascript/controllers/*_controller.js` | Pages using that Stimulus controller |
| `app/components/*_component.rb` | Pages rendering that component |
| `app/views/layouts/*` | All pages (test homepage minimum) |
| `app/assets/stylesheets/*` | Visual regression on key pages |
| `app/helpers/*_helper.rb` | Pages using that helper |
| `src/app/*` (Next.js) | Corresponding routes |
| `src/components/*` | Pages using those components |

Build a prioritized list of URLs. Focus on:
- Pages most likely to be affected
- Critical user workflows
- New functionality added

## Step 4: Verify Server is Running

Before testing, confirm the local server is accessible:

```bash
agent-browser open http://localhost:3000
agent-browser snapshot -i
```

**If server is not running**, inform the user:
```markdown
**Server not running**

Please start your development server:
- Rails: \`bin/dev\` or \`rails server\`
- Node/Next.js: \`npm run dev\`
- Other: [appropriate start command]

Then run this skill again.
```

## Step 5: Test Each Affected Page

For each affected route, use agent-browser CLI commands:

### Test Template for Each Page

**Step 1: Navigate and snapshot**
```bash
agent-browser open "http://localhost:3000/[route]"
agent-browser snapshot -i
```

**Step 2: Verify key elements**
- Page title/heading present
- Primary content rendered correctly
- No error messages visible
- Forms have expected fields
- Images loaded successfully

**Step 3: Test critical interactions**
```bash
agent-browser click @e1  # Use ref from snapshot
agent-browser snapshot -i
```

**Step 4: Fill forms if relevant**
```bash
agent-browser fill @e1 "test data"
agent-browser fill @e2 "more data"
agent-browser press Enter  # or click submit button
agent-browser snapshot -i
```

**Step 5: Take screenshots**
```bash
agent-browser screenshot page-name.png
agent-browser screenshot --full page-name-full.png  # Full page for scrolled content
```

### Headed Mode Testing (If User Chose to Watch)

```bash
agent-browser --headed open "http://localhost:3000/[route]"
agent-browser --headed snapshot -i
agent-browser --headed click @e1
agent-browser --headed screenshot page.png
```

## Step 6: Handle Human Verification

Some tests require manual interaction on the local dev server:

| Flow Type | What to Ask |
|-----------|-------------|
| OAuth login | "Please sign in with [provider] and confirm it works" |
| Email delivery | "Check your inbox for the test email and confirm receipt" |
| Payments/Stripe | "Complete a test purchase in sandbox mode" |
| SMS codes | "Verify you received the SMS code" |
| External APIs | "Confirm the [service] integration is working" |

Use AskUserQuestion:
```markdown
**Human Verification Needed**

This test touches [flow type]. Please:
1. [Action to take in the browser/app]
2. [What to verify]

Did it work correctly?
1. Yes - continue testing
2. No - describe the issue
```

## Step 7: Handle Test Failures

When a test fails:

### Document the Failure

1. Take a screenshot of the error state: `agent-browser screenshot error.png`
2. Note the exact reproduction steps
3. Check if there are console errors

### Ask User How to Proceed

```markdown
**Test Failed: [route]**

Issue: [description]
Console errors: [if any]

How to proceed?
1. Fix now - I'll help debug and fix
2. Create bead - Add as a bead for later
3. Skip - Continue testing other pages
```

### If "Fix Now"

- Investigate the issue in code
- Propose a fix
- Apply the fix
- Re-run the failing test to verify

### If "Create Bead"

Create a tracking bead:
```bash
bd create "Browser test failure: [description]" --type bug --priority 1
```

### If "Skip"

Log as skipped and continue with remaining tests.

## Step 8: Generate Test Summary

After all tests complete, present comprehensive results:

```markdown
## Browser Test Results

**Test Scope:** PR #[number] / [branch name] / [commit range]
**Server:** http://localhost:3000
**Test Mode:** [Headed / Headless]

### Pages Tested: [count]

| Route | Status | Notes |
|-------|--------|-------|
| `/users` | Pass | All elements render, form submits |
| `/settings` | Pass | Settings form works |
| `/dashboard` | Fail | Console error: TypeError |
| `/checkout` | Skip | Requires payment credentials |

### Console Errors: [count]
- [List error messages and where they occurred]

### Human Verifications: [count]
- OAuth flow: Confirmed working
- Email delivery: Confirmed received

### Test Failures: [count]
- `/dashboard` - TypeError on page load

### Created Beads: [count]
- BD-XXX: Browser test failure - dashboard error

### Test Coverage

Changed files: [count]
Pages tested: [count]
Coverage: [%]

### Overall Result: [PASS / FAIL / PARTIAL]
```

### Test Result Interpretation

- **PASS** - All pages tested successfully, no failures
- **FAIL** - One or more critical pages failed
- **PARTIAL** - Some pages tested, some skipped or failed

## Important: Do NOT Use Chrome MCP Tools

This skill uses **agent-browser CLI exclusively**. The agent-browser CLI is a Bash-based tool from Vercel that runs headless Chromium.

**DO NOT use Chrome MCP tools** like `mcp__claude-in-chrome__*`. Use `agent-browser` Bash commands instead.

If you find yourself about to call Chrome MCP tools, STOP and use the appropriate agent-browser command instead.

## Success Criteria

- [ ] agent-browser CLI verified as installed
- [ ] Server running and accessible
- [ ] All affected pages tested
- [ ] Each page has Pass/Fail/Skip status
- [ ] Console errors captured and reported
- [ ] Screenshots taken for key pages
- [ ] Test failures documented with reproduction steps
- [ ] Comprehensive summary report generated
