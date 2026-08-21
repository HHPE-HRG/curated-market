import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {isDeepStrictEqual} from 'node:util';
import {
  CODEX_WRAPPER_PROJECTIONS,
  checkAdapters,
  compareAdapterProjection,
  syncAdapters,
} from '../scripts/sync-adapters.mjs';

const EXPECTED = [
  'ast-grep',
  'registry-health',
  'stack-router',
  'serena-guidance',
  'context7-guidance',
  'playwright-guidance',
  'session-start',
];

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hhpe-adapters-'));
  const source = path.join(root, 'registry/overlays/wrappers');
  for (const name of [...EXPECTED, 'unreviewed-wrapper']) {
    fs.mkdirSync(path.join(source, name), {recursive: true});
    fs.writeFileSync(path.join(source, name, 'SKILL.md'), `${name}\n`);
  }
  return {root, outputRoot: path.join(root, 'isolated-output')};
}

function snapshot(root) {
  if (!fs.existsSync(root)) return [];
  const result = [];
  const visit = (directory, prefix = '') => {
    for (const entry of fs.readdirSync(directory, {withFileTypes: true}).sort((a, b) => a.name.localeCompare(b.name))) {
      const relative = path.join(prefix, entry.name);
      const file = path.join(directory, entry.name);
      const stat = fs.lstatSync(file);
      if (stat.isDirectory()) {
        result.push({path: relative, type: 'directory'});
        visit(file, relative);
      } else if (stat.isSymbolicLink()) {
        result.push({path: relative, type: 'symlink', target: fs.readlinkSync(file)});
      } else {
        result.push({path: relative, type: 'file', bytes: fs.readFileSync(file).toString('hex'), executable: Boolean(stat.mode & 0o111)});
      }
    }
  };
  visit(root);
  return result;
}

function materializeCheckedIn(root) {
  const outputRoot = path.join(root, 'registry/adapters/codex/marketplace/plugins/hhpe-registry/skills');
  syncAdapters({root, outputRoot});
  return outputRoot;
}

test('generator ownership is the explicit reviewed seven-wrapper set', () => {
  assert.deepEqual(CODEX_WRAPPER_PROJECTIONS, EXPECTED);
  assert.ok(Object.isFrozen(CODEX_WRAPPER_PROJECTIONS));
});

test('syncAdapters writes all and only owned wrappers beneath an injected output root', t => {
  const {root, outputRoot} = fixture();
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  syncAdapters({root, outputRoot});
  assert.deepEqual(fs.readdirSync(outputRoot).sort(), [...EXPECTED].sort());
  assert.equal(fs.existsSync(path.join(outputRoot, 'unreviewed-wrapper')), false);
});

test('reconciliation removes stale owned files but preserves neighboring adapter content', t => {
  const {root, outputRoot} = fixture();
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  fs.mkdirSync(path.join(outputRoot, 'ast-grep'), {recursive: true});
  fs.writeFileSync(path.join(outputRoot, 'ast-grep/stale.txt'), 'stale');
  fs.mkdirSync(path.join(outputRoot, 'neighbor'), {recursive: true});
  fs.writeFileSync(path.join(outputRoot, 'neighbor/keep.txt'), 'keep');
  syncAdapters({root, outputRoot});
  assert.equal(fs.existsSync(path.join(outputRoot, 'ast-grep/stale.txt')), false);
  assert.equal(fs.readFileSync(path.join(outputRoot, 'neighbor/keep.txt'), 'utf8'), 'keep');
});

test('missing canonical source fails instead of silently omitting owned output', t => {
  const {root, outputRoot} = fixture();
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  fs.rmSync(path.join(root, 'registry/overlays/wrappers/session-start'), {recursive: true});
  assert.throws(() => syncAdapters({root, outputRoot}), /missing canonical Codex wrapper: session-start/);
});

test('generated trees recursively match source bytes, types, and executable bits', t => {
  const {root, outputRoot} = fixture();
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const nested = path.join(root, 'registry/overlays/wrappers/ast-grep/references/run.sh');
  fs.mkdirSync(path.dirname(nested), {recursive: true});
  fs.writeFileSync(nested, '#!/bin/sh\nexit 0\n');
  fs.chmodSync(nested, 0o755);
  syncAdapters({root, outputRoot});
  assert.deepEqual(snapshot(path.join(outputRoot, 'ast-grep')), snapshot(path.join(root, 'registry/overlays/wrappers/ast-grep')));
  assert.equal(fs.statSync(path.join(outputRoot, 'ast-grep/SKILL.md')).mode & 0o777, 0o644);
  assert.equal(fs.statSync(path.join(outputRoot, 'ast-grep/references/run.sh')).mode & 0o777, 0o755);
});

test('a byte-equivalent symlink fails representation parity', t => {
  const {root, outputRoot} = fixture();
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  syncAdapters({root, outputRoot});
  const skill = path.join(outputRoot, 'ast-grep/SKILL.md');
  const target = path.join(outputRoot, 'ast-grep/SKILL.real');
  fs.renameSync(skill, target);
  fs.symlinkSync('SKILL.real', skill);
  const result = compareAdapterProjection({root, outputRoot});
  assert.equal(result.ok, false);
  assert.ok(result.differences.some(item => /ast-grep\/SKILL.md.*symlink/.test(item)));
});

test('comparison detects unexpected generated files', t => {
  const {root, outputRoot} = fixture();
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  syncAdapters({root, outputRoot});
  fs.writeFileSync(path.join(outputRoot, 'session-start/stale.txt'), 'stale');
  const result = compareAdapterProjection({root, outputRoot});
  assert.equal(result.ok, false);
  assert.ok(result.differences.some(item => /session-start\/stale.txt.*unexpected/.test(item)));
});

test('checkAdapters compares isolated fresh generation without rewriting checked-in state', t => {
  const {root} = fixture();
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const checkedIn = materializeCheckedIn(root);
  const before = snapshot(path.dirname(checkedIn));
  assert.deepEqual(checkAdapters({root}), {ok: true, differences: []});
  assert.deepEqual(snapshot(path.dirname(checkedIn)), before);
});

test('generation is idempotent and one source edit changes only its projection', t => {
  const {root, outputRoot} = fixture();
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  syncAdapters({root, outputRoot});
  const first = new Map(EXPECTED.map(name => [name, snapshot(path.join(outputRoot, name))]));
  syncAdapters({root, outputRoot});
  assert.deepEqual(new Map(EXPECTED.map(name => [name, snapshot(path.join(outputRoot, name))])), first);
  fs.appendFileSync(path.join(root, 'registry/overlays/wrappers/session-start/SKILL.md'), 'changed\n');
  syncAdapters({root, outputRoot});
  const changed = EXPECTED.filter(name => !isDeepStrictEqual(snapshot(path.join(outputRoot, name)), first.get(name)));
  assert.deepEqual(changed, ['session-start']);
});

test('generation is location-independent and preserves intentional canonical path text', t => {
  const first = fixture();
  const second = fixture();
  t.after(() => {
    fs.rmSync(first.root, {recursive: true, force: true});
    fs.rmSync(second.root, {recursive: true, force: true});
  });
  const example = 'intentional example: /example/home/path\n';
  for (const item of [first, second]) {
    fs.writeFileSync(path.join(item.root, 'registry/overlays/wrappers/context7-guidance/example.md'), example);
    syncAdapters(item);
  }
  assert.deepEqual(snapshot(first.outputRoot), snapshot(second.outputRoot));
  assert.equal(fs.readFileSync(path.join(first.outputRoot, 'context7-guidance/example.md'), 'utf8'), example);
  assert.equal(snapshot(first.outputRoot).some(entry => entry.type === 'symlink'), false);
});
