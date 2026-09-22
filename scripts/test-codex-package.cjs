#!/usr/bin/env node
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const {spawnSync} = require('child_process');
const root = path.resolve(__dirname, '..');
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'lavra-codex-package-'));
function call(command, args, cwd) {
  const result = spawnSync(command, args, {cwd, encoding:'utf8'});
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed:\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}
try {
  const pack = JSON.parse(call('npm', ['pack', '--pack-destination', scratch, '--json'], root))[0];
  call('tar', ['-xzf', path.join(scratch, pack.filename), '-C', scratch], root);
  const packageRoot = path.join(scratch, 'package');
  const target = path.join(scratch, 'consumer');
  fs.mkdirSync(target);
  call('node', [path.join(packageRoot, 'bin/install.js'), '--codex', '--yes', target], root);
  assert(fs.existsSync(path.join(target, '.codex/agents/lint.toml')));
  assert(fs.existsSync(path.join(target, '.agents/skills/lavra-work-single/SKILL.md')));
  call('node', [path.join(packageRoot, 'bin/install.js'), '--codex', '--uninstall', target], root);
  assert(!fs.existsSync(path.join(target, '.codex/agents/lint.toml')));
  console.log('PASS packed npm artifact installs and uninstalls Codex components');
} finally { fs.rmSync(scratch, {recursive:true, force:true}); }
