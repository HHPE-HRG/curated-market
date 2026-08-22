import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {validate} from '../lib/registry.mjs';
import {staticIntegrity} from '../lib/skills-ci.mjs';

function withFailingCodex(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hhpe-codex-probe-'));
  const marker = path.join(directory, 'called');
  const executable = path.join(directory, 'codex');
  fs.writeFileSync(executable, `#!/bin/sh\nprintf called > '${marker}'\nexit 99\n`);
  fs.chmodSync(executable, 0o755);
  const previous = process.env.PATH;
  process.env.PATH = `${directory}${path.delimiter}${previous}`;
  t.after(() => {
    process.env.PATH = previous;
    fs.rmSync(directory, {recursive: true, force: true});
  });
  return marker;
}

test('validate never invokes native plugin inventory', t => {
  const marker = withFailingCodex(t);
  validate();
  assert.equal(fs.existsSync(marker), false);
});

test('staticIntegrity never invokes native plugin inventory', t => {
  const marker = withFailingCodex(t);
  staticIntegrity();
  assert.equal(fs.existsSync(marker), false);
});
