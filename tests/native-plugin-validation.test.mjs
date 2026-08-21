import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {validateExposureDeclarations, validateHostRealization} from '../lib/registry.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const capabilityIds = new Set(['pkg/cap']);
const valid = {
  capability_id: 'pkg/cap',
  host: 'codex',
  mode: 'native-plugin',
  target: 'plugin-name@marketplace-name',
  adapter: 'registry/adapters/codex/marketplace',
  status: 'planned',
};

test('planned native plugin declaration is statically valid without inventory', () => {
  assert.deepEqual(validateExposureDeclarations([valid], capabilityIds), []);
});

for (const [name, exposure, pattern] of [
  ['unsupported status', {...valid, status: 'installed'}, /unsupported exposure status/],
  ['unknown capability', {...valid, capability_id: 'missing/cap'}, /exposure unknown capability/],
  ['malformed target', {...valid, target: '../plugin'}, /unsafe native-plugin target/],
  ['wrong native adapter', {...valid, adapter: 'registry/adapters/codex'}, /invalid exposure relationship/],
]) {
  test(name, () => {
    assert.ok(validateExposureDeclarations([exposure], capabilityIds).some(error => pattern.test(error)));
  });
}

test('existing reviewed exposure relationships remain statically valid', () => {
  const fixtures = [
    ['antigravity-ide', 'skill-symlink', 'registry/adapters/antigravity-ide', '~/skill'],
    ['codex', 'native-plugin', 'registry/adapters/codex/marketplace', 'plugin@market'],
    ['codex', 'skill-symlink', 'registry/adapters/codex', '~/skill'],
    ['cursor', 'skill-symlink', 'registry/adapters/cursor', '~/skill'],
    ['hhpe-hrg', 'registry-reference', 'registry/adapters/hhpe-hrg', 'registry:pkg/cap'],
    ['opencode', 'skill-symlink', 'registry/adapters/opencode', '~/skill'],
  ].map(([host, mode, adapter, target]) => ({...valid, host, mode, adapter, target}));
  assert.deepEqual(validateExposureDeclarations(fixtures, capabilityIds), []);
});

const exposure = (capability_id, target, status = 'active') => ({
  capability_id,
  host: 'codex',
  mode: 'native-plugin',
  target,
  adapter: 'registry/adapters/codex/marketplace',
  status,
});

const observed = (...targets) => () => ({
  command: ['codex', 'plugin', 'list'],
  available: true,
  exit_status: 0,
  stdout: targets.map(target => `${target} installed`).join('\n'),
  stderr: '',
  usable: true,
  installed_targets: targets,
});

test('host and context are explicit and never inferred from ambient Codex', () => {
  assert.throws(() => validateHostRealization(), /host.*required/);
  assert.throws(() => validateHostRealization({host: 'codex'}), /context.*required/);
  assert.throws(() => validateHostRealization({host: 'claude', context: 'deploy-1'}), /unsupported host/);
});

test('active applicable installed requirement passes', () => {
  const result = validateHostRealization({host: 'codex', context: 'deploy-1', exposures: [exposure('pkg/a', 'one@market')], inventoryProbe: observed('one@market')});
  assert.equal(result.status, 'passed');
  assert.equal(result.observations[0].outcome, 'installed');
  assert.equal(result.observations[0].evaluations[0].requirement_source, 'active');
});

test('planned absence is unrequired unless exact target is explicitly selected', () => {
  const planned = exposure('pkg/a', 'one@market', 'planned');
  const ordinary = validateHostRealization({host: 'codex', context: 'dev-1', exposures: [planned], inventoryProbe: observed('other@market')});
  assert.equal(ordinary.status, 'passed');
  assert.equal(ordinary.observations.length, 0);
  const selected = validateHostRealization({host: 'codex', context: 'activation-1', exposures: [planned], requiredPlannedTargets: ['one@market'], inventoryProbe: observed('other@market')});
  assert.equal(selected.status, 'failed');
  assert.equal(selected.observations[0].evaluations[0].requirement_source, 'explicit-planned');
});

for (const [name, probe, outcome] of [
  ['spawn unavailable', () => ({command: ['codex','plugin','list'], available: false, exit_status: null, stdout: '', stderr: 'ENOENT', usable: false, installed_targets: []}), 'indeterminate'],
  ['nonzero probe', () => ({command: ['codex','plugin','list'], available: true, exit_status: 7, stdout: '', stderr: 'failed', usable: false, installed_targets: []}), 'indeterminate'],
  ['unusable output', () => ({command: ['codex','plugin','list'], available: true, exit_status: 0, stdout: '', stderr: '', usable: false, installed_targets: []}), 'indeterminate'],
  ['observed absence', observed('other@market'), 'absent'],
  ['observed installed', observed('one@market'), 'installed'],
]) {
  test(name, () => {
    const result = validateHostRealization({host: 'codex', context: 'host-1', exposures: [exposure('pkg/a', 'one@market')], inventoryProbe: probe});
    assert.equal(result.observations[0].outcome, outcome);
    assert.equal(result.status, outcome === 'installed' ? 'passed' : 'failed');
    assert.equal(result.category, 'host-realization');
    assert.equal(JSON.stringify(result).includes('FAIL_STATIC_INTEGRITY'), false);
  });
}

test('probe evidence is bounded without changing indeterminate outcome', () => {
  const result = validateHostRealization({
    host: 'codex', context: 'host-2', exposures: [exposure('pkg/a', 'one@market')],
    inventoryProbe: () => ({command: ['codex','plugin','list'], available: true, exit_status: 9, stdout: 'x'.repeat(20000), stderr: 'y'.repeat(20000), usable: false, installed_targets: []}),
  });
  assert.equal(result.observations[0].outcome, 'indeterminate');
  assert.equal(result.probe.exit_status, 9);
  assert.match(result.probe.stdout, /<truncated>$/);
  assert.match(result.probe.stderr, /<truncated>$/);
});

test('one inventory and target observation preserve multiple capability evaluations', () => {
  let calls = 0;
  const result = validateHostRealization({
    host: 'codex', context: 'deploy-2',
    exposures: [exposure('pkg/a', 'shared@market'), exposure('pkg/b', 'shared@market')],
    inventoryProbe: () => { calls += 1; return observed('other@market')(); },
  });
  assert.equal(calls, 1);
  assert.equal(result.observations.length, 1);
  assert.deepEqual(result.observations[0].affected_capability_ids, ['pkg/a', 'pkg/b']);
  assert.deepEqual(result.observations[0].evaluations.map(item => item.capability_id), ['pkg/a', 'pkg/b']);
});

test('distinct targets remain distinct observations while sharing one inventory probe', () => {
  let calls = 0;
  const result = validateHostRealization({host: 'codex', context: 'deploy-3', exposures: [exposure('pkg/a', 'one@market'), exposure('pkg/b', 'two@market')], inventoryProbe: () => { calls += 1; return observed('one@market')(); }});
  assert.equal(calls, 1);
  assert.deepEqual(result.observations.map(item => item.target), ['one@market', 'two@market']);
});

test('ordinary current-manifest validation does not broaden scope to planned targets', () => {
  const result = validateHostRealization({host: 'codex', context: 'developer-checkout', inventoryProbe: () => { throw new Error('must not probe'); }});
  assert.equal(result.status, 'passed');
  assert.deepEqual(result.observations, []);
});

test('explicit planned selection rejects an unknown target before probing', () => {
  assert.throws(() => validateHostRealization({host: 'codex', context: 'activation-2', exposures: [exposure('pkg/a', 'one@market', 'planned')], requiredPlannedTargets: ['unknown@market'], inventoryProbe: () => { throw new Error('must not probe'); }}), /no matching planned declaration/);
});

function cliFixture(t, {inventory = '', exitStatus = 0} = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hhpe-host-cli-'));
  const marker = path.join(directory, 'called');
  const executable = path.join(directory, 'codex');
  fs.writeFileSync(executable, `#!/bin/sh\nprintf called > '${marker}'\nprintf '%s' '${inventory}'\nexit ${exitStatus}\n`);
  fs.chmodSync(executable, 0o755);
  t.after(() => fs.rmSync(directory, {recursive: true, force: true}));
  return {
    probeMarker: marker,
    run(args) {
      return spawnSync(process.execPath, ['lib/registry.mjs', ...args], {
        cwd: ROOT,
        encoding: 'utf8',
        env: {...process.env, PATH: `${directory}${path.delimiter}${process.env.PATH}`},
      });
    },
  };
}

test('explicit host command fails required planned target as host realization, not static integrity', t => {
  const fixture = cliFixture(t, {inventory: 'other@market installed\n'});
  const result = fixture.run(['validate-host', '--host', 'codex', '--context', 'activation-4', '--require-planned-target', '00-hhpe-registry@hhpe-hrg']);
  assert.equal(result.status, 1);
  const body = JSON.parse(result.stdout);
  assert.equal(body.category, 'host-realization');
  assert.equal(body.status, 'failed');
  assert.equal(result.stdout.includes('FAIL_STATIC_INTEGRITY'), false);
  assert.equal(body.observations[0].outcome, 'absent');
});

test('explicit host command rejects missing context before probing', t => {
  const fixture = cliFixture(t, {inventory: '00-hhpe-registry@hhpe-hrg installed\n'});
  const result = fixture.run(['validate-host', '--host', 'codex']);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /--context/);
  assert.equal(fs.existsSync(fixture.probeMarker), false);
});

test('explicit host command passes installed selected target', t => {
  const fixture = cliFixture(t, {inventory: '00-hhpe-registry@hhpe-hrg installed\n'});
  const result = fixture.run(['validate-host', '--host', 'codex', '--context', 'activation-5', '--require-planned-target', '00-hhpe-registry@hhpe-hrg']);
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).observations[0].outcome, 'installed');
});

test('explicit host command reports unavailable inventory as indeterminate host failure', t => {
  const fixture = cliFixture(t, {exitStatus: 9});
  const result = fixture.run(['validate-host', '--host', 'codex', '--context', 'activation-6', '--require-planned-target', '00-hhpe-registry@hhpe-hrg']);
  assert.equal(result.status, 1);
  const body = JSON.parse(result.stdout);
  assert.equal(body.observations[0].outcome, 'indeterminate');
  assert.equal(body.probe.exit_status, 9);
});

test('explicit host command accepts repeated planned targets and rejects unknown selection', t => {
  const fixture = cliFixture(t, {inventory: '00-hhpe-registry@hhpe-hrg installed\nsuperpowers@hhpe-hrg installed\n'});
  const pass = fixture.run(['validate-host', '--host', 'codex', '--context', 'activation-7', '--require-planned-target', '00-hhpe-registry@hhpe-hrg', '--require-planned-target', 'superpowers@hhpe-hrg']);
  assert.equal(pass.status, 0);
  assert.equal(JSON.parse(pass.stdout).observations.length, 2);
  const invalid = fixture.run(['validate-host', '--host', 'codex', '--context', 'activation-8', '--require-planned-target', 'unknown@market']);
  assert.equal(invalid.status, 2);
  assert.match(invalid.stderr, /no matching planned declaration/);
});
