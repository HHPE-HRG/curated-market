/**
 * Agent context: Lookers derive `owner:skill` prefixes from Market metadata,
 * not from renaming SKILL.md `name`. Intended: `availability_host` is
 * `any|codex|cursor|claude|t3|openhands`; missing means `any` so legacy
 * capability rows stay valid. Observed: T3 `$` used host home trees instead
 * of this field.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  availabilityHostOf,
  validateCapabilityHostMetadata,
} from '../lib/registry.mjs';

test('availability_host any validates', () => {
  assert.deepEqual(
    validateCapabilityHostMetadata([
      {capability_id: 'hhpe-hrg/original-source-research', availability_host: 'any'},
    ]),
    [],
  );
});

test('availability_host codex validates', () => {
  assert.deepEqual(
    validateCapabilityHostMetadata([
      {capability_id: 'demo/computer-use', availability_host: 'codex'},
    ]),
    [],
  );
});

test('availability_host laptop fails validate', () => {
  const errors = validateCapabilityHostMetadata([
    {capability_id: 'demo/bad', availability_host: 'laptop'},
  ]);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /invalid availability_host demo\/bad: laptop/);
});

test('omitted availability_host is treated as any', () => {
  assert.equal(availabilityHostOf({capability_id: 'demo/legacy'}), 'any');
  assert.deepEqual(
    validateCapabilityHostMetadata([{capability_id: 'demo/legacy'}]),
    [],
  );
});
