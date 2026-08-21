import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  CODEX_WRAPPER_PROJECTIONS,
  syncAdapters,
} from '../scripts/sync-adapters.mjs';

const EXPECTED = [
  'ast-grep',
  'registry-health',
  'stack-router',
  'serena-guidance',
  'context7-guidance',
  'playwright-guidance',
  'session-start',
];

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hhpe-adapters-'));
  const source = path.join(root, 'registry/overlays/wrappers');
  for (const name of [...EXPECTED, 'unreviewed-wrapper']) {
    fs.mkdirSync(path.join(source, name), {recursive: true});
    fs.writeFileSync(path.join(source, name, 'SKILL.md'), `${name}\n`);
  }
  return {root, outputRoot: path.join(root, 'isolated-output')};
}

test('generator ownership is the explicit reviewed seven-wrapper set', () => {
  assert.deepEqual(CODEX_WRAPPER_PROJECTIONS, EXPECTED);
  assert.ok(Object.isFrozen(CODEX_WRAPPER_PROJECTIONS));
});

test('syncAdapters writes all and only owned wrappers beneath an injected output root', t => {
  const {root, outputRoot} = fixture();
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  syncAdapters({root, outputRoot});
  assert.deepEqual(fs.readdirSync(outputRoot).sort(), [...EXPECTED].sort());
  assert.equal(fs.existsSync(path.join(outputRoot, 'unreviewed-wrapper')), false);
});
