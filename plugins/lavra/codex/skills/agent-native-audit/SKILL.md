---
name: agent-native-audit
description: Audit system architecture against 8 agent-native principles. Scored report with recommendations. For reviewing architecture or improving agent-native patterns.
---

# Agent-Native Architecture Audit Skill

## Objective

Conduct a comprehensive review of the codebase against agent-native architecture principles, launching parallel sub-agents for each principle and producing a scored report.

## Core Principles

1. **Action Parity** - "Whatever the user can do, the agent can do"
2. **Tools as Primitives** - "Tools provide capability, not behavior"
3. **Context Injection** - "System prompt includes dynamic context about app state"
4. **Shared Workspace** - "Agent and user work in the same data space"
5. **CRUD Completeness** - "Every entity has full CRUD (Create, Read, Update, Delete)"
6. **UI Integration** - "Agent actions immediately reflected in UI"
7. **Capability Discovery** - "Users can discover what the agent can do"
8. **Prompt-Native Features** - "Features are prompts defining outcomes, not code"

## Execution Flow

### 1. Argument Handling

If $ARGUMENTS specifies a single principle (e.g., "action parity", "1"), run only that sub-agent and provide detailed findings for that principle alone.

Valid principle arguments:
- `action parity` or `1`
- `tools` or `primitives` or `2`
- `context` or `injection` or `3`
- `shared` or `workspace` or `4`
- `crud` or `5`
- `ui` or `integration` or `6`
- `discovery` or `7`
- `prompt` or `features` or `8`

### 2. Load Agent-Native Reference

If full audit is running, invoke the agent-native-architecture skill to load reference material.

### 3. Launch Parallel Sub-Agents

Launch up to 8 parallel sub-agents using Task tool with `subagent_type: Explore`, one per principle (or single principle if specified).

Each agent should:
1. Enumerate ALL instances in the codebase (user actions, tools, contexts, data stores, etc.)
2. Check compliance against the principle
3. Provide a SPECIFIC SCORE like "X out of Y (percentage%)"
4. List specific gaps and recommendations

**Agent 1: Action Parity**
- Enumerate ALL user actions in frontend (API calls, button clicks, form submissions)
- Check which have corresponding agent tools
- Score: "Agent can do X out of Y user actions"

**Agent 2: Tools as Primitives**
- Find and read ALL agent tool files
- Classify each as PRIMITIVE (good) or WORKFLOW (bad)
- Score: "X out of Y tools are proper primitives"

**Agent 3: Context Injection**
- Find context injection code and read agent prompts
- Enumerate what IS injected vs what SHOULD be
- Score: "X/Y context types injected"

**Agent 4: Shared Workspace**
- Identify all data stores/tables/models
- Check if agents read/write to SAME tables or separate ones
- Score: "X/Y data stores shared"

**Agent 5: CRUD Completeness**
- Identify all entities/models
- For each entity, check for Create, Read, Update, Delete agent tools
- Score per entity and overall percentage

**Agent 6: UI Integration**
- Check how agent writes/changes propagate to frontend
- Look for streaming updates (SSE, WebSocket), polling, shared state, event buses
- Identify "silent actions" anti-pattern
- Score: "X/Y agent actions immediately reflected in UI"

**Agent 7: Capability Discovery**
- Check for: onboarding flows, help docs, capability hints, self-description, suggested prompts, empty state guidance, slash commands
- Score against 7 mechanisms: "X/7 discovery mechanisms present"

**Agent 8: Prompt-Native Features**
- Read all agent prompts
- Classify features as PROMPT-defined (good) or CODE-defined (bad)
- Score: "X/Y features are prompt-native"

### 4. Compile Summary Report

After all agents complete, compile summary:

```markdown
## Agent-Native Architecture Review: [Project Name]

### Overall Score Summary

| Core Principle | Score | Percentage | Status |
|----------------|-------|------------|--------|
| Action Parity | X/Y | Z% | Pass/Warn/Fail |
| Tools as Primitives | X/Y | Z% | Pass/Warn/Fail |
| Context Injection | X/Y | Z% | Pass/Warn/Fail |
| Shared Workspace | X/Y | Z% | Pass/Warn/Fail |
| CRUD Completeness | X/Y | Z% | Pass/Warn/Fail |
| UI Integration | X/Y | Z% | Pass/Warn/Fail |
| Capability Discovery | X/Y | Z% | Pass/Warn/Fail |
| Prompt-Native Features | X/Y | Z% | Pass/Warn/Fail |

**Overall Agent-Native Score: X%**

### Status Legend
- Pass: Excellent (80%+)
- Warn: Partial (50-79%)
- Fail: Needs Work (<50%)

### Top 10 Recommendations by Impact

| Priority | Action | Principle | Effort |
|----------|--------|-----------|--------|

### What's Working Excellently

[List top 5 strengths]
```

## Output Format Per Audit

Each audit should include:

```markdown
## {Principle} Audit

### Findings Summary
{High-level overview}

### Detailed Analysis
[Tables or lists of specific items checked]

### Score: X/Y (percentage%)

### Gaps & Issues
[Specific instances of non-compliance]

### Recommendations
[Prioritized list of what to fix or improve]
```

## Success Criteria

- [ ] All 8 sub-agents complete their audits (or single principle if specified)
- [ ] Each principle has a specific numeric score (X/Y format)
- [ ] Summary table shows all scores and status indicators
- [ ] Top 10 recommendations are prioritized by impact
- [ ] Report identifies both strengths and gaps
- [ ] Specific instances cited (file paths, function names, etc.)

## Handoff Options

1. Create beads for each recommendation (prioritized by impact)
2. Run `/lavra-work` to implement highest-priority improvements
3. Schedule follow-up audits after improvements complete
4. Share report with team for discussion and planning
