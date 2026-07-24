---
name: generate-command
description: Generate custom slash commands for automation, integration, and workflow orchestration. Triggers on "create command", "build command", "new command", "slash command".
compatibility: Claude Code command system
---

# Generate Custom Command

Create a new slash command in `.claude/commands/` following Claude Code conventions and best practices. Use this skill when you need to build custom commands for task automation, workflow integration, or specialized tools.

## What You Can Do

This skill helps you write commands that:
- Automate multi-step workflows
- Integrate with external tools and APIs (GitHub, Docker, etc.)
- Execute complex code transformations and refactoring
- Orchestrate file operations across projects
- Build specialized testing or deployment pipelines

## Required Command Structure

Every command must start with YAML frontmatter and follow this structure:

```yaml
---
name: command-name
description: Brief description (max 100 chars)
argument-hint: "[what arguments the command accepts]"
---
```

Fields:
- `name`: Lowercase command identifier
- `description`: Clear, concise summary of what the command does
- `argument-hint`: Shows users what arguments are expected (e.g., `[file path]`, `[issue number]`)

## Best Practices

### 1. Be Specific and Clear
Write detailed instructions that yield better results. Include:
- File paths and patterns
- References to existing code patterns
- Constraints and special cases

### 2. Break Down Complex Tasks
Use step-by-step plans with clear progression:
- Phase 1: Research and planning
- Phase 2: Implementation
- Phase 3: Verification and testing

### 3. Use Examples
Reference existing code patterns and show what success looks like. Include before/after examples for transformations.

### 4. Include Success Criteria
Define what completion looks like with testable criteria:
- Tests pass
- Linting clean
- Documentation updated

### 5. Think First
For complex problems, use "think hard" or "plan" keywords to encourage deep analysis before implementation.

### 6. Iterate Deliberately
Guide the process step by step, checking results before moving forward.

## Writing Your Command

### Command Template

```markdown
---
name: your-command-name
description: Brief, clear description of what this command does
argument-hint: "[argument description]"
---

# Your Command Title

[Paragraph explaining what this command accomplishes and when to use it]

## Steps

1. [First step with specific details]
   - Include file paths, patterns, or constraints
   - Reference existing code if applicable

2. [Second step]
   - Use parallel tool calls when possible
   - Check/verify results

3. [Final steps]
   - Run tests
   - Lint code
   - Commit changes (if appropriate)

## Success Criteria

- [ ] Tests pass
- [ ] Code follows style guide
- [ ] Documentation updated (if needed)
```

### Key Tools to Reference

Your commands can leverage:

**File Operations:**
- Read, Edit, Write - modify files precisely
- Glob, Grep - search codebase
- MultiEdit - atomic multi-part changes

**Development:**
- Bash - run commands (git, tests, linters)
- Task - launch specialized agents for complex tasks

**Web & APIs:**
- WebFetch, WebSearch - research documentation
- GitHub (gh cli) - PRs, issues, reviews
- agent-browser - browser automation, screenshots

**Integrations:**
- Context7 - framework docs
- Any MCP servers configured in the project

## Pro Tips

- Use `$ARGUMENTS` placeholder for dynamic inputs
- Reference `CLAUDE.md` or `AGENTS.md` for conventions
- Include verification steps: tests, linting, visual checks
- Be explicit about constraints: don't modify X, use pattern Y
- Use XML tags for structured prompts: `<task>`, `<requirements>`, `<constraints>`

### Example Command Pattern

```markdown
Implement #$ARGUMENTS following these steps:

1. Research existing patterns
   - Search for similar code using Grep
   - Read relevant files to understand approach

2. Plan the implementation
   - Think through edge cases and requirements
   - Consider test cases needed

3. Implement
   - Follow existing code patterns (reference specific files)
   - Write tests first if doing TDD
   - Ensure code follows project conventions

4. Verify
   - Run tests
   - Run linter
   - Check changes with git diff

5. Commit (optional)
   - Stage changes
   - Write clear commit message
```

## Creating the Command File

1. Create the file at `.claude/commands/[name].md` (subdirectories like `workflows/` supported)
2. Start with YAML frontmatter (see section above)
3. Structure the command using the template above
4. Test the command by using it with appropriate arguments

## Handoff

When your new command is ready:
1. Test it with representative inputs
2. Document any edge cases discovered
3. Add it to your project's `.claude/commands/` directory
4. Consider how it fits into your broader command workflow
