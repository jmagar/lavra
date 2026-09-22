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
const target = global ? os.homedir() : path.resolve(args.find(arg => !arg.startsWith('-')) || os.homedir());
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
function loadManifest() { return readJson(manifestPath, {version:1, files:{}, hooks:[], context7:false}); }
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
  return Object.entries(source).flatMap(([event, groups]) => groups.flatMap(group => group.hooks.map(hook => ({
    event, matcher: group.matcher || null,
    hook: {...hook, command: path.join(target, hook.command)},
  }))));
}
function addHooks(previous) {
  const config = readJson(hooksPath, {hooks:{}});
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
function removeHooks(entries) {
  if (!fs.existsSync(hooksPath)) return;
  const config = readJson(hooksPath, {hooks:{}});
  for (const entry of entries) {
    const groups = config.hooks[entry.event] || [];
    for (const group of groups) group.hooks = group.hooks.filter(hook => hook.command !== entry.hook.command);
    config.hooks[entry.event] = groups.filter(group => group.hooks.length);
    if (!config.hooks[entry.event].length) delete config.hooks[entry.event];
  }
  if (Object.keys(config.hooks).length) writeJson(hooksPath, config);
  else fs.unlinkSync(hooksPath);
}
function installContext7(previous) {
  const existing = fs.existsSync(configPath) ? fs.readFileSync(configPath, 'utf8') : '';
  if (existing.includes(markerStart)) return previous.context7;
  if (/^\[mcp_servers\.context7\]/m.test(existing)) return false;
  const block = `${markerStart}\n[mcp_servers.context7]\nurl = "https://mcp.context7.com/mcp"\n${markerEnd}\n`;
  fs.writeFileSync(configPath, existing + (existing && !existing.endsWith('\n') ? '\n' : '') + '\n' + block);
  return true;
}
function removeContext7() {
  if (!fs.existsSync(configPath)) return;
  const existing = fs.readFileSync(configPath, 'utf8');
  const next = existing.replace(new RegExp(`\\n?${markerStart}[\\s\\S]*?${markerEnd}\\n?`), '\n');
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
  for (const [rel, hash] of Object.entries(previous.files)) if (!incoming.has(rel)) safeRemove(rel, hash);
  fs.mkdirSync(codexDir, {recursive:true});
  const hashes = {};
  for (const rel of files) {
    const dest = installedPath(rel);
    fs.mkdirSync(path.dirname(dest), {recursive:true});
    fs.copyFileSync(path.join(sourceRoot, rel), dest);
    hashes[rel] = sha(dest);
  }
  removeHooks(previous.hooks);
  const hooks = addHooks(previous);
  const context7 = installContext7(previous);
  writeJson(manifestPath, {version:1, files:hashes, hooks, context7});
  console.log(`Installed Lavra for Codex in ${target} (${files.length} files).`);
}
function uninstall() {
  if (!fs.existsSync(manifestPath)) { console.log('No Lavra Codex installation found.'); return; }
  const manifest = loadManifest();
  for (const rel of Object.keys(manifest.files)) if (!validOwnedRel(rel)) throw new Error(`Invalid Lavra manifest path: ${rel}`);
  for (const [rel, hash] of Object.entries(manifest.files)) safeRemove(rel, hash);
  removeHooks(manifest.hooks);
  if (manifest.context7) removeContext7();
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
