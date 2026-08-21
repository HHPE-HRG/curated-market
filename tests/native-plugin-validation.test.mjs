import assert from 'node:assert/strict';
import test from 'node:test';
import {validateExposureDeclarations} from '../lib/registry.mjs';

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
