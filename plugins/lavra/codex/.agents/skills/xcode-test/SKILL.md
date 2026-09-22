---
name: xcode-test
description: Build and test an Xcode project from Codex with simulator and failure evidence.
---

# Xcode test

Identify the workspace or project, scheme, destination, and target behavior. Confirm Xcode and a suitable simulator are available. Use `xcodebuild -list` and a focused `xcodebuild test` command with a result bundle in a temporary directory. Use a configured Xcode MCP server only if the current Codex environment exposes one; otherwise use the local CLI. For UI behavior, inspect the simulator with available browser or computer-use tools. Report the build and test result, failing tests, relevant logs, simulator version, and any coverage limit. Do not install a new MCP server without a user request or documented project requirement.
