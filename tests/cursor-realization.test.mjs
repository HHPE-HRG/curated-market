import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {ROOT, validateExposureDeclarations} from '../lib/registry.mjs';
import {classifyCursorSkillLink} from '../lib/cursor-provenance.mjs';

const exposures = JSON.parse(fs.readFileSync(path.join(ROOT, 'registry/manifests/exposures.yaml'), 'utf8')).exposures;
const cursor = exposures.filter(e => e.host === 'cursor');

test('Cursor exposures are the fourteen skill-symlink rows', () => {
  const skills = cursor.filter(e => e.mode === 'skill-symlink');
  assert.equal(skills.length, 14);
  assert.ok(skills.every(e => e.adapter === 'registry/adapters/cursor'));
  assert.ok(skills.every(e => e.target.startsWith('~/.cursor/skills/')));
  assert.ok(cursor.every(e => e.scope !== undefined));
  assert.ok(cursor.every(e => e.enforcement !== undefined));
});

test('plugin-stack is a registry capability with two scoped bindings', () => {
  const capabilities = JSON.parse(fs.readFileSync(path.join(ROOT, 'registry/manifests/capabilities.yaml'), 'utf8')).capabilities;
  assert.equal(capabilities.some(c => c.capability_id === 'hhpe-hrg/cursor-plugin-routing'), true);
  const bindings = cursor.filter(e => e.capability_id === 'hhpe-hrg/cursor-plugin-routing');
  assert.equal(bindings.length, 2);
  assert.ok(bindings.some(e => e.mode === 'local-plugin' && e.scope === 'user-local' && e.target === '~/.cursor/plugins/local/hhpe-hrg-plugin-stack'));
  assert.ok(bindings.some(e => e.mode === 'local-plugin' && e.scope === 'project' && e.target === '.cursor/plugins/local/hhpe-hrg-plugin-stack'));
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

const bindings = [
  {capability_id: 'trailofbits/c-review', cursor_visible_name: 'trailofbits-c-review', scope: 'user-local', target: '~/.cursor/skills/trailofbits-c-review'},
];
const registryRoots = ['/repo/registry'];
const poolRoot = '/home/user/.hhpe-skill-pool';
const inactive = new Set(['superpowers/brainstorming']);

test('namespaced registry link is registry-owned', () => {
  assert.equal(classifyCursorSkillLink({
    name: 'trailofbits-c-review',
    target: '/repo/registry/packages/trailofbits/skills/c-review',
    bindings,
    registryRoots,
    poolRoot,
    inactive,
  }), 'registry-owned projection');
});

test('un-namespaced pool alias is unmanaged-foreign', () => {
  assert.equal(classifyCursorSkillLink({
    name: 'c-review',
    target: '/home/user/.hhpe-skill-pool/c-review',
    bindings,
    registryRoots,
    poolRoot,
    inactive,
  }), 'unmanaged-foreign');
});

test('inactive Superpowers pool name is retired', () => {
  assert.equal(classifyCursorSkillLink({
    name: 'brainstorming',
    target: '/home/user/.hhpe-skill-pool/brainstorming',
    bindings,
    registryRoots,
    poolRoot,
    inactive,
  }), 'explicitly unsupported or retired');
});

test('unmanaged local directory is unmanaged-foreign', () => {
  assert.equal(classifyCursorSkillLink({
    name: 'execution-discipline',
    target: '/Users/maxholden/.cursor/skills/execution-discipline',
    bindings,
    registryRoots,
    poolRoot,
    inactive,
  }), 'unmanaged-foreign');
});

test('Cursor plugin cache path without binding is native realization', () => {
  assert.equal(classifyCursorSkillLink({
    name: 'some-marketplace-skill',
    target: '/Users/maxholden/.cursor/plugins/cache/marketplace/some-marketplace-skill',
    bindings,
    registryRoots,
    poolRoot,
    inactive,
  }), 'native Cursor realization');
});
