import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  assertReusableObservation,
  attachReadiness,
  ephemeralLocalContext,
  executionContext,
  observeToolVersion,
  resolveExecutable,
  toolSpecRevision
} from '../lib/tool-contracts.mjs';

const spec = {
  tool_id: 'demo-runtime',
  capability_id: 'demo/use',
  version: '1.2.3',
  source: 'npm:demo@1.2.3',
  provenance: {strength: 'approved-external-coordinate'},
  commands: ['demo'],
  discovery: {method: 'path', required: ['demo'], aliases: []},
  version_probe: {parser: 'demo-semver', command: 'demo', args: ['--version'], requirement: '1.2.3'},
  readiness_probe: 'demo-functional'
};

const explicit = executionContext({id: 'worker-a', platform: 'linux', arch: 'x64'});
const parse = stdout => stdout.match(/(\d+\.\d+\.\d+)/)?.[1] ?? null;
const compare = (observed, required) => observed === required;
const base = {
  context: explicit,
  now: () => '2026-08-20T00:00:00.000Z',
  resolve: () => ({outcome: 'present', command: 'demo', executable: '/bin/demo', realpath: '/bin/demo'}),
  parseVersion: parse,
  compareVersion: compare
};

test('revision is order-stable, domain-separated, and sensitive to applicable requirements', () => {
  const reordered = Object.fromEntries(Object.entries(spec).reverse());
  assert.match(toolSpecRevision(spec), /^hhpe-toolspec-json-v1-sha256:[a-f0-9]{64}$/);
  assert.equal(toolSpecRevision(spec), toolSpecRevision(reordered));
  for (const changed of [
    {...spec, version: '1.2.4'},
    {...spec, provenance: {strength: 'pinned-source'}},
    {...spec, discovery: {...spec.discovery, required: ['demo2']}},
    {...spec, version_probe: {...spec.version_probe, requirement: '>=1.2.3'}},
    {...spec, readiness_probe: 'demo-functional-v2'}
  ]) assert.notEqual(toolSpecRevision(spec), toolSpecRevision(changed));
  const unrelated = {...spec, tool_id: 'other-runtime'};
  assert.equal(toolSpecRevision(spec), toolSpecRevision({...spec}));
  assert.notEqual(toolSpecRevision(spec), toolSpecRevision(unrelated));
});

test('reusable context requires caller identity and never derives hostname', () => {
  assert.throws(() => executionContext({platform: 'linux', arch: 'x64'}), /context id/);
  assert.deepEqual(explicit, {id: 'worker-a', platform: 'linux', arch: 'x64', reusable: true});
  const other = executionContext({id: 'worker-b', platform: 'linux', arch: 'x64'});
  assert.notEqual(explicit.id, other.id);
  const local = ephemeralLocalContext({platform: 'darwin', arch: 'arm64'});
  assert.deepEqual(local, {scope: 'ephemeral-local', platform: 'darwin', arch: 'arm64', reusable: false});
  assert.throws(() => assertReusableObservation({execution_context: local}), /not reusable/);
});

test('PATH discovery retains executable and symlink target', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hhpe-path-'));
  const target = path.join(root, 'demo-real');
  const alias = path.join(root, 'demo');
  fs.writeFileSync(target, '#!/bin/sh\n', {mode: 0o755});
  fs.symlinkSync(target, alias);
  assert.deepEqual(resolveExecutable('demo', {env: {PATH: root}}), {outcome: 'present', command: 'demo', executable: alias, realpath: fs.realpathSync.native(target)});
  assert.deepEqual(resolveExecutable('missing', {env: {PATH: root}}), {outcome: 'absent', command: 'missing'});
  fs.rmSync(root, {recursive: true, force: true});
});

test('discovery inspection failures are indeterminate, not absent', () => {
  const cases = [
    ['permission denied', Object.assign(new Error('EACCES'), {code: 'EACCES'}), 'permission-denied'],
    ['symlink loop', Object.assign(new Error('ELOOP'), {code: 'ELOOP'}), 'symlink-loop'],
    ['realpath failure', Object.assign(new Error('EINVAL'), {code: 'EINVAL'}), 'realpath-failed'],
    ['filesystem I/O error', Object.assign(new Error('EIO'), {code: 'EIO'}), 'io-error'],
  ];
  for (const [label, error, reason] of cases) {
    const result = resolveExecutable('demo', {
      env: {PATH: '/only'},
      access: () => {
        if (reason === 'realpath-failed') return;
        throw error;
      },
      realpath: () => {
        throw error;
      },
    });
    assert.equal(result.outcome, 'indeterminate', label);
    assert.equal(result.command, 'demo', label);
    assert.equal(result.reason, reason, label);
    assert.notEqual(result.outcome, 'absent', label);
  }
});

test('absence differs from version probe failure', () => {
  const absent = observeToolVersion(spec, {...base, resolve: () => ({outcome: 'absent', command: 'demo'}), run: () => assert.fail('must not run')});
  assert.equal(absent.discovery.outcome, 'absent');
  assert.equal(absent.version.outcome, 'not-observed');
  const failed = observeToolVersion(spec, {...base, run: () => ({status: null, stdout: '', stderr: 'spawn failed', error: new Error('spawn failed')})});
  assert.equal(failed.discovery.outcome, 'present');
  assert.equal(failed.version.outcome, 'indeterminate');
  assert.equal(failed.version.reason, 'probe-failed');
  assert.equal(failed.version.stderr, 'spawn failed');
});

test('nonzero and unparseable probes are indeterminate, not incompatible', () => {
  const nonzero = observeToolVersion(spec, {...base, run: () => ({status: 2, stdout: '', stderr: 'dependency missing'})});
  assert.equal(nonzero.version.outcome, 'indeterminate');
  const unparseable = observeToolVersion(spec, {...base, run: () => ({status: 0, stdout: 'unknown', stderr: ''})});
  assert.equal(unparseable.version.outcome, 'indeterminate');
  assert.equal(unparseable.version.reason, 'unparseable');
});

test('successful parse distinguishes compatible and incompatible versions', () => {
  const wrong = observeToolVersion(spec, {...base, run: () => ({status: 0, stdout: 'demo 9.9.9', stderr: ''})});
  assert.equal(wrong.version.outcome, 'incompatible');
  assert.equal(wrong.version.observed, '9.9.9');
  const valid = observeToolVersion(spec, {...base, run: () => ({status: 0, stdout: 'demo 1.2.3', stderr: ''})});
  assert.equal(valid.version.outcome, 'compatible');
  const ready = attachReadiness(valid, {outcome: 'blocked', probe: 'demo-functional', reason: 'network unavailable'});
  assert.equal(ready.readiness.outcome, 'blocked');
  assert.equal(valid.readiness.outcome, 'not-observed');
});
