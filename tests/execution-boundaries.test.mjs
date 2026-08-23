import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function collectMjs(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectMjs(full));
    else if (entry.name.endsWith('.mjs')) out.push(full);
  }
  return out;
}

test('function-control must not import execution-resolve', () => {
  const files = collectMjs(path.join(ROOT, 'lib/function-control'));
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    assert.ok(
      !text.includes('execution-resolve') && !text.includes('execution_resolve'),
      `${path.relative(ROOT, file)} imports execution-resolve`,
    );
  }
});

test('behavior registry core must not import execution-resolve', () => {
  for (const rel of ['lib/registry.mjs', 'lib/skills-ci.mjs', 'lib/capability-checks.mjs', 'lib/behavior-projection.mjs']) {
    const file = path.join(ROOT, rel);
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, 'utf8');
    assert.ok(
      !text.includes('execution-resolve') && !text.includes("from './execution-resolve"),
      `${rel} imports execution-resolve`,
    );
  }
});

test('execution-resolve may import function-control and behavior-projection', () => {
  const file = path.join(ROOT, 'lib/execution-resolve.mjs');
  assert.ok(fs.existsSync(file), 'lib/execution-resolve.mjs must exist');
  const text = fs.readFileSync(file, 'utf8');
  assert.ok(text.includes('behavior-projection') || text.includes('Behavior'));
  assert.ok(text.includes('function-control') || text.includes('Function'));
});
