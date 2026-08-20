import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {ROOT} from '../lib/registry.mjs';

const readJson = file => JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));

test('v1 records four approved tool identities and mixed host facts', () => {
  const manifest = readJson('registry/manifests/tools.yaml');
  assert.equal(manifest.schema_version, 1);
  assert.deepEqual(manifest.tools.map(({tool_id, version, source}) => [tool_id, version, source]), [
    ['ast-grep-runtime', '0.43.0', 'npm:@ast-grep/cli@0.43.0'],
    ['serena-runtime', '1.5.3', 'uv:serena-agent==1.5.3'],
    ['context7-runtime', '0.5.4', 'npm:ctx7@0.5.4'],
    ['playwright-cli-runtime', '0.1.17', 'npm:@playwright/cli@0.1.17']
  ]);
  assert.equal(manifest.tools.every(tool => 'binary_paths' in tool && 'status' in tool), true);
  assert.equal(manifest.tools.every(tool => tool.status === 'present'), true);
});

test('tracked tool reports retain legacy envelopes', () => {
  for (const name of ['serena', 'context7', 'playwright']) {
    const report = readJson(`reports/capability-checks/${name}.json`);
    for (const field of ['check', 'result', 'generated_at', 'evidence']) assert.ok(field in report, `${name}: ${field}`);
  }
  const summary = readJson('reports/capability-checks/summary.json');
  assert.ok('generated_at' in summary);
  assert.ok(Array.isArray(summary.checks));
});

test('generator cannot reproduce checked-in tool registry', () => {
  const source = fs.readFileSync(path.join(ROOT, 'scripts/generate-manifests.mjs'), 'utf8');
  assert.match(source, /save\('tools\.yaml'/);
  const literalToolIds = [...source.matchAll(/tool_id:'([^']+)'/g)].map(match => match[1]);
  assert.deepEqual(literalToolIds, ['ast-grep-runtime']);
  assert.equal(readJson('registry/manifests/tools.yaml').tools.length, 4);
});

test('tool classes carry distinct readiness dependencies', () => {
  const checks = fs.readFileSync(path.join(ROOT, 'lib/capability-checks.mjs'), 'utf8');
  assert.match(checks, /project.*create/s);
  assert.match(checks, /library.*react.*useEffect/s);
  assert.match(checks, /packagedSkill/);
  assert.match(checks, /browser daemon\/browser binaries/);
});
