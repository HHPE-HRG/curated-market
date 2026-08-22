import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {ROOT, validateExposureDeclarations} from '../lib/registry.mjs';

const exposures = JSON.parse(fs.readFileSync(path.join(ROOT, 'registry/manifests/exposures.yaml'), 'utf8')).exposures;
const cursor = exposures.filter(e => e.host === 'cursor');

test('Cursor exposures are the fourteen skill-symlink rows', () => {
  assert.equal(cursor.length, 14);
  assert.ok(cursor.every(e => e.mode === 'skill-symlink'));
  assert.ok(cursor.every(e => e.adapter === 'registry/adapters/cursor'));
  assert.ok(cursor.every(e => e.target.startsWith('~/.cursor/skills/')));
  assert.ok(cursor.every(e => e.scope === undefined));
});

test('plugin-stack is not a registry capability or exposure', () => {
  const capabilities = JSON.parse(fs.readFileSync(path.join(ROOT, 'registry/manifests/capabilities.yaml'), 'utf8')).capabilities;
  assert.equal(capabilities.some(c => c.capability_id === 'hhpe-hrg/cursor-plugin-routing'), false);
  assert.equal(cursor.some(e => /hhpe-hrg-plugin-stack/.test(e.target)), false);
});

test('Cursor local-plugin relationship is not yet allowed', () => {
  const errors = validateExposureDeclarations([
    {
      capability_id: 'hhpe-hrg/session-start',
      host: 'cursor',
      mode: 'local-plugin',
      adapter: 'registry/adapters/cursor',
      target: '~/.cursor/plugins/local/hhpe-hrg-plugin-stack',
      status: 'active',
    },
  ], new Set(['hhpe-hrg/session-start']));
  assert.ok(errors.some(e => e.includes('invalid exposure relationship')));
});
