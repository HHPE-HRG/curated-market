import test from 'node:test';
import assert from 'node:assert/strict';
import {
  checkAstGrep,
  evaluateAstGrep,
  projectLegacyResult
} from '../lib/capability-checks.mjs';
import {toolSpecRevision} from '../lib/tool-contracts.mjs';

const context = {id: 'worker-a', platform: 'linux', arch: 'x64', reusable: true};
const found = command => ({outcome: 'present', command, executable: `/worker/bin/${command}`, realpath: `/worker/runtime/${command}`});
const options = {
  context,
  now: () => '2026-08-20T00:00:00.000Z',
  resolve: command => found(command),
  run: (_command, args) => args[0] === '--version'
    ? {status: 0, stdout: 'ast-grep 0.43.0', stderr: ''}
    : {status: 0, stdout: 'fixture match', stderr: ''}
};

test('AST Grep returns a context-bound observation without mandatory persistence', () => {
  let writes = 0;
  const value = checkAstGrep({...options, writeReport: undefined});
  assert.equal(writes, 0);
  assert.equal(value.tool_observation.discovery.executable, '/worker/bin/ast-grep');
  assert.equal(value.tool_observation.discovery.realpath, '/worker/runtime/ast-grep');
  assert.equal(value.tool_observation.version.outcome, 'compatible');
  assert.equal(value.tool_observation.readiness.outcome, 'satisfied');
  assert.deepEqual(value.tool_observation.execution_context, context);
});

test('AST Grep retains absence, probe failure, wrong version and readiness failure', () => {
  const absent = checkAstGrep({...options, resolve: command => ({outcome: 'absent', command})});
  assert.equal(absent.tool_observation.discovery.outcome, 'absent');
  assert.equal(absent.tool_observation.version.outcome, 'not-observed');
  const probe = checkAstGrep({...options, run: () => ({status: 2, stdout: '', stderr: 'dependency failed'})});
  assert.equal(probe.tool_observation.version.outcome, 'indeterminate');
  const wrong = checkAstGrep({...options, run: () => ({status: 0, stdout: 'ast-grep 9.9.9', stderr: ''})});
  assert.equal(wrong.tool_observation.version.outcome, 'incompatible');
  const readiness = checkAstGrep({...options, run: (_command, args) => args[0] === '--version' ? {status: 0, stdout: 'ast-grep 0.43.0', stderr: ''} : {status: 1, stdout: '', stderr: 'parse failed'}});
  assert.equal(readiness.tool_observation.readiness.outcome, 'failed');
});

test('same blocked observation has requirement-specific compatibility conclusions', () => {
  const observed = checkAstGrep({...options}).tool_observation;
  const blocked = {...observed, readiness: {outcome: 'blocked', probe: 'ast-grep-structural-fixture', reason: 'fixture unavailable'}};
  assert.equal(evaluateAstGrep('cli-inspection', blocked).satisfied, true);
  assert.equal(evaluateAstGrep('structural-refactor', blocked).satisfied, false);
});

test('legacy projection is derived from observation and evaluation', () => {
  const value = checkAstGrep(options);
  const evaluation = evaluateAstGrep('structural-refactor', value.tool_observation);
  assert.deepEqual(projectLegacyResult('ast-grep', value.tool_observation, evaluation), value);
  assert.throws(() => projectLegacyResult('ast-grep', value.tool_observation, {...evaluation, observed_at: 'different'}), /evaluation does not apply/);
});

test('explicit report writer receives exactly the returned projection', () => {
  const writes = [];
  const value = checkAstGrep({...options, writeReport: (name, report) => writes.push([name, report])});
  assert.deepEqual(writes, [['ast-grep', value]]);
});

test('shared boundary links identity and observation without flattening readiness classes', () => {
  const common = {version: '1.0.0', provenance: {strength: 'approved-external-coordinate'}, discovery: {method: 'path'}, version_probe: {parser: 'semver', command: 'tool', args: ['--version'], requirement: '1.0.0'}};
  const classes = [
    {tool_id: 'ast-grep-runtime', readiness_probe: 'ast-grep-structural-fixture', dependencies: ['local-executable', 'alias-realpath']},
    {tool_id: 'serena-runtime', readiness_probe: 'serena-project-activation', dependencies: ['project', 'language-toolchain']},
    {tool_id: 'context7-runtime', readiness_probe: 'context7-live-lookup', dependencies: ['network', 'authentication', 'service']},
    {tool_id: 'playwright-cli-runtime', readiness_probe: 'playwright-layered-readiness', dependencies: ['generated-material', 'browser', 'daemon']}
  ].map(entry => ({...common, ...entry}));
  assert.equal(new Set(classes.map(toolSpecRevision)).size, 4);
  assert.deepEqual(classes.map(item => item.dependencies), [
    ['local-executable', 'alias-realpath'],
    ['project', 'language-toolchain'],
    ['network', 'authentication', 'service'],
    ['generated-material', 'browser', 'daemon']
  ]);
});
