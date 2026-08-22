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
  assert.ok(cursor.every(e => e.scope !== undefined));
  assert.ok(cursor.every(e => e.enforcement !== undefined));
});

test('plugin-stack is not a registry capability or exposure', () => {
  const capabilities = JSON.parse(fs.readFileSync(path.join(ROOT, 'registry/manifests/capabilities.yaml'), 'utf8')).capabilities;
  assert.equal(capabilities.some(c => c.capability_id === 'hhpe-hrg/cursor-plugin-routing'), false);
  assert.equal(cursor.some(e => /hhpe-hrg-plugin-stack/.test(e.target)), false);
});

test('Cursor local-plugin relationship is allowed', () => {
  const errors = validateExposureDeclarations([
    {
      capability_id: 'hhpe-hrg/session-start',
      host: 'cursor',
      mode: 'local-plugin',
      adapter: 'registry/adapters/cursor',
      target: '~/.cursor/plugins/local/hhpe-hrg-plugin-stack',
      status: 'active',
      scope: 'user-local',
      enforcement: 'guidance',
    },
  ], new Set(['hhpe-hrg/session-start']));
  assert.equal(errors.length, 0);
});

test('every Cursor exposure declares exactly one approved scope and enforcement', () => {
  assert.ok(cursor.length >= 14);
  for (const e of cursor) {
    assert.equal(['user-local', 'project', 'cloud-project'].includes(e.scope), true, e.capability_id);
    assert.equal(['guidance', 'enforceable'].includes(e.enforcement), true, e.capability_id);
  }
});

test('cloud-project is representable without being applied', () => {
  const errors = validateExposureDeclarations([
    {
      capability_id: 'hhpe-hrg/session-start',
      host: 'cursor',
      mode: 'skill-symlink',
      adapter: 'registry/adapters/cursor',
      target: '.cursor/skills/session-start',
      status: 'planned',
      scope: 'cloud-project',
      enforcement: 'guidance',
    },
  ], new Set(['hhpe-hrg/session-start']));
  assert.equal(errors.length, 0);
});

test('user-local Cursor target cannot be a project path', () => {
  const errors = validateExposureDeclarations([
    {
      capability_id: 'hhpe-hrg/session-start',
      host: 'cursor',
      mode: 'skill-symlink',
      adapter: 'registry/adapters/cursor',
      target: '.cursor/skills/session-start',
      status: 'active',
      scope: 'user-local',
      enforcement: 'guidance',
    },
  ], new Set(['hhpe-hrg/session-start']));
  assert.ok(errors.some(e => e.includes('illegal scope/target')));
});

test('project Cursor target cannot be a home path', () => {
  const errors = validateExposureDeclarations([
    {
      capability_id: 'hhpe-hrg/session-start',
      host: 'cursor',
      mode: 'skill-symlink',
      adapter: 'registry/adapters/cursor',
      target: '~/.cursor/skills/session-start',
      status: 'active',
      scope: 'project',
      enforcement: 'guidance',
    },
  ], new Set(['hhpe-hrg/session-start']));
  assert.ok(errors.some(e => e.includes('illegal scope/target')));
});

test('Cursor targets may not use skills-cursor or host-absolute paths', () => {
  for (const target of ['~/.cursor/skills-cursor/x', '/Users/maxholden/.cursor/skills/x']) {
    const errors = validateExposureDeclarations([
      {
        capability_id: 'hhpe-hrg/session-start',
        host: 'cursor',
        mode: 'skill-symlink',
        adapter: 'registry/adapters/cursor',
        target,
        status: 'active',
        scope: 'user-local',
        enforcement: 'guidance',
      },
    ], new Set(['hhpe-hrg/session-start']));
    assert.ok(errors.some(e => e.includes('unsafe target') || e.includes('illegal scope/target')), target);
  }
});

test('skill-symlink cannot be declared enforceable', () => {
  const errors = validateExposureDeclarations([
    {
      capability_id: 'hhpe-hrg/session-start',
      host: 'cursor',
      mode: 'skill-symlink',
      adapter: 'registry/adapters/cursor',
      target: '~/.cursor/skills/session-start',
      status: 'active',
      scope: 'user-local',
      enforcement: 'enforceable',
    },
  ], new Set(['hhpe-hrg/session-start']));
  assert.ok(errors.some(e => e.includes('unsupported enforcement')));
});

test('duplicate Cursor-visible names on one host and scope are rejected', () => {
  const row = {
    capability_id: 'trailofbits/c-review',
    host: 'cursor',
    mode: 'skill-symlink',
    adapter: 'registry/adapters/cursor',
    status: 'active',
    scope: 'user-local',
    enforcement: 'guidance',
    cursor_visible_name: 'c-review',
  };
  const errors = validateExposureDeclarations([
    {...row, target: '~/.cursor/skills/trailofbits-c-review'},
    {...row, target: '~/.cursor/skills/c-review'},
  ], new Set(['trailofbits/c-review']));
  assert.ok(errors.some(e => e.includes('ambiguous Cursor-visible name')));
});
