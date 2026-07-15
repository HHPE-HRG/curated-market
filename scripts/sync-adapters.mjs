#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {projectCursorMarketplace, validateCursorMarketplace} from '../lib/cursor-marketplace.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'registry/overlays/wrappers');
const target = path.join(root, 'registry/adapters/codex/marketplace/plugins/hhpe-registry/skills');
const codexSkills = [
  'ast-grep',
  'registry-health',
  'stack-router',
  'serena-guidance',
  'context7-guidance',
  'playwright-guidance',
  'session-start',
];

for (const name of codexSkills) {
  const from = path.join(source, name);
  const to = path.join(target, name);
  if (!fs.existsSync(from)) continue;
  fs.rmSync(to, {recursive: true, force: true});
  fs.cpSync(from, to, {recursive: true, dereference: true});
}
console.log('generated Codex HHPE adapter skills from canonical overlays');

const cursor = projectCursorMarketplace();
const check = validateCursorMarketplace();
console.log(JSON.stringify({cursor_plugins: cursor.plugins, cursor_validate: check.status}, null, 2));
if (check.status !== 'PASS') {
  console.error(check.errors.join('\n'));
  process.exit(1);
}
