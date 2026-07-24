---
name: reproduce-bug
description: Investigate bugs via logs, browser testing, and code analysis. Triggers on "reproduce bug", "investigate issue", "debug bug", "verify crash", "root cause".
compatibility: GitHub CLI, agent-browser, Rails console
---

# Reproduce and Investigate Bugs

Systematically reproduce and investigate bugs by analyzing logs, examining code, taking screenshots, and documenting all findings. This skill helps you understand what's happening, why it's broken, and what needs to be fixed.

## What You Can Do

This skill helps you:
- Read and understand GitHub issue descriptions
- Investigate logs from multiple sources (Rails console, error tracking services)
- Visually reproduce bugs in a browser
- Capture evidence with screenshots
- Document findings with specific file paths and line numbers
- Report comprehensive findings back to the issue

## Workflow Overview

The investigation follows four phases:

1. **Log Investigation** - Analyze logs and error tracking data
2. **Visual Reproduction** - Reproduce in browser if UI-related
3. **Code Analysis** - Examine relevant source code
4. **Documentation** - Report findings with evidence

## Phase 1: Log Investigation

### Step 1: Understand the Issue

Read the GitHub issue thoroughly:
- Issue title and description
- Reproduction steps
- Expected vs. actual behavior
- Any attached logs or error messages

### Step 2: Investigate Logs from Multiple Sources

Run these investigation steps in parallel:

1. **Rails Console Investigation**
   - Look for related models and their recent state
   - Check database queries that might be involved
   - Look for any error-related logging
   - Search for the affected entities or workflows

2. **Error Tracking Investigation**
   - Check AppSignal, Sentry, or similar services
   - Look for exceptions matching the issue description
   - Review error patterns and frequency
   - Note any related stack traces

### Step 3: Iterate and Refine

As you gather information:
- Think about where the bug could originate in the codebase
- Look for logging output that would help reproduce it
- Run investigations multiple times with refined queries
- Build a hypothesis about what's happening

Keep running these agents until you have a good idea of what's going wrong.

## Phase 2: Visual Reproduction with Browser

If the bug is UI-related or involves user workflows, visually reproduce it:

### Step 1: Verify Server is Running

```bash
agent-browser open "http://localhost:3000"
agent-browser snapshot -i
```

If the server is not running, ask the user to start it (`bin/dev`, `rails server`, or equivalent).

### Step 2: Navigate to Affected Area

Based on the issue description, navigate to the relevant page:

```bash
agent-browser open "http://localhost:3000/[affected_route]"
agent-browser snapshot -i
```

View the current state and take a snapshot to see what elements are available.

### Step 3: Capture Screenshots

Take screenshots at each step of reproducing the bug:

```bash
agent-browser screenshot "bug-[issue]-step-1.png"
```

### Step 4: Follow User Flow

Reproduce the exact steps from the issue:

1. Read the issue's reproduction steps carefully
2. Execute each step using agent-browser:
   - `agent-browser click @e1` for clicking elements (use ref from snapshot)
   - `agent-browser fill @e1 "text"` for filling form fields
   - `agent-browser snapshot -i` to see the current state
   - `agent-browser screenshot` to capture evidence
   - `agent-browser press Enter` to submit forms or trigger actions

### Step 5: Capture the Bug State

When you successfully reproduce the bug:
- Take a screenshot of the error state
- Note the exact steps that caused it
- Check for any JavaScript console errors
- Document what the user sees vs. what should happen

## Phase 3: Document Findings

Gather comprehensive documentation:

- [ ] Bug reproduced with specific steps
- [ ] Screenshots showing the bug
- [ ] Console errors (if any)
- [ ] File paths and line numbers of relevant code
- [ ] Database state or API responses involved
- [ ] Browser version and environment details

### Key Information to Include

For each finding:
- **Specific file path:** `app/services/example_service.rb:42`
- **Line number:** Exact location of relevant code
- **What's wrong:** The buggy behavior
- **Why it's wrong:** What the code should do instead
- **How to trigger:** Exact reproduction steps

## Phase 4: Report Back

Add a comprehensive comment to the GitHub issue with:

### 1. Summary

A clear, one-paragraph summary of what the bug is and what you discovered.

### 2. Reproduction Steps (Verified)

Exact steps to reproduce:
```
1. [Action 1]
2. [Action 2]
3. [What happens at this point]
```

### 3. Screenshots

Upload captured screenshots showing:
- The error state
- Key steps in the reproduction process
- Expected vs. actual behavior

### 4. Relevant Code

Reference specific files and line numbers:
```
- app/models/user.rb:87 - bug is here because...
- app/services/payment_service.rb:156 - this call doesn't handle...
```

### 5. Root Cause Analysis

Explain what you think is happening:
- What code is executing
- What should happen vs. what actually happens
- Why the current behavior is wrong

### 6. Suggested Fix (Optional)

If you have a hypothesis about the fix:
- What needs to change
- Where the change should go
- Why this would fix the bug

### 7. Environment Information

Include:
- Browser and OS
- Server running state
- Any relevant configuration

## Handoff

When your investigation is complete:

1. **Comment on the issue** with all findings and evidence
2. **Create a bead** if further work is needed: `bd create "Fix: [bug description]" --type bug --priority [1-5]`
3. **Hand to developer** with clear reproduction and suspected cause
