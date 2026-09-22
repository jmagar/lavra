#!/usr/bin/env node
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const {spawnSync} = require('child_process');
const root = path.resolve(__dirname, '..');
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'lavra-codex-test-'));
const codex = path.join(scratch, '.codex');
function runWithEnv(env, ...args) {
  const result = spawnSync('node', [path.join(root, 'bin/install.js'), ...args], {cwd:root, encoding:'utf8', env});
  if (result.status !== 0) throw new Error(`${args.join(' ')} failed:\n${result.stdout}\n${result.stderr}`);
}
function run(...args) { runWithEnv(process.env, ...args); }
try {
  fs.mkdirSync(codex);
  fs.writeFileSync(path.join(codex, 'config.toml'), 'model = "user-model"\n');
  fs.writeFileSync(path.join(codex, 'hooks.json'), JSON.stringify({hooks:{SessionStart:[{hooks:[{type:'command',command:'user-hook'}]}]}}));
  run('--codex', '--yes', scratch);
  run('--codex', '--yes', scratch);
  const hooks = JSON.parse(fs.readFileSync(path.join(codex, 'hooks.json')));
  assert.deepStrictEqual(Object.keys(hooks.hooks).sort(), ['PostToolUse','SessionStart','SubagentStop']);
  assert(hooks.hooks.SessionStart.some(group => group.hooks.some(hook => hook.command === 'user-hook')));
  assert(fs.readdirSync(path.join(codex, 'agents')).length === 30);
  assert(fs.readdirSync(path.join(scratch, '.agents/skills')).length === 45);
  assert(fs.readFileSync(path.join(codex, 'config.toml'), 'utf8').includes('mcp_servers.context7'));
  const recall = spawnSync('bash', [path.join(codex, 'hooks/lavra/hooks/auto-recall.sh')], {
    input: JSON.stringify({cwd:scratch}), encoding:'utf8', env:{...process.env, CLAUDE_PROJECT_DIR:''},
  });
  assert.strictEqual(recall.status, 0);
  assert(JSON.parse(recall.stdout).hookSpecificOutput.additionalContext);
  const transcript = path.join(scratch, 'agent-transcript.txt');
  fs.writeFileSync(transcript, 'BEAD_ID: lavra-test\n');
  const wrapup = spawnSync('bash', [path.join(codex, 'hooks/lavra/hooks/subagent-wrapup.sh')], {
    input: JSON.stringify({agent_id:'agent-1', agent_transcript_path:transcript, stop_hook_active:false}), encoding:'utf8',
  });
  assert.strictEqual(wrapup.status, 0);
  assert.strictEqual(JSON.parse(wrapup.stdout).decision, 'block');
  fs.unlinkSync(transcript);
  const capture = spawnSync('bash', [path.join(codex, 'hooks/lavra/hooks/memory-capture.sh')], {
    input: JSON.stringify({cwd:scratch, tool_name:'Bash', tool_input:{command:'bd comments add lavra-test "LEARNED: codex hook works"'}}),
    encoding:'utf8', env:{...process.env, CLAUDE_PROJECT_DIR:''},
  });
  assert.strictEqual(capture.status, 0, capture.stderr);
  assert(fs.readFileSync(path.join(scratch, '.lavra/memory/knowledge.jsonl'), 'utf8').includes('codex hook works'));
  const agent = path.join(codex, 'agents/lint.toml');
  fs.appendFileSync(agent, '\n# user customization\n');
  run('--codex', '--uninstall', scratch);
  assert(fs.existsSync(agent), 'modified agent must survive uninstall');
  assert(fs.readFileSync(path.join(codex, 'config.toml'), 'utf8').trim() === 'model = "user-model"');
  assert.deepStrictEqual(JSON.parse(fs.readFileSync(path.join(codex, 'hooks.json'))), {hooks:{SessionStart:[{hooks:[{type:'command',command:'user-hook'}]}]}});
  assert(!fs.existsSync(path.join(codex, 'lavra-install.json')));
  const home = path.join(scratch, 'home');
  fs.mkdirSync(home);
  const isolated = {...process.env, HOME:home};
  runWithEnv(isolated, '--codex', '--global', '--yes');
  assert(fs.existsSync(path.join(home, '.codex/agents/lint.toml')));
  runWithEnv(isolated, '--codex', '--uninstall', '--global');
  assert(!fs.existsSync(path.join(home, '.codex/agents/lint.toml')));
  const collision = path.join(scratch, 'collision');
  fs.mkdirSync(path.join(collision, '.codex/agents'), {recursive:true});
  fs.writeFileSync(path.join(collision, '.codex/agents/lint.toml'), 'user agent\n');
  const blocked = spawnSync('node', [path.join(root, 'bin/install.js'), '--codex', '--yes', collision], {cwd:root, encoding:'utf8'});
  assert.notStrictEqual(blocked.status, 0);
  assert.strictEqual(fs.readFileSync(path.join(collision, '.codex/agents/lint.toml'), 'utf8'), 'user agent\n');
  assert(!fs.existsSync(path.join(collision, '.codex/lavra-install.json')));
  console.log('PASS Codex install, upgrade, ownership, MCP, hooks, and uninstall');
} finally { fs.rmSync(scratch, {recursive:true, force:true}); }
