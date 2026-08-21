import assert from 'node:assert/strict';
import test from 'node:test';
import {validateExposureDeclarations, validateHostRealization} from '../lib/registry.mjs';

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
