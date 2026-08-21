import test from 'node:test';
import assert from 'node:assert/strict';
import {readToolSpecs, validateToolManifest} from '../lib/tool-contracts.mjs';
import fs from 'node:fs';
import {ROOT} from '../lib/registry.mjs';

const portable = {
  tool_id: 'demo-runtime', capability_id: 'demo/use', version: '1.2.3', source: 'npm:demo@1.2.3',
  provenance: {strength: 'approved-external-coordinate'}, commands: ['demo'],
  discovery: {method: 'path', required: ['demo'], aliases: []},
  version_probe: {parser: 'demo-semver', command: 'demo', args: ['--version'], requirement: '1.2.3'},
  readiness_probe: 'demo-functional', provisioning: {execution: 'manual-only', upgrade: 'install demo', removal: 'remove demo'}
};

test('canonical reader rejects v1 after inspected consumers migrate', () => {
  const v1 = {schema_version: 1, tools: [{tool_id: 'demo-runtime', capability_id: 'demo/use', version: '1.2.3', source: 'npm:demo@1.2.3', binary_paths: ['/host/demo'], status: 'present'}]};
  assert.throws(() => readToolSpecs(v1), /unsupported tools manifest schema 1/);
  const v2 = {schema_version: 2, record_kind: 'tool-spec', tools: [portable]};
  assert.deepEqual(readToolSpecs(v2).map(({tool_id, capability_id, version, source}) => ({tool_id, capability_id, version, source})), [{tool_id: 'demo-runtime', capability_id: 'demo/use', version: '1.2.3', source: 'npm:demo@1.2.3'}]);
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

test('v2 recursively rejects nested host-bound and traversal command fields and root generated_at', () => {
  const valid = {schema_version: 2, record_kind: 'tool-spec', tools: [portable]};
  const table = [
    ['root generated_at', {...valid, generated_at: '2026-08-20T00:00:00.000Z'}, 'generated_at'],
    ['discovery required absolute', {...valid, tools: [{...portable, discovery: {...portable.discovery, required: ['/host/demo']}}]}, 'discovery'],
    ['discovery required traversal', {...valid, tools: [{...portable, discovery: {...portable.discovery, required: ['../demo']}}]}, 'discovery'],
    ['discovery alias absolute', {...valid, tools: [{...portable, discovery: {...portable.discovery, aliases: ['/tmp/sg']}}]}, 'discovery'],
    ['discovery alias traversal', {...valid, tools: [{...portable, discovery: {...portable.discovery, aliases: ['..\\sg']}}]}, 'discovery'],
    ['version_probe command absolute', {...valid, tools: [{...portable, version_probe: {...portable.version_probe, command: '/usr/bin/demo'}}]}, 'version_probe'],
    ['version_probe command traversal', {...valid, tools: [{...portable, version_probe: {...portable.version_probe, command: '../demo'}}]}, 'version_probe'],
    ['version_probe args absolute', {...valid, tools: [{...portable, version_probe: {...portable.version_probe, args: ['--config', '/etc/demo.conf']}}]}, 'version_probe'],
    ['version_probe args traversal', {...valid, tools: [{...portable, version_probe: {...portable.version_probe, args: ['../../secret']}}]}, 'version_probe'],
  ];
  for (const [label, manifest, needle] of table) {
    const errors = validateToolManifest(manifest, new Set(['demo/use']));
    assert.ok(errors.some(error => error.includes(needle)), `${label}: ${errors.join('; ') || 'no errors'}`);
  }
  assert.deepEqual(validateToolManifest({
    ...valid,
    tools: [{
      ...portable,
      discovery: {method: 'path', required: ['demo'], aliases: ['demo-alias']},
      version_probe: {...portable.version_probe, args: ['--version', '--json']},
    }],
  }, new Set(['demo/use'])), []);
});

test('unknown schemas fail closed', () => {
  assert.throws(() => readToolSpecs({schema_version: 99, tools: []}), /unsupported tools manifest schema/);
});

test('canonical manifest is portable v2 with stable approved identities', () => {
  const manifest = JSON.parse(fs.readFileSync(`${ROOT}/registry/manifests/tools.yaml`, 'utf8'));
  assert.equal(manifest.schema_version, 2);
  assert.equal(manifest.record_kind, 'tool-spec');
  assert.deepEqual(manifest.tools.map(({tool_id, version, source}) => [tool_id, version, source]), [
    ['ast-grep-runtime', '0.43.0', 'npm:@ast-grep/cli@0.43.0'],
    ['serena-runtime', '1.5.3', 'uv:serena-agent==1.5.3'],
    ['context7-runtime', '0.5.4', 'npm:ctx7@0.5.4'],
    ['playwright-cli-runtime', '0.1.17', 'npm:@playwright/cli@0.1.17']
  ]);
  assert.deepEqual(validateToolManifest(manifest), []);
});
