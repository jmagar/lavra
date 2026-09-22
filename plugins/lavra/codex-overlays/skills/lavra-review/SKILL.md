---
name: lavra-review
description: Run a focused Codex code review using the installed specialist agents.
---

# Codex review

Identify the diff or files the user wants reviewed and read the relevant context. The Lavra specialists are installed as `.codex/agents/*.toml`; choose only reviewers suited to the change. For independent, bounded review passes, invoke available Codex subagents with explicit scope and ask them to return concrete findings with file and line evidence. Keep the main task responsible for checking duplicates, reconciling conflicting claims, and reporting actionable findings in severity order. Do not change code during a review unless the user asks for a fix. If subagents are unavailable, review directly using the same criteria.
