import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {validateManagedToolLinks} from '../lib/registry.mjs';

const makeRoot = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hhpe-rollback-'));
  fs.mkdirSync(path.join(root, 'lib'), {recursive: true});
  fs.mkdirSync(path.join(root, 'registry/manifests'), {recursive: true});
  fs.mkdirSync(path.join(root, 'registry/overlays/demo'), {recursive: true});
  fs.writeFileSync(path.join(root, 'registry/overlays/demo/SKILL.md'), '---\nname: demo\n---\n');
  fs.copyFileSync(new URL('../lib/registry.mjs', import.meta.url), path.join(root, 'lib/registry.mjs'));
  fs.copyFileSync(new URL('../lib/tool-contracts.mjs', import.meta.url), path.join(root, 'lib/tool-contracts.mjs'));
  return root;
};

const save = (root, name, value) => fs.writeFileSync(path.join(root, 'registry/manifests', name), JSON.stringify(value));
const run = (root, ...args) => spawnSync(process.execPath, [path.join(root, 'lib/registry.mjs'), ...args], {env: {...process.env, HHPE_HRG_HOME: root}, encoding: 'utf8'});

const configureSync = (root, target) => {
  save(root, 'packages.lock.yaml', {packages: [{package_id: 'overlay', revision: {type: 'overlay', value: '1'}, package_root: 'registry/overlays', license: {path: '.'}}]});
  save(root, 'capabilities.yaml', {capabilities: [{capability_id: 'overlay/demo', package_id: 'overlay', type: 'skill', source_path: 'demo', requires: {files: []}}]});
  save(root, 'exposures.yaml', {exposures: [{capability_id: 'overlay/demo', host: 'test', target, mode: 'skill-symlink'}]});
  save(root, 'migration-state.yaml', {phase: 'test', managed_objects: [], limitations: []});
};

test('controlled apply and rollback remove only owned link', () => {
  const root = makeRoot();
  const target = path.join(root, 'host/demo');
  configureSync(root, target);
  let result = run(root, 'sync', '--apply');
  assert.equal(result.status, 0, result.stderr);
  assert.ok(fs.lstatSync(target).isSymbolicLink());
  const user = path.join(root, 'host/user-owned');
  fs.writeFileSync(user, 'keep');
  result = run(root, 'rollback', '--apply');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.existsSync(target), false);
  assert.equal(fs.readFileSync(user, 'utf8'), 'keep');
  fs.rmSync(root, {recursive: true, force: true});
});

test('rollback refuses a managed link retargeted by the user', () => {
  const root = makeRoot();
  const target = path.join(root, 'host/demo');
  configureSync(root, target);
  let result = run(root, 'sync', '--apply');
  assert.equal(result.status, 0, result.stderr);
  const user = path.join(root, 'host/user-owned');
  fs.writeFileSync(user, 'keep');
  fs.unlinkSync(target);
  fs.symlinkSync(user, target);
  result = run(root, 'rollback', '--apply');
  assert.notEqual(result.status, 0);
  assert.equal(fs.readFileSync(fs.realpathSync(target), 'utf8'), 'keep');
  fs.rmSync(root, {recursive: true, force: true});
});

test('rollback refuses non-symlink, broken, user-owned and unrecorded objects', () => {
  for (const mode of ['regular', 'broken', 'unrecorded']) {
    const root = makeRoot();
    const managed = path.join(root, 'host/demo');
    const source = path.join(root, 'source/demo');
    fs.mkdirSync(path.dirname(managed), {recursive: true});
    fs.mkdirSync(path.dirname(source), {recursive: true});
    if (mode === 'regular') fs.writeFileSync(managed, 'user');
    else if (mode === 'broken') fs.symlinkSync(source, managed);
    else fs.writeFileSync(managed, 'user');
    save(root, 'migration-state.yaml', {managed_objects: mode === 'unrecorded' ? [] : [{kind: 'symlink', path: managed, source, classification: 'created_by_hhpe', tool_id: 'ast-grep-runtime'}]});
    const result = run(root, 'rollback', '--apply');
    if (mode === 'unrecorded') assert.equal(result.status, 0, result.stderr);
    else assert.notEqual(result.status, 0);
    assert.equal(fs.existsSync(managed) || fs.lstatSync(managed).isSymbolicLink(), true);
    fs.rmSync(root, {recursive: true, force: true});
  }
});

test('same command basename and PATH discovery do not establish ownership', () => {
  const root = makeRoot();
  const managed = path.join(root, 'host/ast-grep');
  const unrelated = path.join(root, 'unrelated/ast-grep');
  fs.mkdirSync(path.dirname(managed), {recursive: true});
  fs.mkdirSync(path.dirname(unrelated), {recursive: true});
  fs.writeFileSync(unrelated, 'user binary', {mode: 0o755});
  fs.symlinkSync(unrelated, managed);
  save(root, 'migration-state.yaml', {managed_objects: []});
  const result = run(root, 'rollback', '--apply');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.realpathSync(managed), fs.realpathSync(unrelated));
  fs.rmSync(root, {recursive: true, force: true});
});

test('managed external target requires exact ownership record and tool identity', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hhpe-owned-tool-'));
  const registryRoot = path.join(root, 'registry-root');
  fs.mkdirSync(registryRoot);
  const source = path.join(root, 'source/ast-grep');
  const other = path.join(root, 'other/ast-grep');
  const link = path.join(root, 'bin/ast-grep');
  for (const file of [source, other]) { fs.mkdirSync(path.dirname(file), {recursive: true}); fs.writeFileSync(file, 'binary'); }
  fs.mkdirSync(path.dirname(link), {recursive: true});
  fs.symlinkSync(source, link);
  const record = {kind: 'symlink', path: link, source, classification: 'created_by_hhpe', tool_id: 'ast-grep-runtime'};
  const tools = [{tool_id: 'ast-grep-runtime'}];
  assert.deepEqual(validateManagedToolLinks([record], tools, registryRoot), []);
  fs.unlinkSync(link); fs.symlinkSync(other, link);
  assert.ok(validateManagedToolLinks([record], tools, registryRoot).some(error => error.includes('retargeted')));
  fs.unlinkSync(link); fs.symlinkSync(source, link);
  assert.ok(validateManagedToolLinks([{...record, tool_id: null}], tools, registryRoot).some(error => error.includes('tool identity')));
  fs.rmSync(root, {recursive: true, force: true});
});
