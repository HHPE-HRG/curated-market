import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {validate, sync, ROOT} from '../lib/registry.mjs';
import {staticIntegrity} from '../lib/skills-ci.mjs';
import {validateCursorMarketplace, VENDOR_PLUGIN_IDS} from '../lib/cursor-marketplace.mjs';

test('registry integrity passes', () => {
  const r = validate();
  assert.equal(r.status, 'passed');
  assert.equal(r.counts.packages, 7);
  assert.ok(r.counts.capabilities >= 96);
  assert.equal(r.cursor_marketplace, 'PASS');
});

test('headless static integrity covers the complete capability catalog', () => {
  const r = staticIntegrity();
  assert.equal(r.status, 'PASS');
  assert.equal(r.counts.capabilities, 96);
});

test('dry run is additive and collision free', () => {
  const r = sync();
  assert.equal(r.mode, 'dry-run');
  assert.ok(r.actions.length > 0);
  assert.ok(r.actions.every(a => ['LINK', 'SKIP', 'REGISTER'].includes(a.action)));
});

test('whole skill directory exposure resolves supporting files', () => {
  const cap = JSON.parse(fs.readFileSync(path.join(ROOT, 'registry/manifests/capabilities.yaml'))).capabilities.find(c => c.capability_id === 'superpowers/systematic-debugging');
  assert.ok(cap.requires.files.length);
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'registry/manifests/packages.lock.yaml'))).packages.find(p => p.package_id === cap.package_id);
  const source = path.join(ROOT, pkg.package_root, cap.source_path);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hhpe-link-'));
  const link = path.join(tmp, 'skill');
  fs.symlinkSync(source, link, 'dir');
  assert.ok(fs.readFileSync(path.join(link, 'SKILL.md'), 'utf8').includes('systematic'));
  for (const rel of cap.requires.files) assert.ok(fs.existsSync(path.join(ROOT, pkg.package_root, rel)));
  fs.rmSync(tmp, {recursive: true});
});

test('ast-grep search, preview and exact rewrite', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hhpe-sg-'));
  const file = path.join(tmp, 'fixture.js');
  fs.writeFileSync(file, 'const x = 1;\nconsole.log(x);\n');
  const args = ['run', '-p', 'console.log($A)', '-l', 'js', file];
  let r = spawnSync('ast-grep', args, {encoding: 'utf8'});
  assert.equal(r.status, 0);
  assert.match(r.stdout, /console\.log/);
  r = spawnSync('ast-grep', [...args.slice(0, 5), '-r', 'logger.info($A)', file], {encoding: 'utf8'});
  assert.equal(r.status, 0);
  assert.equal(fs.readFileSync(file, 'utf8'), 'const x = 1;\nconsole.log(x);\n');
  r = spawnSync('ast-grep', ['run', '-p', 'console.log($A)', '-l', 'js', '-r', 'logger.info($A)', '--update-all', file], {encoding: 'utf8'});
  assert.equal(r.status, 0);
  assert.equal(fs.readFileSync(file, 'utf8'), 'const x = 1;\nlogger.info(x);\n');
  r = spawnSync('node', ['--check', file], {encoding: 'utf8'});
  assert.equal(r.status, 0);
  fs.rmSync(tmp, {recursive: true});
});

test('all executable wrappers invoke a registry core', () => {
  for (const f of fs.readdirSync(path.join(ROOT, 'bin'))) {
    const s = fs.readFileSync(path.join(ROOT, 'bin', f), 'utf8');
    assert.match(s, /registry\.mjs|skills-ci\.mjs|capability-checks\.mjs|project-cursor-marketplace\.mjs/);
    assert.match(s, /exec node/);
  }
});

test('generated HHPE Codex adapter matches canonical overlays', () => {
  for (const name of ['ast-grep', 'registry-health', 'stack-router', 'serena-guidance', 'context7-guidance', 'playwright-guidance', 'session-start']) {
    const src = path.join(ROOT, 'registry/overlays/wrappers', name);
    const dst = path.join(ROOT, 'registry/adapters/codex/marketplace/plugins/hhpe-registry/skills', name);
    if (!fs.existsSync(dst)) continue;
    const files = d => fs.readdirSync(d, {withFileTypes: true}).flatMap(e => e.isDirectory() ? files(path.join(d, e.name)) : [path.relative(src, path.join(d, e.name))]);
    for (const rel of files(src)) assert.equal(fs.readFileSync(path.join(dst, rel), 'utf8'), fs.readFileSync(path.join(src, rel), 'utf8'));
  }
});

test('Cursor marketplace projection is import-ready', () => {
  const r = validateCursorMarketplace();
  assert.equal(r.status, 'PASS', r.errors.join('\n'));
  for (const id of [...VENDOR_PLUGIN_IDS, 'hhpe-registry']) {
    assert.ok(r.plugins.includes(id), `missing ${id}`);
    assert.ok(fs.existsSync(path.join(ROOT, 'plugins', id, '.cursor-plugin', 'plugin.json')));
    assert.ok(fs.existsSync(path.join(ROOT, 'plugins', id, '.hhpe-pin.json')));
  }
  const market = JSON.parse(fs.readFileSync(path.join(ROOT, '.cursor-plugin/marketplace.json'), 'utf8'));
  assert.equal(market.name, 'hhpe-curated-market');
  assert.equal(market.metadata.pluginRoot, 'plugins');
});
