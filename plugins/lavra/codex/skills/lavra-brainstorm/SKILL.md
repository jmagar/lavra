---
name: lavra-brainstorm
description: Collaborate on requirements via deep dialogue -- explore scope, surface gray areas, compare approaches, file implementation phases.
---

# Lavra Brainstorm

Explore requirements and approaches through collaborative dialogue. Brainstorming helps answer **WHAT** to build, surfaces gray areas that need decisions, and breaks the vision into implementation phases filed as child beads. It precedes planning, which answers **HOW** to build each phase.

## Input Handling

The skill accepts either:
- A bead ID (e.g., `bikiniup-xhr`)
- A feature description in natural language

If the input is a bead ID pattern, load it with `bd show`. If it doesn't exist, report and stop. If the input is free text or empty, ask the user for clarification.

## Phase 0: Assess Requirements Clarity

Evaluate whether brainstorming is needed based on the feature description.

**Clear requirements indicators:**
- Specific acceptance criteria provided
- Referenced existing patterns to follow
- Described exact expected behavior
- Constrained, well-defined scope

**If requirements are already clear:**
Suggest proceeding directly to planning (`/lavra-plan`) instead, or confirm the user wants to explore the idea further.

## Phase 1: Understand the Idea

### 1.1 Repository Research (Lightweight)

Run a quick repo scan to understand existing patterns related to the feature. Focus on: similar features, established patterns, CLAUDE.md or AGENTS.md guidance.

### 1.2 Check Existing Knowledge

Search for relevant knowledge from past sessions using `.lavra/memory/recall.sh` with keywords from the feature description. Present any relevant entries that might inform the brainstorm.

### 1.3 Collaborative Dialogue (Deep Questioning)

Ask questions **one at a time**. Keep asking until the picture is clear -- do not rush this phase.

**Questioning progression:**

1. **Vision exploration** (start here):
   - "What does success look like when this is done?"
   - "Who is this for? What's their day-to-day context?"
   - "What triggered this idea -- a pain point, an opportunity, or something else?"

2. **Constraint discovery** (narrow down):
   - Tech stack preferences or requirements
   - Timeline pressure (is this urgent or exploratory?)
   - Team size and skill distribution
   - Existing patterns in the codebase to follow or avoid
   - Dependencies on other systems or features

3. **Scope sharpening** (lock boundaries):
   - "What should this explicitly NOT do?"
   - "What's the smallest version that would still be valuable?"
   - Validate assumptions explicitly: "I'm assuming X. Is that correct?"

4. **Success criteria** (close the loop):
   - "How will you know this feature is working well?"
   - "What's the happy path? What's the worst failure mode?"

**Exit condition:** Continue until the picture is clear (vision, constraints, scope, and success criteria are all addressed) OR user says "proceed."

## Phase 2: Gray Area Identification

Scan the entire conversation for ambiguities where reasonable developers might choose differently.

**Present gray areas:**
List them numbered with brief descriptions. Ask which the user wants to discuss. Pick numbers, 'all', or 'skip' if none matter yet.

**Explore selected gray areas:**
For each selected gray area, ask 3-4 targeted questions (one at a time) to drive toward a decision.

**Capture decisions immediately:**
After each gray area is resolved, log it right away:
```bash
bd comments add {BEAD_ID} "DECISION: {gray area} -- chose {option} because {rationale}. Alternatives considered: {list}"
```

If no bead exists yet, queue the decisions for Phase 5.

## Phase 3: Explore Approaches

Propose **2-3 concrete approaches** based on research, conversation, and resolved gray areas.

For each approach, provide:
- Brief description (2-3 sentences)
- Pros and cons
- When it's best suited

Lead with your recommendation and explain why. Apply YAGNI -- prefer simpler solutions.

Ask which approach the user prefers.

## Phase 4: Phase Identification

Based on requirements, decisions, and the chosen approach, identify logical implementation phases.

**Present phases:**
List the proposed phases. Ask if the user wants to reorder, merge, split, or adjust any of them.

**File phases as child beads:**
After confirmation, create the epic bead (if not already created) and file each phase as a child bead with scope, goals, and locked decisions.

## Phase 5: Capture the Design

Update the epic bead description with structured requirements. **Size budget: 80 lines max.** If the description exceeds 80 lines, it has too much scope -- split into more phases or move detail into child beads.

Include:
- **Vision**: What success looks like (1-2 sentences)
- **Requirements**: Must-have requirements (numbered list)
- **Non-Requirements**: Explicitly excluded scope
- **Locked Decisions**: Non-negotiable decisions that must be honored
- **Agent Discretion**: Areas where the implementing agent can choose details
- **Deferred**: Items raised during brainstorm but out of scope (with rationale for each)
- **Phases**: References to phase beads

Log remaining knowledge comments:
```bash
bd comments add {EPIC_BEAD_ID} "INVESTIGATION: {key findings from exploration}"
bd comments add {EPIC_BEAD_ID} "FACT: {constraints discovered}"
bd comments add {EPIC_BEAD_ID} "PATTERN: {patterns to follow}"
```

## Phase 6: Sharpen

### 6.0 Pre-Sharpen: Adversarial Audit

Before recommending a scope mode, run these checks:

**A. Premise Challenge**
- Is this the right problem? Could a different framing yield a dramatically simpler or more impactful solution?
- What is the actual user/business outcome? Is this the most direct path, or is it solving a proxy problem?
- What happens if we do nothing? Real pain point or hypothetical one?

**B. Existing Code Leverage**
- For every sub-problem in the proposed phases, identify existing code that already partially or fully solves it.
- Note any phase that rebuilds something already present -- and whether the plan reuses or rebuilds it.

**C. Dream State Mapping**
Map the trajectory in one table:
```
CURRENT STATE       → THIS PLAN DELIVERS       → 12-MONTH IDEAL
[describe briefly]    [describe delta]            [describe target]
```
Does this plan move toward the 12-month ideal or away from it?

**D. Temporal Interrogation** (skip for SCOPE REDUCTION)
Walk through implementation in your head and surface unresolved decisions now.

### 6.1 Evaluate scope and recommend a mode

Review the full conversation and recommend one of three modes:

- **SCOPE EXPANSION**: "The 10-star version of this is..." -- recommend when the initial idea is too small, when there is an obvious larger opportunity, or when the phases feel like a fraction of what is needed.
- **HOLD SCOPE**: "The scope is right. Here is how to make it bulletproof." -- recommend when the idea is well-sized, when the phases cover the problem space, and when the locked decisions are sound.
- **SCOPE REDUCTION**: "Strip to essentials. The 80/20 version is..." -- recommend when feature creep is happening, when phases have grown beyond what a first cut needs, or when nice-to-haves have crept into must-haves.

Present your recommendation with a brief rationale (2-3 sentences) and let the user confirm or pick a different mode.

### 6.2 Force the hard questions

Based on the chosen mode, ask these questions (one at a time):

1. "What is the smallest version that proves this works?"
2. "What can we defer without losing the core value?"
3. "Is this solving a real problem or an imagined one?"
4. "If we could only ship 3 of these {N} items, which 3?"

Skip questions that were already answered during earlier phases.

### 6.3 Apply the sharpening

Based on the user's answers:

- If **SCOPE EXPANSION**: add or revise phases to capture the larger vision
- If **HOLD SCOPE**: validate that nothing needs trimming
- If **SCOPE REDUCTION**: remove or defer phases; move deferred items to the Deferred section

### 6.4 Log scope decisions

```bash
bd comments add {EPIC_BEAD_ID} "DECISION: Scope mode: {EXPANSION|HOLD|REDUCTION} -- {rationale}. Deferred items: {list or 'none'}"
```

## Phase 7: Handoff

Present next steps:

**Options:**
1. **Proceed to design** -- Run `/lavra-design {EPIC_BEAD_ID}` to design all phases
2. **Refine further** -- Continue exploring
3. **Done for now** -- Return later

## Success Criteria

- Feature description is clear and well-understood (vision, constraints, scope, success criteria)
- Gray areas were identified and resolved with the user
- 2-3 approaches were explored with pros/cons
- An epic bead was created with structured description
- Implementation phases were identified, confirmed, and filed as child beads
- Key decisions captured as DECISION comments immediately when resolved
- Scope was sharpened: expansion/hold/reduction mode chosen, hard questions answered, phases adjusted if needed
- Scope decisions logged as DECISION comments
- Additional knowledge logged as INVESTIGATION/FACT/PATTERN comments
- User was offered clear next steps

## Guardrails

- **Stay focused on WHAT, not HOW** - Implementation details belong in the plan
- **Ask one question at a time** - Don't overwhelm
- **Apply YAGNI** - Prefer simpler approaches
- **Keep outputs concise** - 200-300 words per section max
- NEVER CODE! Just explore and document decisions.
