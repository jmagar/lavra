---
name: git-worktree
description: Create, inspect, and clean up isolated Git worktrees for Codex tasks.
---

# Git worktrees in Codex

Inspect `git status --short --branch` and `git worktree list` before changing worktrees. Create a branch with the repository's requested prefix and add a worktree with `git worktree add <path> -b <branch>` when the task needs an isolated checkout. Check for a name or path collision first. Worktrees share Git history but do not copy uncommitted files. Keep the original checkout untouched, verify the new worktree's branch and status, and provide its absolute path. Remove a worktree only after confirming its branch, uncommitted state, and whether the user still needs it. Follow the user's Git publication instructions.
