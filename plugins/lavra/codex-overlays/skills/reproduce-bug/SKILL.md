---
name: reproduce-bug
description: Reproduce a reported bug in Codex and return concrete evidence before fixing it.
---

# Reproduce a bug

Read the report, identify expected and actual behavior, and locate the affected code and existing tests. Build the smallest safe reproduction in the available environment. Run it twice when repeatability matters, inspect logs or output, and classify the result as confirmed, not reproduced, expected behavior, environment-specific, or data-specific. Use a bounded Codex subagent for independent investigation only when it has the needed tools and can work without conflicting edits. Report commands, observations, file locations, and what remains unknown. Do not claim a fix from reproduction alone.
