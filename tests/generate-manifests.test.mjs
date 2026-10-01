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

test('isolated generate emits Codex skill-symlink for overlay orig, not planned native-plugin', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hhpe-manifests-codex-'));
  const result = spawnSync(process.execPath, [script], {cwd: ROOT, env: {...process.env, HHPE_MANIFEST_OUT: root}, encoding: 'utf8'});
  assert.equal(result.status, 0, result.stderr);
  const exposures = JSON.parse(fs.readFileSync(path.join(root, 'exposures.yaml'), 'utf8')).exposures;
  const orig = exposures.filter((e) => e.capability_id === 'hhpe-hrg/original-source-research' && e.host === 'codex');
  assert.equal(orig.length, 1);
  assert.equal(orig[0].mode, 'skill-symlink');
  assert.equal(orig[0].status, 'active');
  assert.equal(orig[0].target, '~/.codex/skills/original-source-research');
  assert.equal(orig[0].adapter, 'registry/adapters/codex');
  fs.rmSync(root, {recursive: true, force: true});
});
