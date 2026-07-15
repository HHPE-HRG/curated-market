import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const LIB = path.join(path.dirname(fileURLToPath(import.meta.url)), '../lib');

function seedRollbackRoot(prefix) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  fs.mkdirSync(path.join(root, 'lib'), {recursive: true});
  fs.mkdirSync(path.join(root, 'registry/manifests'), {recursive: true});
  fs.mkdirSync(path.join(root, 'registry/overlays/demo'), {recursive: true});
  fs.writeFileSync(path.join(root, 'registry/overlays/demo/SKILL.md'), '---\nname: demo\n---\n');
  fs.copyFileSync(path.join(LIB, 'registry.mjs'), path.join(root, 'lib/registry.mjs'));
  fs.copyFileSync(path.join(LIB, 'cursor-marketplace.mjs'), path.join(root, 'lib/cursor-marketplace.mjs'));
  return root;
}

test('controlled apply and rollback remove only owned link', () => {
  const root = seedRollbackRoot('hhpe-rollback-');
  const target = path.join(root, 'host/demo');
  const save = (n, v) => fs.writeFileSync(path.join(root, 'registry/manifests', n), JSON.stringify(v));
  save('packages.lock.yaml', {packages: [{package_id: 'overlay', revision: {type: 'overlay', value: '1'}, package_root: 'registry/overlays', license: {path: '.'}}]});
  save('capabilities.yaml', {capabilities: [{capability_id: 'overlay/demo', package_id: 'overlay', type: 'skill', source_path: 'demo', requires: {files: []}}]});
  save('exposures.yaml', {exposures: [{capability_id: 'overlay/demo', host: 'test', target, mode: 'skill-symlink'}]});
  save('migration-state.yaml', {phase: 'test', managed_objects: [], limitations: []});
  let r = spawnSync('node', [path.join(root, 'lib/registry.mjs'), 'sync', '--apply'], {env: {...process.env, HHPE_HRG_HOME: root}, encoding: 'utf8'});
  assert.equal(r.status, 0, r.stderr);
  assert.ok(fs.lstatSync(target).isSymbolicLink());
  const user = path.join(root, 'host/user-owned');
  fs.writeFileSync(user, 'keep');
  r = spawnSync('node', [path.join(root, 'lib/registry.mjs'), 'rollback', '--apply'], {env: {...process.env, HHPE_HRG_HOME: root}, encoding: 'utf8'});
  assert.equal(r.status, 0, r.stderr);
  assert.equal(fs.existsSync(target), false);
  assert.equal(fs.readFileSync(user, 'utf8'), 'keep');
  fs.rmSync(root, {recursive: true});
});

test('rollback refuses a managed link retargeted by the user', () => {
  const root = seedRollbackRoot('hhpe-rollback-retarget-');
  const target = path.join(root, 'host/demo');
  const save = (n, v) => fs.writeFileSync(path.join(root, 'registry/manifests', n), JSON.stringify(v));
  save('packages.lock.yaml', {packages: [{package_id: 'overlay', revision: {type: 'overlay', value: '1'}, package_root: 'registry/overlays', license: {path: '.'}}]});
  save('capabilities.yaml', {capabilities: [{capability_id: 'overlay/demo', package_id: 'overlay', type: 'skill', source_path: 'demo', requires: {files: []}}]});
  save('exposures.yaml', {exposures: [{capability_id: 'overlay/demo', host: 'test', target, mode: 'skill-symlink'}]});
  save('migration-state.yaml', {phase: 'test', managed_objects: [], limitations: []});
  let r = spawnSync('node', [path.join(root, 'lib/registry.mjs'), 'sync', '--apply'], {env: {...process.env, HHPE_HRG_HOME: root}, encoding: 'utf8'});
  assert.equal(r.status, 0, r.stderr);
  const user = path.join(root, 'host/user-owned');
  fs.writeFileSync(user, 'keep');
  fs.unlinkSync(target);
  fs.symlinkSync(user, target);
  r = spawnSync('node', [path.join(root, 'lib/registry.mjs'), 'rollback', '--apply'], {env: {...process.env, HHPE_HRG_HOME: root}, encoding: 'utf8'});
  assert.notEqual(r.status, 0);
  assert.equal(fs.readFileSync(fs.realpathSync(target), 'utf8'), 'keep');
  fs.rmSync(root, {recursive: true});
});
