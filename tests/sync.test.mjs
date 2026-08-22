import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {ROOT, sync} from '../lib/registry.mjs';

const capability = 'serena-guidance';
const source = path.join(ROOT, 'registry/overlays/wrappers', capability);
const targetFor = home => path.join(home, '.cursor/skills', capability);

function withHome(run) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'hhpe-sync-home-'));
  try { return run(home); }
  finally { fs.rmSync(home, {recursive: true, force: true}); }
}

function actionFor(result, target) {
  return result.actions.find(action => action.target === target);
}

test('empty home-relative target plans LINK without creating it', () => withHome(home => {
  const target = targetFor(home);
  const result = sync({host: 'cursor', home});
  assert.equal(actionFor(result, target)?.action, 'LINK');
  assert.equal(fs.existsSync(target), false);
}));

test('exact expected symlink plans SKIP without changing it', () => withHome(home => {
  const target = targetFor(home);
  fs.mkdirSync(path.dirname(target), {recursive: true});
  fs.symlinkSync(source, target, 'dir');
  const before = fs.readlinkSync(target);
  const result = sync({host: 'cursor', home});
  assert.equal(actionFor(result, target)?.action, 'SKIP');
  assert.equal(fs.readlinkSync(target), before);
}));

test('symlink to a different source plans COLLISION and is not overwritten', () => withHome(home => {
  const target = targetFor(home);
  const other = path.join(home, 'other-skill');
  fs.mkdirSync(other, {recursive: true});
  fs.mkdirSync(path.dirname(target), {recursive: true});
  fs.symlinkSync(other, target, 'dir');
  const before = fs.readlinkSync(target);
  const result = sync({host: 'cursor', home});
  assert.equal(actionFor(result, target)?.action, 'COLLISION');
  assert.equal(fs.readlinkSync(target), before);
}));

test('ordinary file at target plans COLLISION and retains its contents', () => withHome(home => {
  const target = targetFor(home);
  fs.mkdirSync(path.dirname(target), {recursive: true});
  fs.writeFileSync(target, 'user file\n');
  const result = sync({host: 'cursor', home});
  assert.equal(actionFor(result, target)?.action, 'COLLISION');
  assert.equal(fs.readFileSync(target, 'utf8'), 'user file\n');
}));

test('unmanaged user directory at target plans COLLISION and retains its files', () => withHome(home => {
  const target = targetFor(home);
  fs.mkdirSync(target, {recursive: true});
  fs.writeFileSync(path.join(target, 'owned.txt'), 'keep\n');
  const result = sync({host: 'cursor', home});
  assert.equal(actionFor(result, target)?.action, 'COLLISION');
  assert.equal(fs.readFileSync(path.join(target, 'owned.txt'), 'utf8'), 'keep\n');
}));

test('injected home changes only tilde-relative exposure targets', () => withHome(home => {
  const result = sync({home});
  assert.ok(result.actions.some(action => action.target === targetFor(home)));
  assert.ok(result.actions.some(action => action.target === 'registry:serena/serena-runtime'));
}));

test('default sync target expansion still uses the current user home', () => {
  const result = sync({host: 'cursor'});
  assert.ok(result.actions.some(action => action.target === targetFor(os.homedir())));
});
