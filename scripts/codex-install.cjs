#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const packageRoot = path.resolve(__dirname, '..');
const sourceRoot = path.join(packageRoot, 'plugins/lavra/codex');
const action = process.argv[2];
const args = process.argv.slice(3).filter(arg => !['--yes', '-y', '--quiet', '-q', '--no-banner'].includes(arg));
const global = args.includes('--global');
const target = global ? os.homedir() : path.resolve(args.find(arg => !arg.startsWith('-')) || process.cwd());
const codexDir = path.join(target, '.codex');
const manifestPath = path.join(codexDir, 'lavra-install.json');
const hooksPath = path.join(codexDir, 'hooks.json');
const configPath = path.join(codexDir, 'config.toml');
const markerStart = '# BEGIN LAVRA CONTEXT7';
const markerEnd = '# END LAVRA CONTEXT7';

function pathExists(file) { try { fs.lstatSync(file); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; } }
function assertRegularOrMissing(file) {
  if (pathExists(file) && !fs.lstatSync(file).isFile()) throw new Error(`Refusing non-file destination: ${file}`);
}
function assertSafeParents(file) {
  let dir = path.dirname(file);
  while (dir.startsWith(target + path.sep)) {
    if (pathExists(dir) && !fs.lstatSync(dir).isDirectory()) throw new Error(`Refusing non-directory parent: ${dir}`);
    dir = path.dirname(dir);
  }
}
function sha(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function readJson(file, fallback) { return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback; }
function writeJson(file, data) { fs.mkdirSync(path.dirname(file), {recursive:true}); fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n'); }
function walk(dir) { return fs.readdirSync(dir, {withFileTypes:true}).flatMap(item => item.isDirectory() ? walk(path.join(dir,item.name)) : [path.join(dir,item.name)]); }
function installedPath(rel) { return path.join(target, rel); }
function validOwnedRel(rel) {
  return !rel.split(path.sep).includes('..') &&
    ['.codex/agents/', '.codex/scripts/', '.codex/hooks/lavra/', '.agents/skills/']
      .some(prefix => rel.startsWith(prefix));
}
function ownedFiles() {
  return [
    ...walk(path.join(sourceRoot, '.agents/skills')).map(file => path.relative(sourceRoot, file)),
    ...walk(path.join(sourceRoot, '.codex/agents')).map(file => path.relative(sourceRoot, file)),
    ...walk(path.join(sourceRoot, '.codex/scripts')).map(file => path.relative(sourceRoot, file)),
    ...walk(path.join(sourceRoot, '.codex/hooks/lavra')).map(file => path.relative(sourceRoot, file)),
  ];
}
function loadManifest() { return readJson(manifestPath, {version:1, files:{}, hooks:[], hooksFileCreated:false, context7Block:null}); }
function safeRemove(rel, hash) {
  if (!validOwnedRel(rel)) throw new Error(`Invalid Lavra manifest path: ${rel}`);
  const dest = installedPath(rel);
  if (fs.existsSync(dest) && !fs.lstatSync(dest).isSymbolicLink() && sha(dest) === hash) fs.unlinkSync(dest);
}
function pruneEmpty(rel) {
  let dir = path.dirname(installedPath(rel));
  while (dir.startsWith(target + path.sep) && fs.existsSync(dir) && fs.readdirSync(dir).length === 0) {
    fs.rmdirSync(dir);
    dir = path.dirname(dir);
  }
}
function hookEntries() {
  const source = readJson(path.join(sourceRoot, '.codex/hooks.json'), {hooks:{}}).hooks;
  const scriptByEvent = {SessionStart:'auto-recall.sh', PostToolUse:'memory-capture.sh', SubagentStop:'subagent-wrapup.sh'};
  return Object.entries(source).flatMap(([event, groups]) => groups.flatMap(group => group.hooks.map(hook => ({
    event, matcher: group.matcher || null,
    hook: {...hook, command: path.join(target, '.codex/hooks/lavra/hooks', scriptByEvent[event])},
  }))));
}
function addHooks(previous) {
  const config = readJson(hooksPath, {hooks:{}});
  config.hooks ||= {};
  const entries = hookEntries();
  const added = [];
  for (const entry of entries) {
    const groups = config.hooks[entry.event] ||= [];
    const group = groups.find(item => (item.matcher || null) === entry.matcher) || (() => {
      const item = entry.matcher ? {matcher:entry.matcher, hooks:[]} : {hooks:[]};
      groups.push(item); return item;
    })();
    if (!group.hooks.some(item => item.command === entry.hook.command)) {
      group.hooks.push(entry.hook);
      added.push(entry);
    }
  }
  writeJson(hooksPath, config);
  return added;
}
function removeHooks(entries, fileCreated = false) {
  if (!fs.existsSync(hooksPath)) return;
  const config = readJson(hooksPath, {hooks:{}});
  config.hooks ||= {};
  for (const entry of entries) {
    const groups = config.hooks[entry.event] || [];
    for (const group of groups) group.hooks = group.hooks.filter(hook => JSON.stringify(hook) !== JSON.stringify(entry.hook));
    config.hooks[entry.event] = groups.filter(group => group.hooks.length || Object.keys(group).some(key => !['hooks','matcher'].includes(key)));
    if (!config.hooks[entry.event].length) delete config.hooks[entry.event];
  }
  if (Object.keys(config.hooks).length || Object.keys(config).some(key => key !== 'hooks') || !fileCreated) writeJson(hooksPath, config);
  else fs.unlinkSync(hooksPath);
}
function installContext7(previous) {
  const existing = fs.existsSync(configPath) ? fs.readFileSync(configPath, 'utf8') : '';
  if (existing.includes(markerStart)) return previous.context7Block || null;
  if (/^\[\s*mcp_servers\s*\.\s*context7\s*\]/m.test(existing) || /^context7\s*=/m.test(existing)) return null;
  const block = `${markerStart}\n[mcp_servers.context7]\nurl = "https://mcp.context7.com/mcp"\n${markerEnd}\n`;
  fs.writeFileSync(configPath, existing + (existing && !existing.endsWith('\n') ? '\n' : '') + '\n' + block);
  return block;
}
function removeContext7(block) {
  if (!fs.existsSync(configPath)) return;
  const existing = fs.readFileSync(configPath, 'utf8');
  if (!existing.includes(block)) return;
  const next = existing.replace(block, '');
  if (next.trim()) fs.writeFileSync(configPath, next);
  else fs.unlinkSync(configPath);
}
function install() {
  if (!fs.existsSync(sourceRoot)) throw new Error('Codex artifacts are missing; run apm run build-codex first.');
  for (const dir of [path.join(target, '.codex'), path.join(target, '.agents')])
    if (pathExists(dir) && !fs.lstatSync(dir).isDirectory()) throw new Error(`Refusing non-directory destination: ${dir}`);
  for (const file of [manifestPath, hooksPath, configPath]) assertRegularOrMissing(file);
  const previous = loadManifest();
  for (const rel of Object.keys(previous.files)) if (!validOwnedRel(rel)) throw new Error(`Invalid Lavra manifest path: ${rel}`);
  for (const rel of Object.keys(previous.files)) {
    const dest = installedPath(rel);
    assertSafeParents(dest);
    assertRegularOrMissing(dest);
  }
  readJson(hooksPath, {hooks:{}});
  const files = ownedFiles();
  const incoming = new Set(files);
  for (const rel of files) {
    const dest = installedPath(rel);
    assertSafeParents(dest);
    assertRegularOrMissing(dest);
    if (pathExists(dest) && (!previous.files[rel] || sha(dest) !== previous.files[rel]))
      throw new Error(`Existing file is not owned by Lavra or was modified: ${dest}`);
  }
  const hooksFileCreated = previous.hooksFileCreated || !pathExists(hooksPath);
  const affected = new Set([...files, ...Object.keys(previous.files), '.codex/hooks.json', '.codex/config.toml', '.codex/lavra-install.json']);
  const originals = new Map([...affected].map(rel => {
    const file = installedPath(rel);
    return [rel, pathExists(file) ? {data:fs.readFileSync(file), mode:fs.statSync(file).mode} : null];
  }));
  const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'lavra-codex-stage-'));
  try {
    for (const rel of files) {
      const staged = path.join(stage, rel);
      fs.mkdirSync(path.dirname(staged), {recursive:true});
      fs.copyFileSync(path.join(sourceRoot, rel), staged);
    }
    for (const [rel, hash] of Object.entries(previous.files)) if (!incoming.has(rel)) safeRemove(rel, hash);
    fs.mkdirSync(codexDir, {recursive:true});
    const hashes = {};
    for (const rel of files) {
      const dest = installedPath(rel);
      fs.mkdirSync(path.dirname(dest), {recursive:true});
      fs.copyFileSync(path.join(stage, rel), dest);
      hashes[rel] = sha(dest);
    }
    removeHooks(previous.hooks, previous.hooksFileCreated);
    const hooks = addHooks(previous);
    const context7Block = installContext7(previous);
    writeJson(manifestPath, {version:1, files:hashes, hooks, hooksFileCreated, context7Block});
  } catch (error) {
    for (const [rel, original] of originals) {
      const dest = installedPath(rel);
      if (original) {
        fs.mkdirSync(path.dirname(dest), {recursive:true});
        fs.writeFileSync(dest, original.data);
        fs.chmodSync(dest, original.mode);
      } else if (pathExists(dest)) fs.unlinkSync(dest);
    }
    throw error;
  } finally { fs.rmSync(stage, {recursive:true, force:true}); }
  console.log(`Installed Lavra for Codex in ${target} (${files.length} files).`);
}
function uninstall() {
  if (!fs.existsSync(manifestPath)) { console.log('No Lavra Codex installation found.'); return; }
  const manifest = loadManifest();
  for (const rel of Object.keys(manifest.files)) if (!validOwnedRel(rel)) throw new Error(`Invalid Lavra manifest path: ${rel}`);
  for (const [rel, hash] of Object.entries(manifest.files)) safeRemove(rel, hash);
  removeHooks(manifest.hooks, manifest.hooksFileCreated);
  if (manifest.context7Block) removeContext7(manifest.context7Block);
  fs.unlinkSync(manifestPath);
  for (const rel of Object.keys(manifest.files)) pruneEmpty(rel);
  pruneEmpty('.codex/lavra-install.json');
  console.log(`Removed Lavra-owned Codex files from ${target}.`);
}
try {
  if (action === 'install') install();
  else if (action === 'uninstall') uninstall();
  else throw new Error('Usage: codex-install.cjs install|uninstall [target|--global]');
} catch (error) { console.error(`Codex install error: ${error.message}`); process.exitCode = 1; }
