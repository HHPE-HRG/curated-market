import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {
  APPROVED_OPENCODE_ONLY_POLICY,
  readOpencodeOnlyFiles,
  validateOpencodeOnly,
} from '../lib/opencode-specialization.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('specialization manifest is exact executable opencode_only authority', () => {
  const {specialization} = readOpencodeOnlyFiles({root: ROOT});
  assert.deepEqual(specialization, APPROVED_OPENCODE_ONLY_POLICY);
  assert.deepEqual(validateOpencodeOnly({root: ROOT, specialization}).errors, []);
});

test('specialization rejects contradictory runtime, target, range, and bypass selection', () => {
  for (const mutate of [
    value => { value.specialization_id = 'general'; },
    value => { value.agent_runtime = 'cursor'; },
    value => { value.personalization_target = 'codex'; },
    value => { value.opencode_runtime.maximum_exclusive = '3.0.0'; },
    value => { value.personalization_paths_bypassed = ['codex-direct', 'cursor-direct']; },
  ]) {
    const value = structuredClone(APPROVED_OPENCODE_ONLY_POLICY);
    mutate(value);
    assert.equal(validateOpencodeOnly({specialization: value}).ok, false);
  }
});

test('static specialization validation does not inspect hosts or local auth state', () => {
  const original = fs.readFileSync;
  fs.readFileSync = function(file, ...args) {
    const value = String(file);
    if (/hosts\.yaml|auth\.json|node_modules|\.cache|opencode.*cache/i.test(value)) {
      throw new Error(`forbidden read: ${value}`);
    }
    return original.call(this, file, ...args);
  };
  try {
    assert.equal(validateOpencodeOnly({root: ROOT}).ok, true);
  } finally {
    fs.readFileSync = original;
  }
});
