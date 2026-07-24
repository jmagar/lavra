---
name: xcode-test
description: Test iOS apps on simulator: build, install, run UI tests, capture screenshots. Triggers on "test iOS", "xcode test", "simulator test", "ios build".
compatibility: Xcode, XcodeBuildMCP, iOS Simulator
---

# Xcode iOS Testing

Build, install, and test iOS apps on the simulator. This skill handles the complete iOS testing workflow: discovering projects, booting simulators, building apps, running UI tests, checking for errors, and documenting results.

## What You Can Do

This skill helps you:
- Discover iOS projects and schemes in your codebase
- Boot iOS simulators
- Build apps for simulator testing
- Install and launch apps on simulators
- Test key screens and user flows
- Capture screenshots and logs
- Identify crashes and errors
- Report comprehensive test results

## Prerequisites

Before using this skill, verify:

- Xcode installed with command-line tools
- XcodeBuildMCP server connected (`mcp__xcodebuildmcp__*` tools available)
- Valid Xcode project or workspace
- At least one iOS Simulator available

## Step 1: Verify XcodeBuildMCP is Available

First, confirm XcodeBuildMCP tools are accessible by trying to list simulators:

```
mcp__xcodebuildmcp__list_simulators({})
```

**If the tool is not found or errors:**

Tell the user:
```markdown
**XcodeBuildMCP not installed**

Please install the XcodeBuildMCP server first:

\`\`\`bash
claude mcp add XcodeBuildMCP -- npx xcodebuildmcp@latest
\`\`\`

Then restart Claude Code and run this skill again.
```

Do NOT proceed until XcodeBuildMCP is confirmed working.

## Step 2: Discover Project and Scheme

### Find Available Projects

Query your Xcode projects:
```
mcp__xcodebuildmcp__discover_projs({})
```

This returns paths to all `.xcodeproj` and `.xcworkspace` files.

### List Available Schemes

For the project you want to test:
```
mcp__xcodebuildmcp__list_schemes({ project_path: "/path/to/Project.xcodeproj" })
```

This shows all available schemes for building.

### Use Provided Arguments

If the user provided an argument:
- Use the specified scheme name directly
- Or "current" to use the default/last-used scheme
- Otherwise, ask which scheme to test

## Step 3: Boot and Prepare Simulator

### List Available Simulators

See what simulators are available:
```
mcp__xcodebuildmcp__list_simulators({})
```

### Boot Preferred Simulator

Boot an iPhone simulator (iPhone 15 Pro recommended):
```
mcp__xcodebuildmcp__boot_simulator({ simulator_id: "[uuid]" })
```

Wait for the simulator to be ready before proceeding.

## Step 4: Build the App

Build the app for iOS Simulator:

```
mcp__xcodebuildmcp__build_ios_sim_app({
  project_path: "/path/to/Project.xcodeproj",
  scheme: "[scheme_name]"
})
```

### Handle Build Failures

If the build fails:
1. Capture the build error message
2. Create a P1 bead for each build error: `bd create "Xcode build error: [description]"`
3. Report the error to the user with specific details
4. Ask if they want to fix it now or skip testing

**On success:**
- Note the built app path (e.g., `build/MyApp.app`)
- Proceed to installation

## Step 5: Install and Launch App

### Install on Simulator

```
mcp__xcodebuildmcp__install_app_on_simulator({
  app_path: "/path/to/built/App.app",
  simulator_id: "[uuid]"
})
```

### Launch the App

```
mcp__xcodebuildmcp__launch_app_on_simulator({
  bundle_id: "[app.bundle.id]",
  simulator_id: "[uuid]"
})
```

### Start Capturing Logs

Begin log capture immediately after launch:
```
mcp__xcodebuildmcp__capture_sim_logs({
  simulator_id: "[uuid]",
  bundle_id: "[app.bundle.id]"
})
```

This captures all console output and error messages.

## Step 6: Test Key Screens

For each key screen in the app:

### Take Screenshot

```
mcp__xcodebuildmcp__take_screenshot({
  simulator_id: "[uuid]",
  filename: "screen-[name].png"
})
```

### Review Screenshot For

- UI elements rendered correctly
- No error messages visible
- Expected content displayed
- Layout looks correct
- No obvious crashes or broken layouts

### Check Logs for Errors

```
mcp__xcodebuildmcp__get_sim_logs({ simulator_id: "[uuid]" })
```

Look for:
- Crashes (stack traces)
- Exceptions and error-level messages
- Failed network requests
- Warnings that might indicate problems

## Step 7: Handle Human Verification

Some tests require manual interaction on the simulator:

| Flow Type | What to Ask |
|-----------|-------------|
| Sign in with Apple | "Please complete Sign in with Apple on the simulator" |
| Push notifications | "Send a test push notification and confirm it appears" |
| In-app purchases | "Complete a sandbox purchase and verify it works" |
| Camera/Photos | "Grant permissions and verify camera works" |
| Location | "Allow location access and verify map shows location" |

Use AskUserQuestion:
```markdown
**Human Verification Needed**

This test requires [flow type]. Please:
1. [Action to take on simulator]
2. [What to verify]

Did it work correctly?
1. Yes - continue testing
2. No - describe the issue
```

## Step 8: Handle Test Failures

When a test fails:

### Document the Failure

1. Take a screenshot of the error state
2. Capture the console logs showing the error
3. Note the exact steps that triggered it

### Ask How to Proceed

```markdown
**Test Failed: [screen/feature]**

Issue: [description]
Error: [console error message]

How to proceed?
1. Fix now - I'll help debug and fix
2. Create bead - Add as a bead for later
3. Skip - Continue testing other screens
```

### If "Fix Now"

- Investigate the issue in the code
- Propose a fix
- Rebuild and retest

### If "Create Bead"

Create a tracking bead:
```bash
bd create "Xcode test failure: [description]" --type bug --priority 1
```

## Step 9: Generate Test Summary

After all tests complete, present results:

```markdown
## Xcode Test Results

**Project:** [project name]
**Scheme:** [scheme name]
**Simulator:** [simulator name and OS version]

### Build Status: Success / Failed

### Screens Tested: [count]

| Screen | Status | Notes |
|--------|--------|-------|
| Launch | Pass | |
| Home | Pass | |
| Settings | Fail | Crash on tap |
| Profile | Skip | Requires authentication |

### Console Errors: [count]
- [List error messages found]

### Human Verifications: [count]
- Sign in with Apple: Confirmed
- Push notifications: Confirmed

### Test Failures: [count]
- Settings screen - crash on settings navigation

### Created Beads: [count]
- BD-XXX: Xcode test failure - settings crash

### Overall Result: [PASS / FAIL / PARTIAL]
```

## Step 10: Cleanup

After testing completes:

### Stop Log Capture

```
mcp__xcodebuildmcp__stop_log_capture({ simulator_id: "[uuid]" })
```

### Optionally Shutdown Simulator

```
mcp__xcodebuildmcp__shutdown_simulator({ simulator_id: "[uuid]" })
```

## Success Criteria

- [ ] XcodeBuildMCP confirmed working before proceeding
- [ ] App builds successfully for simulator
- [ ] App installs and launches on simulator
- [ ] Key screens tested with screenshots captured
- [ ] Console logs checked for crashes and errors
- [ ] Test summary report created with Pass/Fail/Skip status
