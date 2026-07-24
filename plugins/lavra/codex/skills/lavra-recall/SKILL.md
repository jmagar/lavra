---
name: lavra-recall
description: Search knowledge base mid-session by keyword, bead ID, topic, or recent entries. Find solutions, patterns, and learnings without restarting. Modes: keyword search, bead recall, statistics, topic search, recent entries.
---

# lavra-recall

Search the knowledge base mid-session and inject relevant context. Access solutions, patterns, and learnings from past work without restarting.

## Overview

This skill provides quick access to institutional knowledge captured during previous work sessions. Search by keyword, bead ID, or topic to find relevant insights and patterns.

## Usage Modes

### Mode 1: Keyword Search

Search by keywords or phrases:

```bash
/lavra-recall "oauth redirect"
/lavra-recall "database migrations"
/lavra-recall "rate limiting"
```

Format output with entry counts.

### Mode 2: Bead ID Recall

Recall knowledge specific to a bead:

```bash
/lavra-recall BD-042
```

Returns:
- **Direct Knowledge** - Entries logged directly to this bead
- **Related Knowledge** - Entries matching keywords from the bead title

### Mode 3: Statistics (--stats)

```bash
/lavra-recall --stats
```

Display knowledge base statistics: entry counts, top tags, most recent entries.

### Mode 4: Recent Entries (--recent N)

```bash
/lavra-recall --recent 10
```

Show the N most recent knowledge entries.

### Mode 5: Topic/Epic (--topic BEAD_ID)

```bash
/lavra-recall --topic BD-042
```

Recall all knowledge entries tagged with an epic's topic.

### Mode 6: Help (empty or --help)

```bash
/lavra-recall
```

Display usage instructions and examples.

## Process

### Keyword Search

1. **Execute search:**
   ```bash
   bash .lavra/memory/recall.sh "{keywords}"
   ```

2. **Format output:**
   ```
   ## Knowledge Recall: "{query}"
   
   Found {count} entries:
   
   [formatted results from recall.sh]
   ```

3. **If no results:**
   ```
   ## No Matches Found
   
   No knowledge entries match "{query}".
   
   Try:
   - Different keywords (e.g., "auth" instead of "authentication")
   - Broader search terms
   - `/lavra-recall --recent 20` to see latest entries
   - `/lavra-recall --stats` to see all topics and tags
   ```

### Bead ID Recall

1. **Load the bead:**
   ```bash
   bd show "{BEAD_ID}" --json
   ```

2. **If bead doesn't exist:**
   ```
   ## Bead Not Found
   
   Bead ID '{BEAD_ID}' not found. Check the ID with:
   ```bash
   bd list --status=open
   ```

3. **If bead exists:**
   - Extract title and type
   - Search by bead title keywords: `.lavra/memory/recall.sh "{TITLE}"`
   - Search by bead ID directly: `grep "\"bead\":\"{BEAD_ID}\"" .lavra/memory/knowledge.jsonl`

4. **Format output:**
   ```
   ## Knowledge Recall: {BEAD_ID}
   
   **Bead:** {TITLE} ({TYPE})
   
   ### Direct Knowledge (logged to this bead):
   
   [entries where bead field matches]
   
   ### Related Knowledge (matching "{TITLE}"):
   
   [entries from keyword search]
   ```

### Statistics Mode (--stats)

```bash
bash .lavra/memory/recall.sh --stats
```

Display as a code block:

```
## Knowledge Base Statistics

[statistics output from recall.sh]
```

### Recent Entries Mode (--recent N)

```bash
bash .lavra/memory/recall.sh --recent {N}
```

Format output:

```
## Recent Knowledge ({N} entries)

[formatted entries from recall.sh]
```

### Topic/Epic Mode (--topic BEAD_ID)

```bash
bash .lavra/memory/recall.sh --topic {BEAD_ID}
```

Format output:

```
## Knowledge for Topic: {BEAD_ID}

[formatted entries from recall.sh]
```

If no results:
```
No knowledge found for topic {BEAD_ID}.

The topic may not have child beads with captured knowledge yet.
```

### Empty Arguments

If no arguments provided:

```
## Knowledge Recall

Usage:
```bash
/lavra-recall "keywords"           # Search by keywords
/lavra-recall BD-001               # Recall for specific bead
/lavra-recall --recent 10          # Show recent entries
/lavra-recall --stats              # Database statistics
/lavra-recall --topic BD-005       # Epic's knowledge
```

Or try:
```bash
/lavra-recall --recent 10          # See what's been captured lately
```
```

## Output Format Standards

**Entry format from recall.sh:**
```
[TYPE] content
  bead: BD-XXX | tag1, tag2, tag3
```

**Always wrap in code blocks for readability.**

**Count results:**
- Parse output line count (entries have 2 lines each)
- Report: "Found {count} entries" or "No matches found"

## Error Handling

### Memory Not Initialized

```
## Memory Not Initialized

This project doesn't have knowledge capture set up yet.

Run the lavra installer to enable memory features:
```bash
bash /path/to/lavra/install.sh
```
```

### No Knowledge Captured Yet

```
## No Knowledge Captured Yet

Knowledge base is empty. Start capturing knowledge:
```bash
bd comments add <BEAD_ID> "LEARNED: ..."
bd comments add <BEAD_ID> "DECISION: ..."
```

The memory-capture hook will automatically extract and store these.
```

### BD Command Fails

```
Beads CLI not found. Install from: https://github.com/steveyegge/beads
```

## Technical Details

- **Search:** FTS5 full-text search (if sqlite3 available) with BM25 ranking
- **Fallback:** grep search if sqlite3 not installed
- **Case-insensitive:** Yes
- **Fuzzy matching:** Supported
- **Archive:** Can be included with `--all` flag (not exposed here for simplicity)
- **Git-tracked:** Yes -- pulling updates automatically rebuilds search index

## Next Steps

**If results found:**
- Use this knowledge to inform your current work
- Add new learnings: `bd comments add <BEAD_ID> "LEARNED: ..."`
- Curate knowledge entries: `/lavra-learn`

**If implementing related work:**
```bash
bd create --title="..." --type=feature --priority=2
```
