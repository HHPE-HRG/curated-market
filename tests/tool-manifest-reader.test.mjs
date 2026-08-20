import test from 'node:test';
import assert from 'node:assert/strict';
import {readToolSpecs, validateToolManifest} from '../lib/tool-contracts.mjs';

const portable = {
  tool_id: 'demo-runtime', capability_id: 'demo/use', version: '1.2.3', source: 'npm:demo@1.2.3',
  provenance: {strength: 'approved-external-coordinate'}, commands: ['demo'],
  discovery: {method: 'path', required: ['demo'], aliases: []},
  version_probe: {parser: 'demo-semver', command: 'demo', args: ['--version'], requirement: '1.2.3'},
  readiness_probe: 'demo-functional', provisioning: {execution: 'manual-only', upgrade: 'install demo', removal: 'remove demo'}
};

test('transitional reader preserves portable identity from v1 and v2', () => {
  const v1 = {schema_version: 1, tools: [{tool_id: 'demo-runtime', capability_id: 'demo/use', version: '1.2.3', source: 'npm:demo@1.2.3', binary_paths: ['/host/demo'], status: 'present'}]};
  const v2 = {schema_version: 2, record_kind: 'tool-spec', tools: [portable]};
  for (const manifest of [v1, v2]) assert.deepEqual(readToolSpecs(manifest).map(({tool_id, capability_id, version, source}) => ({tool_id, capability_id, version, source})), [{tool_id: 'demo-runtime', capability_id: 'demo/use', version: '1.2.3', source: 'npm:demo@1.2.3'}]);
});

test('v2 rejects host realization truth and absolute command values', () => {
  const valid = {schema_version: 2, record_kind: 'tool-spec', tools: [portable]};
  assert.deepEqual(validateToolManifest(valid, new Set(['demo/use'])), []);
  for (const [field, value] of [['binary_paths', ['/host/demo']], ['source_binary_paths', ['/host/source']], ['platform', 'linux'], ['noninteractive_path', '/host/bin'], ['status', 'present'], ['generated_at', 'now']]) {
    const errors = validateToolManifest({...valid, tools: [{...portable, [field]: value}]}, new Set(['demo/use']));
    assert.ok(errors.some(error => error.includes(field)), `${field} accepted`);
  }
  const absolute = validateToolManifest({...valid, tools: [{...portable, commands: ['/host/demo']}]}, new Set(['demo/use']));
  assert.ok(absolute.some(error => error.includes('commands')));
});

test('unknown schemas fail closed', () => {
  assert.throws(() => readToolSpecs({schema_version: 99, tools: []}), /unsupported tools manifest schema/);
});
