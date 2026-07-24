---
name: lavra-research
description: Research a plan with domain-matched agents. Validates design decisions, identifies risks, gathers best practices. Run before implementation or integration.
compatibility: Requires beads (bd) CLI, git repository
---

# Lavra Research

Gather evidence and best practices for a plan using domain-matched research agents. Research GATHERS findings (docs, prior art, best practices, edge cases, knowledge recall) from agents selected based on the plan's technologies and concerns.

## When to Use

- You have an existing plan (from `/lavra-plan` or `/lavra-design`) and need research support before implementation
- You want to validate design decisions against current best practices
- You need to identify risks, edge cases, and gotchas specific to your tech stack
- You want domain experts to review planned approaches without modifying the plan itself

## Execution

### 1. Parse Plan and Extract Domain Indicators

Start with an epic bead ID. If not provided, find recent epics:

```bash
bd list --type epic --status=open --json
```

Read the epic and its children to understand the plan content:

```bash
bd show {EPIC_ID}
bd list --parent {EPIC_ID} --json
```

Extract domain indicators from bead titles and descriptions:
- **Languages**: Ruby, Python, TypeScript, JavaScript, Go, Rust, etc.
- **Frameworks**: Rails, Django, React, Next.js, FastAPI, etc.
- **Concerns**: security, auth, performance, migrations, data integrity, deployment, frontend/CSS/JS, design/UI/UX
- **File types**: `.rb`, `.py`, `.ts`, `.tsx`, `.sql`, `.css`, etc.
- **Infrastructure**: databases, APIs, CI/CD, Docker, cloud services

### 2. Select Research Agents by Domain Match

**Always include these agents** (universal relevance):
- `architecture-strategist` -- structural concerns apply to every plan
- `code-simplicity-reviewer` -- complexity is always worth checking
- `best-practices-researcher` -- general best practices research
- `framework-docs-researcher` -- documentation lookup for detected frameworks
- `learnings-researcher` -- search knowledge.jsonl for past solutions

**Conditionally include based on domain indicators**:

| Domain indicator | Agent(s) to include |
|-----------------|---------------------|
| Database, migrations, schema, SQL, models | `data-migration-expert`, `data-integrity-guardian`, `migration-drift-detector` |
| Frontend, CSS, JS, React, UI components | `julik-frontend-races-reviewer`, `design-implementation-reviewer` |
| Rails, Ruby, `.rb` files | `dhh-rails-reviewer`, `kieran-rails-reviewer` |
| Python, Django, FastAPI, `.py` files | `kieran-python-reviewer` |
| TypeScript, `.ts`/`.tsx` files | `kieran-typescript-reviewer` |
| Security, auth, OAuth, tokens, encryption | `security-sentinel` |
| Performance, caching, N+1, latency | `performance-oracle` |
| Deployment, CI/CD, Docker, infrastructure | `deployment-verification-agent` |
| Design, UI/UX, Figma, layout | `design-iterator`, `figma-design-sync` |
| Patterns, architecture, abstractions | `pattern-recognition-specialist` |
| Agent-native, AI workflows, LLM | `agent-native-reviewer` |
| Git history, blame, refactor archeology | `git-history-analyzer` |
| Repository structure, codebase analysis | `repo-research-analyst` |

Present the roster to the user before dispatching with justifications.

### 3. Discover Relevant Skills

Search for available project-local and global skills:

```bash
ls .claude/skills/ 2>/dev/null
ls ~/.claude/skills/ 2>/dev/null
```

For each skill directory, read its `SKILL.md` and check if it matches the plan's domain. Build a list of relevant skills for agents to reference.

### 4. Search Knowledge Base

Search for relevant past learnings before dispatching agents:

```bash
# Search knowledge for each key topic in the plan
.lavra/memory/recall.sh "{topic 1}"
.lavra/memory/recall.sh "{topic 2}"
.lavra/memory/recall.sh "{technology}"

# Search with --all to include archived knowledge
.lavra/memory/recall.sh --all "{broad topic}"
```

Collect all relevant entries to provide to agents as context.

### 5. Dispatch Selected Agents in Parallel

Launch ONLY the selected agents from Step 2. Each agent gets the full plan content plus relevant knowledge entries. Agents GATHER findings -- they do not revise the plan.

For each selected agent, dispatch in parallel:

```
Task [agent-name]: "Research this plan using your expertise. GATHER evidence only -- do not revise the plan.

DOMAIN MATCH REASON: [why this agent was selected]

PLAN CONTENT:
[full plan content from epic + children]

RELEVANT KNOWLEDGE ENTRIES:
[any matching entries from Step 4]

RELEVANT SKILLS:
[any matching skills from Step 3]

YOUR JOB:
1. Apply your expertise to identify: best practices, risks, edge cases, patterns, anti-patterns, performance considerations
2. Cite sources where possible (docs, prior art, knowledge entries)
3. Return CONCRETE findings organized by child bead
4. Flag any concerns or risks with severity (high/medium/low)

DO NOT rewrite the plan. Just report what you found."
```

Launch ALL selected agents in a SINGLE message with multiple Task calls.

### 6. Collect and Organize Findings

Wait for all agents to complete. Organize findings by child bead, not by agent:

```
BEAD {CHILD_ID}: {title}

  architecture-strategist:
    - [finding 1]
    - [finding 2]

  security-sentinel:
    - [finding 1 - severity: high]

  best-practices-researcher:
    - [finding 1 with source URL]
```

- **Deduplicate**: Merge identical recommendations from multiple agents
- **Flag conflicts**: If two agents disagree, note both perspectives
- **Prioritize**: Mark high-impact findings

### 7. Log Research Findings as Knowledge Comments

For each child bead with findings:

```bash
bd comments add {CHILD_ID} "INVESTIGATION: [key research finding with source]"
bd comments add {CHILD_ID} "FACT: [constraint or gotcha discovered]"
bd comments add {CHILD_ID} "PATTERN: [recommended pattern with rationale]"
```

Add a research summary to the epic:

```bash
bd comments add {EPIC_ID} "INVESTIGATION: Research completed with [count] domain-matched agents ([agent names]). Key findings: [top 3 findings]. Ready for /lavra-design to integrate."
```

## Success Criteria

- Domain indicators correctly extracted from plan content
- Only domain-relevant agents dispatched (with justification for each)
- All agent findings organized by child bead
- Key findings logged as INVESTIGATION/FACT/PATTERN comments
- Research summary added to epic bead
- NO plan modifications made -- findings only

## Guardrails

- NEVER modify child bead descriptions. Research GATHERS evidence. Design work APPLIES it.
- NEVER write code. Just research and report findings.
- NEVER dispatch agents that have no domain match. Each agent must have a stated reason for inclusion.

## Handoff

After logging all findings, present options to the user:

1. **Run `/lavra-design`** - Integrate research findings into the plan
2. **Run `/lavra-eng-review`** - Get feedback from reviewers on the plan
3. **Research deeper** - Run another round on specific sections with additional agents
4. **View findings** - Show all research findings organized by child bead

Based on selection, proceed with the chosen next step.
