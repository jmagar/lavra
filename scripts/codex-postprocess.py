#!/usr/bin/env python3
"""Apply target-native Codex policy after APM converts portable artifacts."""
import json
import re
import shutil
import sys
from pathlib import Path

repo = Path(__file__).resolve().parent.parent
output = Path(sys.argv[1])
overlays = repo / 'plugins/lavra/codex-overlays'
source = repo / 'plugins/lavra'

for skill in (overlays / 'skills').iterdir():
    shutil.copy2(skill / 'SKILL.md', output / '.agents/skills' / skill.name / 'SKILL.md')

# Translate the remaining provider-specific invocation syntax in portable
# skill prose. Keep these mechanical rewrites after native skill overlays.
for skill_file in (output / '.agents/skills').glob('*/SKILL.md'):
    body = skill_file.read_text()
    body = re.sub(r'(?<![\w/])/((?:lavra|agent-native)-[a-z-]+)', r'$\1', body)
    body = body.replace('AskUserQuestion tool', 'available Codex user-input interface')
    body = body.replace('AskUserQuestion', 'a user question')
    body = re.sub(r'\bTask ([a-z-]+)\(', r'Codex subagent \1 with (', body)
    body = body.replace('Task [agent-name]:', 'Codex subagent [agent-name]:')
    body = body.replace('multiple Task calls', 'bounded Codex subagent calls')
    body = re.sub(r'Skill\("([a-z-]+)"\)', r'$\1', body)
    body = re.sub(r'Skill\("([a-z-]+)",\s*([^)]*)\)',
                  lambda match: f'${match.group(1)} with {match.group(2)}', body)
    skill_file.write_text(body)

script_dir = output / '.codex/scripts'
script_dir.mkdir(parents=True, exist_ok=True)
shutil.copy2(source / 'scripts/import-plan.sh', script_dir / 'import-plan.sh')

hooks = output / '.codex/hooks.json'
data = json.loads(hooks.read_text())
data['hooks'].pop('TeammateIdle', None)
hooks.write_text(json.dumps(data, indent=2) + '\n')
(output / '.codex/hooks/lavra/hooks/teammate-idle-check.sh').unlink(missing_ok=True)
shutil.copy2(overlays / 'hooks/subagent-wrapup.sh', output / '.codex/hooks/lavra/hooks/subagent-wrapup.sh')
recall = output / '.codex/hooks/lavra/hooks/auto-recall.sh'
recall.write_text(recall.read_text().replace(
    '{"hookSpecificOutput":{"systemMessage":$msg}}',
    '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":$msg}}',
).replace(
    '{"hookSpecificOutput":{"systemMessage":("## lavra updated ("',
    '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":("## lavra updated ("',
))

read_only = {'agent-native-reviewer','architecture-strategist','best-practices-researcher',
    'bug-reproduction-validator','code-simplicity-reviewer','data-integrity-guardian',
    'design-implementation-reviewer','dhh-rails-reviewer','every-style-editor',
    'framework-docs-researcher','git-history-analyzer','goal-verifier',
    'julik-frontend-races-reviewer','kieran-python-reviewer','kieran-rails-reviewer',
    'kieran-typescript-reviewer','learnings-researcher','migration-drift-detector',
    'pattern-recognition-specialist','performance-oracle','repo-research-analyst',
    'security-sentinel','spec-flow-analyzer'}
for agent in (output / '.codex/agents').glob('*.toml'):
    name = agent.stem
    source_agent = next((p for p in (source / 'agents').rglob(name + '.md')), None)
    model = None
    if source_agent:
        match = re.search(r'^model:\s*(\w+)', source_agent.read_text(), re.M)
        if match: model = match.group(1)
    effort = {'haiku':'low','sonnet':'medium','opus':'high'}.get(model, 'medium')
    sandbox = 'read-only' if name in read_only else 'workspace-write'
    content = agent.read_text()
    content = content.replace('Task tool', 'Codex subagent tool')
    if name == 'every-style-editor':
        # The source permits edits but forbids shell access. Codex cannot
        # express that exact tool list, so keep this agent in read-only mode.
        match = re.search(r'^developer_instructions = (".*")$', content, re.M)
        if not match:
            raise RuntimeError('every-style-editor is missing developer instructions')
        instructions = json.loads(match.group(1))
        instructions += '\n\nCodex policy: review and suggest edits only; do not change files directly.'
        content = content[:match.start(1)] + json.dumps(instructions) + content[match.end(1):]
    agent.write_text(f'model_reasoning_effort = "{effort}"\nsandbox_mode = "{sandbox}"\n' + content)
