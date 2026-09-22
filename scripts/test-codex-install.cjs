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
  fs.writeFileSync(path.join(codex, 'hooks.json'), JSON.stringify({version:1,hooks:{SessionStart:[{hooks:[{type:'command',command:'user-hook'}]}]}}));
  run('--codex', '--yes', scratch);
  run('--codex', '--yes', scratch);
  const hooks = JSON.parse(fs.readFileSync(path.join(codex, 'hooks.json')));
  assert.deepStrictEqual(Object.keys(hooks.hooks).sort(), ['PostToolUse','SessionStart','SubagentStop']);
  assert(hooks.hooks.SessionStart.some(group => group.hooks.some(hook => hook.command === 'user-hook')));
  assert.strictEqual(hooks.version, 1);
  assert(fs.readdirSync(path.join(codex, 'agents')).length === 30);
  assert(fs.readdirSync(path.join(scratch, '.agents/skills')).length === 45);
  assert(fs.readFileSync(path.join(codex, 'config.toml'), 'utf8').includes('mcp_servers.context7'));
  const recall = spawnSync('bash', [path.join(codex, 'hooks/lavra/hooks/auto-recall.sh')], {
    input: JSON.stringify({cwd:scratch}), encoding:'utf8', env:{...process.env, CLAUDE_PROJECT_DIR:''},
  });
  assert.strictEqual(recall.status, 0);
  assert(JSON.parse(recall.stdout).hookSpecificOutput.additionalContext);
  const init = spawnSync('git', ['init', '-q', scratch], {encoding:'utf8'});
  assert.strictEqual(init.status, 0, init.stderr);
  const nested = path.join(scratch, 'nested');
  fs.mkdirSync(nested);
  const generatedCommand = JSON.parse(fs.readFileSync(path.join(root, 'plugins/lavra/codex/.codex/hooks.json'), 'utf8')).hooks.SessionStart[0].hooks[0].command;
  const nestedRecall = spawnSync('bash', ['-c', generatedCommand], {
    cwd:nested, input: JSON.stringify({cwd:nested}), encoding:'utf8', env:{...process.env, CLAUDE_PROJECT_DIR:''},
  });
  assert.strictEqual(nestedRecall.status, 0, nestedRecall.stderr);
  assert(JSON.parse(nestedRecall.stdout).hookSpecificOutput.additionalContext);
  assert(!fs.existsSync(path.join(nested, '.lavra')), 'hooks must use the project root from subdirectories');
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
  assert.deepStrictEqual(JSON.parse(fs.readFileSync(path.join(codex, 'hooks.json'))), {version:1,hooks:{SessionStart:[{hooks:[{type:'command',command:'user-hook'}]}]}});
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
  const defaultTarget = path.join(scratch, 'default-target');
  fs.mkdirSync(defaultTarget);
  const installDefault = spawnSync('bash', [path.join(root, 'install.sh'), '--codex'], {cwd:defaultTarget, encoding:'utf8'});
  assert.strictEqual(installDefault.status, 0, installDefault.stderr);
  assert(fs.existsSync(path.join(defaultTarget, '.codex/lavra-install.json')));
  const uninstallDefault = spawnSync('bash', [path.join(root, 'uninstall.sh'), '--codex'], {cwd:defaultTarget, encoding:'utf8'});
  assert.strictEqual(uninstallDefault.status, 0, uninstallDefault.stderr);
  const modified = path.join(scratch, 'modified');
  fs.mkdirSync(path.join(modified, '.codex'), {recursive:true});
  fs.writeFileSync(path.join(modified, '.codex/config.toml'), '[mcp_servers.context7 ]\nurl = "https://example.com"\n');
  run('--codex', '--yes', modified);
  assert.strictEqual((fs.readFileSync(path.join(modified, '.codex/config.toml'), 'utf8').match(/mcp_servers\.context7/g) || []).length, 1);
  const modifiedHooksPath = path.join(modified, '.codex/hooks.json');
  const modifiedHooks = JSON.parse(fs.readFileSync(modifiedHooksPath, 'utf8'));
  modifiedHooks.hooks.SessionStart[0].hooks[0].timeout = 123;
  fs.writeFileSync(modifiedHooksPath, JSON.stringify(modifiedHooks));
  run('--codex', '--uninstall', modified);
  assert.strictEqual(JSON.parse(fs.readFileSync(modifiedHooksPath, 'utf8')).hooks.SessionStart[0].hooks[0].timeout, 123);
  assert(fs.readFileSync(path.join(modified, '.codex/config.toml'), 'utf8').includes('https://example.com'));
  const rollback = path.join(scratch, 'rollback');
  fs.mkdirSync(path.join(rollback, '.codex'), {recursive:true});
  fs.writeFileSync(path.join(rollback, '.codex/hooks.json'), JSON.stringify({hooks:{SessionStart:[{matcher:null}]}}));
  const failed = spawnSync('node', [path.join(root, 'bin/install.js'), '--codex', '--yes', rollback], {cwd:root, encoding:'utf8'});
  assert.notStrictEqual(failed.status, 0);
  assert(!fs.existsSync(path.join(rollback, '.codex/agents/lint.toml')));
  assert(!fs.existsSync(path.join(rollback, '.codex/lavra-install.json')));
  console.log('PASS Codex install, upgrade, ownership, MCP, hooks, and uninstall');
} finally { fs.rmSync(scratch, {recursive:true, force:true}); }
