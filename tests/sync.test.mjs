import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ROOT, sync} from '../lib/registry.mjs';

const capability = 'serena-guidance';
const source = path.join(ROOT, 'registry/overlays/wrappers', capability);
const targetFor = home => path.join(home, '.cursor/skills', capability);

function withHome(run) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'hhpe-sync-home-'));
  try { return run(home); }
  finally { fs.rmSync(home, {recursive: true, force: true}); }
}

function withProject(run) {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hhpe-sync-project-'));
  try { return run(projectRoot); }
  finally { fs.rmSync(projectRoot, {recursive: true, force: true}); }
}

function isolatedApply({home, projectRoot, extraExposures = []}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hhpe-sync-root-'));
  fs.mkdirSync(path.join(root, 'lib'), {recursive: true});
  fs.mkdirSync(path.join(root, 'registry/manifests'), {recursive: true});
  fs.mkdirSync(path.join(root, 'cursor-plugin-routing/.cursor-plugin'), {recursive: true});
  fs.writeFileSync(path.join(root, 'cursor-plugin-routing/.cursor-plugin/plugin.json'), '{"name":"hhpe-hrg-plugin-stack"}\n');
  fs.mkdirSync(path.join(root, 'cursor-plugin-routing/hooks'), {recursive: true});
  fs.writeFileSync(path.join(root, 'cursor-plugin-routing/hooks/hooks.json'), '{}\n');
  fs.writeFileSync(path.join(root, 'cursor-plugin-routing/hooks/route-gate.mjs'), 'export {}\n');
  fs.copyFileSync(new URL('../lib/registry.mjs', import.meta.url), path.join(root, 'lib/registry.mjs'));
  fs.copyFileSync(new URL('../lib/tool-contracts.mjs', import.meta.url), path.join(root, 'lib/tool-contracts.mjs'));
  const write = (name, value) => fs.writeFileSync(path.join(root, 'registry/manifests', name), JSON.stringify(value));
  write('packages.lock.yaml', {packages: [{package_id: 'hhpe-cursor-plugin-routing', revision: {type: 'overlay', value: '1'}, package_root: 'cursor-plugin-routing', license: {path: '.'}}]});
  write('capabilities.yaml', {capabilities: [{capability_id: 'hhpe-hrg/cursor-plugin-routing', package_id: 'hhpe-cursor-plugin-routing', type: 'plugin', source_path: '.', requires: {files: []}}]});
  write('exposures.yaml', {exposures: [
    {capability_id: 'hhpe-hrg/cursor-plugin-routing', host: 'cursor', mode: 'local-plugin', adapter: 'registry/adapters/cursor', target: '~/.cursor/plugins/local/hhpe-hrg-plugin-stack', status: 'active', scope: 'user-local', enforcement: 'guidance'},
    {capability_id: 'hhpe-hrg/cursor-plugin-routing', host: 'cursor', mode: 'local-plugin', adapter: 'registry/adapters/cursor', target: '.cursor/plugins/local/hhpe-hrg-plugin-stack', status: 'active', scope: 'project', enforcement: 'guidance'},
    ...extraExposures,
  ]});
  write('migration-state.yaml', {phase: 'test', managed_objects: [], limitations: []});
  write('tools.yaml', {tools: []});
  const args = ['sync', '--apply', '--host', 'cursor', '--home', home];
  if (projectRoot) args.push('--project-root', projectRoot);
  const result = spawnSync(process.execPath, [path.join(root, 'lib/registry.mjs'), ...args], {
    env: {...process.env, HHPE_HRG_HOME: root},
    encoding: 'utf8',
  });
  return {root, result};
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

test('project scope plans LINK under injected projectRoot only', () => withHome(home => withProject(projectRoot => {
  const projectTarget = path.join(projectRoot, '.cursor/plugins/local/hhpe-hrg-plugin-stack');
  const userTarget = path.join(home, '.cursor/plugins/local/hhpe-hrg-plugin-stack');
  const developerPlugin = path.join(os.homedir(), '.cursor/plugins/local/hhpe-hrg-plugin-stack');
  const beforeDeveloper = fs.existsSync(developerPlugin);
  const result = sync({host: 'cursor', home, projectRoot});
  assert.equal(actionFor(result, projectTarget)?.action, 'LINK');
  assert.equal(actionFor(result, userTarget)?.action, 'LINK');
  assert.equal(fs.existsSync(projectTarget), false);
  assert.equal(fs.existsSync(userTarget), false);
  assert.equal(fs.existsSync(developerPlugin), beforeDeveloper);
})));

test('missing projectRoot skips project bindings and does not use process cwd', () => withHome(home => {
  const result = sync({host: 'cursor', home});
  assert.ok(result.actions.some(a => a.reason === 'projectRoot-required' && a.action === 'SKIP'));
  assert.equal(result.actions.some(a => typeof a.target === 'string' && a.target.startsWith(process.cwd() + path.sep + '.cursor')), false);
}));

test('apply mutates only owned destinations and is idempotent', () => withHome(home => withProject(projectRoot => {
  const first = isolatedApply({home, projectRoot});
  assert.equal(first.result.status, 0, first.result.stderr);
  const userTarget = path.join(home, '.cursor/plugins/local/hhpe-hrg-plugin-stack');
  const projectTarget = path.join(projectRoot, '.cursor/plugins/local/hhpe-hrg-plugin-stack');
  assert.equal(fs.lstatSync(userTarget).isSymbolicLink(), true);
  assert.equal(fs.lstatSync(projectTarget).isSymbolicLink(), true);
  const state = JSON.parse(fs.readFileSync(path.join(first.root, 'registry/manifests/migration-state.yaml'), 'utf8'));
  assert.ok(state.managed_objects.every(o => o.classification === 'created_by_hhpe' && o.source && o.capability_id && o.scope));
  const second = spawnSync(process.execPath, [path.join(first.root, 'lib/registry.mjs'), 'sync', '--apply', '--host', 'cursor', '--home', home, '--project-root', projectRoot], {env: {...process.env, HHPE_HRG_HOME: first.root}, encoding: 'utf8'});
  assert.equal(second.status, 0, second.stderr);
  const plan = JSON.parse(second.stdout);
  assert.ok(plan.actions.filter(a => a.target === userTarget || a.target === projectTarget).every(a => a.action === 'SKIP'));
  fs.rmSync(first.root, {recursive: true, force: true});
})));

test('dry-run does not create project or user-local plugin destinations', () => withHome(home => withProject(projectRoot => {
  const result = sync({host: 'cursor', home, projectRoot});
  assert.equal(result.mode, 'dry-run');
  assert.equal(fs.existsSync(path.join(home, '.cursor/plugins/local/hhpe-hrg-plugin-stack')), false);
  assert.equal(fs.existsSync(path.join(projectRoot, '.cursor/plugins/local/hhpe-hrg-plugin-stack')), false);
})));

test('unmanaged plugin destination remains a collision', () => withHome(home => {
  const target = path.join(home, '.cursor/plugins/local/hhpe-hrg-plugin-stack');
  fs.mkdirSync(target, {recursive: true});
  fs.writeFileSync(path.join(target, 'owned.txt'), 'keep\n');
  const result = sync({host: 'cursor', home});
  assert.equal(actionFor(result, target)?.action, 'COLLISION');
  assert.equal(fs.readFileSync(path.join(target, 'owned.txt'), 'utf8'), 'keep\n');
}));

test('cloud-project rows never create files', () => withHome(home => withProject(projectRoot => {
  const extra = [{
    capability_id: 'hhpe-hrg/cursor-plugin-routing',
    host: 'cursor',
    mode: 'local-plugin',
    adapter: 'registry/adapters/cursor',
    target: '.cursor/plugins/local/cloud-only',
    status: 'planned',
    scope: 'cloud-project',
    enforcement: 'guidance',
  }];
  const first = isolatedApply({home, projectRoot, extraExposures: extra});
  assert.equal(fs.existsSync(path.join(projectRoot, '.cursor/plugins/local/cloud-only')), false);
  const plan = JSON.parse(first.result.stdout);
  assert.ok(plan.actions.some(a => a.reason === 'cloud-project-not-implemented' && a.action === 'SKIP'));
  fs.rmSync(first.root, {recursive: true, force: true});
})));
