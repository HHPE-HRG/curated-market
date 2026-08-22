import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ROOT} from '../lib/registry.mjs';

const script = path.join(ROOT, 'scripts/generate-manifests.mjs');

test('general generator exposes isolated output and does not own tools.yaml', () => {
  const source = fs.readFileSync(script, 'utf8');
  assert.doesNotMatch(source, /save\(['"]tools\.yaml['"]/);
  assert.match(source, /HHPE_MANIFEST_OUT/);
});

test('general generation neither overwrites nor creates tools.yaml', () => {
  for (const present of [true, false]) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hhpe-manifests-'));
    const file = path.join(root, 'tools.yaml');
    if (present) fs.writeFileSync(file, 'sentinel\n');
    const result = spawnSync(process.execPath, [script], {cwd: ROOT, env: {...process.env, HHPE_MANIFEST_OUT: root}, encoding: 'utf8'});
    assert.equal(result.status, 0, result.stderr);
    assert.equal(fs.existsSync(file), present);
    if (present) assert.equal(fs.readFileSync(file, 'utf8'), 'sentinel\n');
    fs.rmSync(root, {recursive: true, force: true});
  }
});
