import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveRuntimeHome, resolveManifestRoot, functionControlRoot } from '../lib/function-control/paths.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('runtime home defaults away from source checkout', () => {
  const runtime = resolveRuntimeHome({});
  assert.notEqual(runtime, REPO_ROOT);
  assert.ok(runtime.includes('hhpe-hrg'));
});

test('manifest root defaults to checkout for catalog reads', () => {
  const manifest = resolveManifestRoot({});
  assert.equal(manifest, REPO_ROOT);
});

test('function control root is under runtime home not manifest root by default', () => {
  const runtime = resolveRuntimeHome({});
  const fc = functionControlRoot({});
  assert.equal(fc, path.join(runtime, 'function-control'));
  assert.notEqual(fc, path.join(REPO_ROOT, 'function-control'));
});
