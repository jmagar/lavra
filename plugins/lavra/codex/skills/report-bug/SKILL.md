---
name: report-bug
description: File bug reports with structured details, environment info, and create GitHub issues. Triggers on "report bug", "file issue", "file bug", "submit issue".
compatibility: GitHub CLI, bash
---

# Report a Bug

Structure and submit bug reports systematically. This skill guides you through collecting all necessary information, formatting findings clearly, and creating a GitHub issue that helps maintainers understand and fix the problem.

## What You Can Do

This skill helps you:
- Gather comprehensive bug information
- Collect environment details automatically
- Format bug reports professionally
- Create GitHub issues with well-structured data
- Provide clear reproduction steps and error messages

## Workflow Overview

The bug reporting process has four phases:

1. **Gather Bug Information** - Collect details about what went wrong
2. **Collect Environment Information** - Capture system and version details
3. **Format the Bug Report** - Structure all information clearly
4. **Create GitHub Issue** - Submit the report to maintainers

## Phase 1: Gather Bug Information

Use structured questions to collect all relevant details:

### Question 1: Bug Category

Ask the user to identify the type of issue:
- Agent not working
- Command not working
- Skill not working
- MCP server issue
- Installation problem
- Other

### Question 2: Specific Component

Ask which specific component is affected:
- Component name (e.g., "lavra-design", "agent-browser", "Context7")
- Be specific rather than vague

### Question 3: What Happened (Actual Behavior)

Ask clearly: "What happened when you used this component?"
- Get a detailed description of the actual behavior
- Include what the user saw or experienced
- Note any unexpected results

### Question 4: What Should Have Happened (Expected Behavior)

Ask: "What did you expect to happen instead?"
- Get a clear description of expected behavior
- What should the component do?
- What should the user experience?

### Question 5: Steps to Reproduce

Ask: "What steps did you take before the bug occurred?"
- Get numbered reproduction steps
- Include exact commands run
- Include any arguments or options used
- Include state before the action

### Question 6: Error Messages

Ask: "Did you see any error messages? If so, please share them."
- Capture the exact error output
- Include stack traces if available
- Include any warnings or exceptions

## Phase 2: Collect Environment Information

Automatically gather system and version information:

```bash
# Get plugin version
cat ~/.claude/plugins/installed_plugins.json 2>/dev/null | \
  grep -A5 "lavra" | head -10 || echo "Plugin info not found"

# Get Claude Code version
claude --version 2>/dev/null || echo "Claude CLI version unknown"

# Get OS information
uname -a
```

This provides context about the environment where the bug occurred.

## Phase 3: Format the Bug Report

Organize all collected information into a structured report:

```markdown
## Bug Description

**Component:** [Type] - [Name]
**Summary:** [Brief description from argument or collected info]

## Environment

- **Plugin Version:** [from installed_plugins.json]
- **Claude Code Version:** [from claude --version]
- **OS:** [from uname -a]

## What Happened

[Actual behavior description - what the user experienced]

## Expected Behavior

[Expected behavior description - what should have happened]

## Steps to Reproduce

1. [Step 1 with exact command or action]
2. [Step 2 with exact command or action]
3. [Step 3 with exact command or action]

## Error Messages

\`\`\`
[Any error output or exception]
[Include full stack traces if available]
\`\`\`

## Additional Context

[Any other relevant information]
- Recent changes that triggered the bug
- Workarounds discovered
- Related issues or history

---
*Reported via `/report-bug` skill*
```

### Report Guidelines

**Be thorough but concise:**
- Include all relevant details
- Remove unrelated information
- Make it easy to scan

**Be specific:**
- Use exact command lines
- Include file paths when relevant
- Use version numbers, not "latest"

**Include evidence:**
- Error messages and stack traces
- Screenshots if UI-related
- Relevant file contents if small

## Phase 4: Create GitHub Issue

Use the GitHub CLI to create the issue:

### Create the Issue

```bash
gh issue create \
  --repo rbm/lavra \
  --title "[lavra] Bug: [Brief description]" \
  --body "[Formatted bug report from Phase 3]" \
  --label "bug"
```

### If Labels Don't Exist

Create without labels:
```bash
gh issue create \
  --repo rbm/lavra \
  --title "[lavra] Bug: [Brief description]" \
  --body "[Formatted bug report]"
```

### Confirm Submission

After the issue is created:
1. Display the issue URL to the user
2. Thank them for reporting the bug
3. Let them know the maintainer will be notified
4. Offer to help create a workaround if available

## Error Handling

### If `gh` CLI is Not Authenticated

Prompt the user to authenticate first:
```bash
gh auth login
```

Then retry creating the issue.

### If Issue Creation Fails

Display the formatted report so the user can manually create the issue if needed.

### If Required Information is Missing

Re-prompt for that specific field before proceeding.

## Privacy and Security

This skill does NOT collect:
- Personal information unrelated to the bug
- API keys or credentials
- Private code from projects
- File paths beyond what's necessary

Only technical information about the bug is included in the report. The user always reviews the formatted report before submission.

## Handoff

After the issue is created:
1. **Issue URL** - Provide the link to the new issue
2. **Track** - Note the issue number for reference
3. **Follow up** - Monitor for maintainer responses and questions
