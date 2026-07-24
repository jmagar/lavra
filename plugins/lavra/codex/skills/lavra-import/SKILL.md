---
name: lavra-import
description: Convert a markdown plan document into a Beads epic with child tasks. Parse markdown headers into parent/child beads, auto-capture RESEARCH/DECISION/IMPLEMENTATION sections as comments. Use when you have documented plans ready to become actionable work.
---

# lavra-import

Import a markdown plan document into beads as an epic with child task beads. Automatically extracts research findings, decisions, and implementation steps from the markdown structure.

## Overview

This skill converts a structured markdown plan into a Beads epic with child tasks. It's useful when you have a plan document that needs to be broken down into executable work items.

## Input Format

Accepts a markdown file path and optional epic title:
- **File path** (required): Path to markdown plan file
- **Title** (optional): Epic title. If not provided, extracted from first `#` header

## Process

### Phase 1: Parse Arguments

1. **Extract Arguments**
   - File path (required)
   - Epic title (optional)
   
   If no arguments provided, ask: "Please provide the path to the markdown plan file, e.g.: /lavra-import plan.md"

2. **Validate File Path**
   ```bash
   if [[ ! -f "{file_path}" ]]; then
     echo "Error: File not found: {file_path}"
     exit 1
   fi
   ```

3. **Extract Title from Markdown** (if not provided)
   ```bash
   title=$(grep -E "^# " "{file_path}" | head -1 | sed 's/^# *//')
   if [[ -z "$title" ]]; then
     echo "Error: Could not find title in markdown file (no # header found)"
     exit 1
   fi
   ```

### Phase 2: Run Import Script

1. **Call Import Script**
   ```bash
   if [[ -f ".claude/scripts/import-plan.sh" ]]; then
     SCRIPT_PATH=".claude/scripts/import-plan.sh"
   elif [[ -f ".opencode/scripts/import-plan.sh" ]]; then
     SCRIPT_PATH=".opencode/scripts/import-plan.sh"
   else
     echo "Error: import-plan.sh script not found"
     exit 1
   fi
   
   bash "$SCRIPT_PATH" "{file_path}" "{title}"
   ```

2. **Capture Script Output**
   - Extract epic ID from output
   - Count child beads created
   - Collect any errors or warnings

### Phase 3: Report Results

Display summary:
```
Successfully imported plan from {file_path}

Epic created: {EPIC_ID}
Title: {title}

Child beads created: {count}

View the epic:
  bd show {EPIC_ID}

List all child beads:
  bd list --parent {EPIC_ID}
```

## Expected Markdown Format

The import script expects markdown with this structure:

```markdown
# Epic Title
Description of the overall feature or project.

## Research / Background
Research findings and context...

## Decisions / Approach
Architectural decisions and chosen approach...

## Implementation Steps / Tasks
### Step 1: Database Schema
Details about database changes...

### Step 2: API Endpoints
Details about API implementation...

### Step 3: Frontend Components
Details about UI changes...
```

**Key sections:**
- `# Epic Title` - Becomes the epic bead title (if not provided as argument)
- `## Research / Background / Context` - Captured as INVESTIGATION comments
- `## Decisions / Choices / Approach` - Captured as DECISION comments
- `## Implementation Steps / Tasks / Work` - Each `### Step` becomes a child bead
  - Child beads are created sequentially with dependencies (Step 2 depends on Step 1, etc.)

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| File not found | Invalid file path | Check path and try again |
| No title in markdown | Missing `#` header | Provide title as argument |
| Script not found | Plugin not installed | Run plugin installation |
| No implementation steps | Missing `###` headers | Add implementation section with steps |

## Success Criteria

- Valid markdown file with clear structure
- At least one `#` header for the title (or title provided as argument)
- An "Implementation Steps" section with at least one `### Step`
- Each step has descriptive content below the `###` header
- File path validated before calling the script
- Title extracted from markdown if not provided
- Clear progress and results displayed
- Actionable next steps suggested
- Errors handled gracefully with helpful messages

## Next Steps

After importing a plan:

1. **Run `/lavra-research`** - Gather evidence for each child bead with domain-matched research agents
2. **Run `/lavra-eng-review`** - Get feedback from reviewers on the plan
3. **Start `/lavra-work`** - Begin implementing the first child bead
4. **View epic** - Show the full epic bead details with `bd show {EPIC_ID}`
