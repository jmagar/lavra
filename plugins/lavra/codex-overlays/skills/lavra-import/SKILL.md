---
name: lavra-import
description: Import a markdown implementation plan into beads from Codex.
---

# Import a plan

Read the plan and confirm its implementation steps and acceptance criteria. Run the bundled `.codex/scripts/import-plan.sh <plan.md> <epic-title>` from the target project to create an epic and child beads. Inspect the resulting issues with `bd show`; fix missing dependencies or unclear criteria before work starts. Never interpret the imported plan as proof that work has been implemented.
