import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import test from 'node:test';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {
  OPENCODE_SKILL_PROJECTIONS,
  checkOpencodeSkills,
  compareOpencodeSkills,
  syncOpencodeSkills,
} from '../scripts/sync-opencode.mjs';

const PROJECTIONS = [
  {capabilityId: 'hhpe-hrg/ast-grep', source: 'ast-grep', destination: 'ast-grep'},
  {capabilityId: 'hhpe-hrg/registry-health', source: 'registry-health', destination: 'registry-health'},
  {capabilityId: 'hhpe-hrg/stack-router', source: 'stack-router', destination: 'stack-router'},
  {capabilityId: 'hhpe-hrg/serena-guidance', source: 'serena-guidance', destination: 'serena-guidance'},
  {capabilityId: 'hhpe-hrg/context7-guidance', source: 'context7-guidance', destination: 'context7-guidance'},
  {capabilityId: 'hhpe-hrg/playwright-guidance', source: 'playwright-guidance', destination: 'playwright-guidance'},
  {capabilityId: 'hhpe-hrg/session-start', source: 'session-start', destination: 'session-start'},
];
const SCRIPT = fileURLToPath(new URL('../scripts/sync-opencode.mjs', import.meta.url));

function makeFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hhpe-opencode-'));
  const sources = path.join(root, 'registry/overlays/wrappers');
  const outputRoot = path.join(root, 'isolated/.opencode/skills');
  for (const {source} of [...PROJECTIONS, {source: 'unselected-eighth'}]) {
    fs.mkdirSync(path.join(sources, source), {recursive: true});
    fs.writeFileSync(path.join(sources, source, 'SKILL.md'), `${source}\n`, {mode: 0o600});
  }
  const reference = path.join(sources, 'ast-grep/references/rule_reference.md');
  fs.mkdirSync(path.dirname(reference), {recursive: true, mode: 0o700});
  fs.writeFileSync(reference, 'recursive support\n', {mode: 0o640});
  const executable = path.join(sources, 'session-start/scripts/start.sh');
  fs.mkdirSync(path.dirname(executable), {recursive: true});
  fs.writeFileSync(executable, '#!/bin/sh\nexit 0\n', {mode: 0o711});
  return {root, sources, outputRoot};
}

function snapshot(root) {
  if (!fs.existsSync(root)) return [];
  const result = [];
  const visit = (directory, prefix = '') => {
    for (const name of fs.readdirSync(directory).sort()) {
      const relative = path.join(prefix, name);
      const file = path.join(directory, name);
      const stat = fs.lstatSync(file);
      if (stat.isDirectory()) {
        result.push({path: relative, type: 'directory', mode: stat.mode & 0o777});
        visit(file, relative);
      } else if (stat.isSymbolicLink()) {
        result.push({path: relative, type: 'symlink', target: fs.readlinkSync(file)});
      } else {
        result.push({
          path: relative,
          type: stat.isFile() ? 'file' : 'unsupported',
          bytes: stat.isFile() ? fs.readFileSync(file).toString('hex') : undefined,
          mode: stat.mode & 0o777,
        });
      }
    }
  };
  visit(root);
  return result;
}

function seedOwnedOutput(fixture) {
  fs.mkdirSync(path.join(fixture.outputRoot, 'ast-grep'), {recursive: true});
  fs.writeFileSync(path.join(fixture.outputRoot, 'ast-grep/preserve-on-failure.txt'), 'unchanged\n');
  return snapshot(fixture.outputRoot);
}

function cleanFixture(t, fixture) {
  t.after(() => fs.rmSync(fixture.root, {recursive: true, force: true}));
}

function copyCli(fixture) {
  const script = path.join(fixture.root, 'scripts/sync-opencode.mjs');
  fs.mkdirSync(path.dirname(script), {recursive: true});
  fs.copyFileSync(SCRIPT, script);
  return script;
}

async function importEditedScript(t, edit) {
  const fixture = makeFixture();
  cleanFixture(t, fixture);
  const script = copyCli(fixture);
  const source = fs.readFileSync(script, 'utf8');
  fs.writeFileSync(script, edit(source));
  return import(`${pathToFileURL(script).href}?test=${Date.now()}-${Math.random()}`);
}

test('ownership mapping is the exact frozen Phase-1 seven', () => {
  assert.deepEqual(OPENCODE_SKILL_PROJECTIONS, PROJECTIONS);
  assert.deepEqual(OPENCODE_SKILL_PROJECTIONS.map(item => item.capabilityId), [
    'hhpe-hrg/ast-grep',
    'hhpe-hrg/registry-health',
    'hhpe-hrg/stack-router',
    'hhpe-hrg/serena-guidance',
    'hhpe-hrg/context7-guidance',
    'hhpe-hrg/playwright-guidance',
    'hhpe-hrg/session-start',
  ]);
  assert.ok(Object.isFrozen(OPENCODE_SKILL_PROJECTIONS));
  assert.ok(OPENCODE_SKILL_PROJECTIONS.every(Object.isFrozen));
  assert.throws(() => {
    OPENCODE_SKILL_PROJECTIONS[0].destination = '../escape';
  }, TypeError);
});

test('mapping rejects traversal names before use', async t => {
  await assert.rejects(
    importEditedScript(t, source => source.replace("source: 'ast-grep'", "source: '../ast-grep'")),
    /source must be a basename/,
  );
});

test('mapping rejects duplicate source and destination names', async t => {
  await assert.rejects(
    importEditedScript(t, source => source.replaceAll("source: 'registry-health'", "source: 'ast-grep'")),
    /duplicate OpenCode skill source: ast-grep/,
  );
  await assert.rejects(
    importEditedScript(t, source => source.replaceAll("destination: 'registry-health'", "destination: 'ast-grep'")),
    /duplicate OpenCode skill destination: ast-grep/,
  );
});

test('invalid source aborts before any owned destination mutation', t => {
  const fixture = makeFixture();
  cleanFixture(t, fixture);
  const before = seedOwnedOutput(fixture);
  fs.symlinkSync('SKILL.md', path.join(fixture.sources, 'session-start', 'bad-link'));
  assert.throws(() => syncOpencodeSkills(fixture), /unsupported canonical entry/);
  assert.deepEqual(snapshot(fixture.outputRoot), before);
});

test('missing late source aborts before any owned destination mutation', t => {
  const fixture = makeFixture();
  cleanFixture(t, fixture);
  const before = seedOwnedOutput(fixture);
  fs.rmSync(path.join(fixture.sources, 'session-start'), {recursive: true});
  assert.throws(() => syncOpencodeSkills(fixture), /missing canonical OpenCode skill: session-start/);
  assert.deepEqual(snapshot(fixture.outputRoot), before);
});

test('canonical skill root symlink is rejected before mutation', t => {
  const fixture = makeFixture();
  cleanFixture(t, fixture);
  const before = seedOwnedOutput(fixture);
  const source = path.join(fixture.sources, 'session-start');
  const backing = path.join(fixture.root, 'session-start-backing');
  fs.renameSync(source, backing);
  fs.symlinkSync(backing, source, 'dir');
  assert.throws(() => syncOpencodeSkills(fixture), /missing canonical OpenCode skill: session-start/);
  assert.deepEqual(snapshot(fixture.outputRoot), before);
});

test('canonical wrappers root symlink is rejected before mutation', t => {
  const fixture = makeFixture();
  cleanFixture(t, fixture);
  const before = seedOwnedOutput(fixture);
  const backing = path.join(fixture.root, 'wrappers-backing');
  fs.renameSync(fixture.sources, backing);
  fs.symlinkSync(backing, fixture.sources, 'dir');
  assert.throws(() => syncOpencodeSkills(fixture), /canonical OpenCode skills root.*symlink/);
  assert.deepEqual(snapshot(fixture.outputRoot), before);
});

test('default output rejects a symlinked repository ancestor for sync, compare, and check', t => {
  const fixture = makeFixture();
  cleanFixture(t, fixture);
  const external = path.join(fixture.root, 'external-opencode');
  fs.mkdirSync(external);
  fs.symlinkSync(external, path.join(fixture.root, '.opencode'), 'dir');
  const before = snapshot(external);

  assert.throws(() => syncOpencodeSkills({root: fixture.root}), /OpenCode output path component.*symlink/);
  assert.deepEqual(snapshot(external), before);
  const compared = compareOpencodeSkills({root: fixture.root});
  assert.equal(compared.ok, false);
  assert.ok(compared.differences.some(item => /OpenCode output path component.*symlink/.test(item)));
  const checked = checkOpencodeSkills({root: fixture.root});
  assert.equal(checked.ok, false);
  assert.ok(checked.differences.some(item => /OpenCode output path component.*symlink/.test(item)));
  assert.deepEqual(snapshot(external), before);
});

test('canonical source rejects a symlinked repository ancestor outside trusted root', t => {
  const fixture = makeFixture();
  cleanFixture(t, fixture);
  const externalRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hhpe-opencode-source-external-'));
  t.after(() => fs.rmSync(externalRoot, {recursive: true, force: true}));
  const overlays = path.join(fixture.root, 'registry/overlays');
  const externalOverlays = path.join(externalRoot, 'overlays');
  fs.renameSync(overlays, externalOverlays);
  fs.symlinkSync(externalOverlays, overlays, 'dir');
  const before = seedOwnedOutput(fixture);

  assert.throws(() => syncOpencodeSkills(fixture), /canonical source path component.*symlink/);
  assert.deepEqual(snapshot(fixture.outputRoot), before);
  const compared = compareOpencodeSkills(fixture);
  assert.equal(compared.ok, false);
  assert.ok(compared.differences.some(item => /canonical source path component.*symlink/.test(item)));
  assert.throws(() => checkOpencodeSkills({root: fixture.root}), /canonical source path component.*symlink/);
  assert.deepEqual(snapshot(fixture.outputRoot), before);
});

test('unsupported FIFO in a late source aborts before mutation when FIFOs are available', t => {
  const fixture = makeFixture();
  cleanFixture(t, fixture);
  const fifo = path.join(fixture.sources, 'session-start/bad-fifo');
  const made = spawnSync('mkfifo', [fifo]);
  if (made.error?.code === 'ENOENT') {
    t.skip('mkfifo unavailable');
    return;
  }
  assert.equal(made.status, 0, made.stderr.toString());
  const before = seedOwnedOutput(fixture);
  assert.throws(() => syncOpencodeSkills(fixture), /unsupported canonical entry/);
  assert.deepEqual(snapshot(fixture.outputRoot), before);
});

test('source and output overlap is rejected in both directions without mutation', t => {
  const fixture = makeFixture();
  cleanFixture(t, fixture);
  const sourceBefore = snapshot(fixture.sources);
  assert.throws(
    () => syncOpencodeSkills({...fixture, outputRoot: path.join(fixture.sources, 'generated')}),
    /canonical source and output roots overlap/,
  );
  assert.deepEqual(snapshot(fixture.sources), sourceBefore);
  assert.throws(
    () => syncOpencodeSkills({...fixture, outputRoot: path.dirname(fixture.sources)}),
    /canonical source and output roots overlap/,
  );
  assert.deepEqual(snapshot(fixture.sources), sourceBefore);
});

test('filesystem-root output is rejected without source mutation', t => {
  const fixture = makeFixture();
  cleanFixture(t, fixture);
  const before = snapshot(fixture.sources);
  assert.throws(
    () => syncOpencodeSkills({...fixture, outputRoot: path.parse(fixture.root).root}),
    /OpenCode skills output root cannot be a filesystem root/,
  );
  assert.deepEqual(snapshot(fixture.sources), before);
});

test('output root and owned destination symlinks are rejected before mutation', t => {
  const first = makeFixture();
  const second = makeFixture();
  cleanFixture(t, first);
  cleanFixture(t, second);

  const outputBacking = path.join(first.root, 'output-backing');
  fs.mkdirSync(path.dirname(first.outputRoot), {recursive: true});
  fs.mkdirSync(outputBacking);
  fs.symlinkSync(outputBacking, first.outputRoot, 'dir');
  assert.throws(() => syncOpencodeSkills(first), /OpenCode skills output root.*symlink/);

  fs.mkdirSync(second.outputRoot, {recursive: true});
  const destinationBacking = path.join(second.outputRoot, 'destination-backing');
  fs.mkdirSync(destinationBacking);
  fs.symlinkSync(destinationBacking, path.join(second.outputRoot, 'session-start'), 'dir');
  const before = snapshot(second.outputRoot);
  assert.throws(() => syncOpencodeSkills(second), /unsupported OpenCode output entry/);
  assert.deepEqual(snapshot(second.outputRoot), before);
});

test('sync rejects every raw output-root symlink spelling without touching its target', t => {
  const fixture = makeFixture();
  cleanFixture(t, fixture);
  const external = path.join(fixture.root, 'external-output');
  fs.mkdirSync(path.join(external, 'ast-grep'), {recursive: true});
  fs.writeFileSync(path.join(external, 'ast-grep/external.txt'), 'external\n');
  const before = snapshot(external);
  for (const [name, suffix] of [['plain', ''], ['slash', path.sep], ['dot', `${path.sep}.`]]) {
    const link = path.join(fixture.root, `output-${name}`);
    fs.symlinkSync(external, link, 'dir');
    assert.throws(
      () => syncOpencodeSkills({...fixture, outputRoot: `${link}${suffix}`}),
      /OpenCode skills output root.*symlink/,
    );
    assert.deepEqual(snapshot(external), before);
  }
});

test('comparison rejects every raw output-root symlink spelling without touching its target', t => {
  const fixture = makeFixture();
  cleanFixture(t, fixture);
  const external = path.join(fixture.root, 'external-comparison');
  syncOpencodeSkills({...fixture, outputRoot: external});
  const before = snapshot(external);
  for (const [name, suffix] of [['plain', ''], ['slash', path.sep], ['dot', `${path.sep}.`]]) {
    const link = path.join(fixture.root, `comparison-${name}`);
    fs.symlinkSync(external, link, 'dir');
    const result = compareOpencodeSkills({...fixture, outputRoot: `${link}${suffix}`});
    assert.equal(result.ok, false);
    assert.ok(result.differences.some(item => /generated OpenCode skills root is a symlink/.test(item)));
    assert.deepEqual(snapshot(external), before);
  }
});

test('generation uses the complete preflight snapshot after a canonical source swap', t => {
  const fixture = makeFixture();
  cleanFixture(t, fixture);
  const source = path.join(fixture.sources, 'session-start/SKILL.md');
  const originalMkdir = fs.mkdirSync;
  let swapped = false;
  fs.mkdirSync = function (...args) {
    if (!swapped) {
      swapped = true;
      fs.writeFileSync(source, 'changed after preflight\n');
    }
    return originalMkdir.apply(this, args);
  };
  try {
    syncOpencodeSkills(fixture);
  } finally {
    fs.mkdirSync = originalMkdir;
  }
  assert.equal(fs.readFileSync(source, 'utf8'), 'changed after preflight\n');
  assert.equal(fs.readFileSync(path.join(fixture.outputRoot, 'session-start/SKILL.md'), 'utf8'), 'session-start\n');
});

test('staging failure leaves all owned and neighboring output unchanged', t => {
  const fixture = makeFixture();
  cleanFixture(t, fixture);
  fs.mkdirSync(path.join(fixture.outputRoot, 'ast-grep'), {recursive: true});
  fs.writeFileSync(path.join(fixture.outputRoot, 'ast-grep/old.txt'), 'old\n');
  fs.mkdirSync(path.join(fixture.outputRoot, 'neighbor'), {recursive: true});
  fs.writeFileSync(path.join(fixture.outputRoot, 'neighbor/keep.txt'), 'keep\n');
  const before = snapshot(fixture.outputRoot);
  const originalChmod = fs.chmodSync;
  let calls = 0;
  fs.chmodSync = function (...args) {
    if (++calls === 2) throw new Error('injected staging failure');
    return originalChmod.apply(this, args);
  };
  try {
    assert.throws(() => syncOpencodeSkills(fixture), /injected staging failure/);
  } finally {
    fs.chmodSync = originalChmod;
  }
  assert.deepEqual(snapshot(fixture.outputRoot), before);
});

test('output-root swap during staging is rejected without touching external target or neighbor', t => {
  const fixture = makeFixture();
  cleanFixture(t, fixture);
  fs.mkdirSync(path.join(fixture.outputRoot, 'neighbor'), {recursive: true});
  fs.writeFileSync(path.join(fixture.outputRoot, 'neighbor/keep.txt'), 'keep\n');
  const movedOutput = path.join(fixture.root, 'moved-output');
  const neighborBefore = snapshot(fixture.outputRoot);
  const external = path.join(fixture.root, 'external-swap-target');
  fs.mkdirSync(path.join(external, 'ast-grep'), {recursive: true});
  fs.writeFileSync(path.join(external, 'ast-grep/external.txt'), 'external\n');
  const externalBefore = snapshot(external);
  const originalMkdir = fs.mkdirSync;
  let swapped = false;
  fs.mkdirSync = function (target, ...args) {
    if (!swapped) {
      swapped = true;
      fs.renameSync(fixture.outputRoot, movedOutput);
      fs.symlinkSync(external, fixture.outputRoot, 'dir');
    }
    return originalMkdir.call(this, target, ...args);
  };
  try {
    assert.throws(() => syncOpencodeSkills(fixture), /OpenCode skills output root.*symlink|changed during generation/);
  } finally {
    fs.mkdirSync = originalMkdir;
  }
  assert.deepEqual(snapshot(external), externalBefore);
  assert.deepEqual(snapshot(movedOutput), neighborBefore);
});

test('ordinary output-root replacement during staging is rejected', t => {
  const fixture = makeFixture();
  cleanFixture(t, fixture);
  fs.mkdirSync(path.join(fixture.outputRoot, 'neighbor'), {recursive: true});
  fs.writeFileSync(path.join(fixture.outputRoot, 'neighbor/keep.txt'), 'keep\n');
  const movedOutput = path.join(fixture.root, 'moved-ordinary-output');
  const originalBefore = snapshot(fixture.outputRoot);
  const originalMkdir = fs.mkdirSync;
  let swapped = false;
  fs.mkdirSync = function (target, ...args) {
    if (!swapped) {
      swapped = true;
      fs.renameSync(fixture.outputRoot, movedOutput);
      originalMkdir.call(this, fixture.outputRoot, {recursive: true});
      fs.writeFileSync(path.join(fixture.outputRoot, 'replacement.txt'), 'replacement\n');
    }
    return originalMkdir.call(this, target, ...args);
  };
  const replacementBefore = () => snapshot(fixture.outputRoot);
  try {
    assert.throws(() => syncOpencodeSkills(fixture), /output root changed during generation/);
  } finally {
    fs.mkdirSync = originalMkdir;
  }
  assert.deepEqual(snapshot(movedOutput), originalBefore);
  assert.deepEqual(replacementBefore(), [
    {path: 'replacement.txt', type: 'file', bytes: Buffer.from('replacement\n').toString('hex'), mode: 0o644},
  ]);
});

test('ordinary owned destination replacement during staging is rejected', t => {
  const fixture = makeFixture();
  cleanFixture(t, fixture);
  const destination = path.join(fixture.outputRoot, 'ast-grep');
  fs.mkdirSync(destination, {recursive: true});
  fs.writeFileSync(path.join(destination, 'old.txt'), 'old\n');
  const movedDestination = path.join(fixture.root, 'moved-owned-destination');
  const originalMkdir = fs.mkdirSync;
  let swapped = false;
  fs.mkdirSync = function (target, ...args) {
    if (!swapped) {
      swapped = true;
      fs.renameSync(destination, movedDestination);
      originalMkdir.call(this, destination, {recursive: true});
      fs.writeFileSync(path.join(destination, 'replacement.txt'), 'replacement\n');
    }
    return originalMkdir.call(this, target, ...args);
  };
  try {
    assert.throws(() => syncOpencodeSkills(fixture), /OpenCode skill destination changed during generation: ast-grep/);
  } finally {
    fs.mkdirSync = originalMkdir;
  }
  assert.equal(fs.readFileSync(path.join(movedDestination, 'old.txt'), 'utf8'), 'old\n');
  assert.equal(fs.readFileSync(path.join(destination, 'replacement.txt'), 'utf8'), 'replacement\n');
});

test('injected EXDEV during installation rolls back every owned tree and preserves neighbor', t => {
  const fixture = makeFixture();
  cleanFixture(t, fixture);
  for (const {destination} of PROJECTIONS) {
    fs.mkdirSync(path.join(fixture.outputRoot, destination), {recursive: true});
    fs.writeFileSync(path.join(fixture.outputRoot, destination, 'old.txt'), `${destination} old\n`);
  }
  fs.mkdirSync(path.join(fixture.outputRoot, 'neighbor'), {recursive: true});
  fs.writeFileSync(path.join(fixture.outputRoot, 'neighbor/keep.txt'), 'keep\n');
  const before = snapshot(fixture.outputRoot);
  const originalRename = fs.renameSync;
  let injected = false;
  fs.renameSync = function (source, destination) {
    if (
      !injected &&
      source.includes('.hhpe-opencode-stage-') &&
      !source.includes(`${path.sep}backups${path.sep}`) &&
      destination === path.join(fixture.outputRoot, 'stack-router')
    ) {
      injected = true;
      const error = new Error('injected cross-device rename');
      error.code = 'EXDEV';
      throw error;
    }
    return originalRename.call(this, source, destination);
  };
  try {
    assert.throws(() => syncOpencodeSkills(fixture), error => error.code === 'EXDEV');
  } finally {
    fs.renameSync = originalRename;
  }
  assert.equal(injected, true);
  assert.deepEqual(snapshot(fixture.outputRoot), before);
});

test('staged-child symlink swap is rejected before old output removal', t => {
  const fixture = makeFixture();
  cleanFixture(t, fixture);
  for (const {destination} of PROJECTIONS) {
    fs.mkdirSync(path.join(fixture.outputRoot, destination), {recursive: true});
    fs.writeFileSync(path.join(fixture.outputRoot, destination, 'old.txt'), `${destination} old\n`);
  }
  fs.mkdirSync(path.join(fixture.outputRoot, 'neighbor'), {recursive: true});
  fs.writeFileSync(path.join(fixture.outputRoot, 'neighbor/keep.txt'), 'keep\n');
  const outputBefore = snapshot(fixture.outputRoot);
  const external = path.join(fixture.root, 'external-staged-target');
  fs.mkdirSync(external);
  fs.writeFileSync(path.join(external, 'external.txt'), 'external\n');
  const externalBefore = snapshot(external);
  const originalLstat = fs.lstatSync;
  let swapped = false;
  fs.lstatSync = function (target, ...args) {
    if (!swapped && target === fixture.outputRoot) {
      const parents = [fixture.outputRoot, path.dirname(fixture.outputRoot)];
      const stagingRoot = parents
        .flatMap(parent => fs.existsSync(parent) ? fs.readdirSync(parent).map(name => path.join(parent, name)) : [])
        .find(candidate => path.basename(candidate).startsWith('.hhpe-opencode-stage-'));
      const stagedChild = stagingRoot && path.join(stagingRoot, 'ast-grep');
      if (stagedChild && fs.existsSync(stagedChild)) {
        swapped = true;
        fs.rmSync(stagedChild, {recursive: true});
        fs.symlinkSync(external, stagedChild, 'dir');
      }
    }
    return originalLstat.call(this, target, ...args);
  };
  try {
    assert.throws(() => syncOpencodeSkills(fixture), /staged OpenCode skill.*ast-grep/);
  } finally {
    fs.lstatSync = originalLstat;
  }
  assert.equal(swapped, true);
  assert.deepEqual(snapshot(fixture.outputRoot), outputBefore);
  assert.deepEqual(snapshot(external), externalBefore);
  assert.equal(
    fs.readdirSync(fixture.outputRoot).some(name => name.startsWith('.hhpe-opencode-stage-')),
    false,
  );
});

test('sync recursively copies only mapped skills with normalized deterministic modes', t => {
  const fixture = makeFixture();
  cleanFixture(t, fixture);
  const result = syncOpencodeSkills(fixture);
  assert.deepEqual(result, {
    capabilities: PROJECTIONS.map(item => item.capabilityId),
    destinations: PROJECTIONS.map(item => item.destination),
  });
  assert.deepEqual(fs.readdirSync(fixture.outputRoot).sort(), PROJECTIONS.map(item => item.destination).sort());
  assert.equal(fs.existsSync(path.join(fixture.outputRoot, 'unselected-eighth')), false);
  assert.equal(
    fs.readFileSync(path.join(fixture.outputRoot, 'ast-grep/references/rule_reference.md'), 'utf8'),
    'recursive support\n',
  );
  assert.equal(fs.statSync(path.join(fixture.outputRoot, 'ast-grep')).mode & 0o777, 0o755);
  assert.equal(fs.statSync(path.join(fixture.outputRoot, 'ast-grep/references')).mode & 0o777, 0o755);
  assert.equal(fs.statSync(path.join(fixture.outputRoot, 'ast-grep/SKILL.md')).mode & 0o777, 0o644);
  assert.equal(fs.statSync(path.join(fixture.outputRoot, 'session-start/scripts/start.sh')).mode & 0o777, 0o755);
});

test('reconciliation removes stale owned content and preserves neighboring output', t => {
  const fixture = makeFixture();
  cleanFixture(t, fixture);
  fs.mkdirSync(path.join(fixture.outputRoot, 'ast-grep'), {recursive: true});
  fs.writeFileSync(path.join(fixture.outputRoot, 'ast-grep/stale.txt'), 'stale\n');
  fs.mkdirSync(path.join(fixture.outputRoot, 'neighbor-skill'), {recursive: true});
  fs.writeFileSync(path.join(fixture.outputRoot, 'neighbor-skill/keep.txt'), 'keep\n');
  syncOpencodeSkills(fixture);
  assert.equal(fs.existsSync(path.join(fixture.outputRoot, 'ast-grep/stale.txt')), false);
  assert.equal(fs.readFileSync(path.join(fixture.outputRoot, 'neighbor-skill/keep.txt'), 'utf8'), 'keep\n');
});

test('sync replaces stale file and directory representations', t => {
  const fixture = makeFixture();
  cleanFixture(t, fixture);
  fs.mkdirSync(fixture.outputRoot, {recursive: true});
  fs.writeFileSync(path.join(fixture.outputRoot, 'ast-grep'), 'wrong root type\n');
  fs.mkdirSync(path.join(fixture.outputRoot, 'session-start/SKILL.md'), {recursive: true});
  syncOpencodeSkills(fixture);
  assert.ok(fs.statSync(path.join(fixture.outputRoot, 'ast-grep')).isDirectory());
  assert.ok(fs.statSync(path.join(fixture.outputRoot, 'session-start/SKILL.md')).isFile());
});

test('sync is idempotent', t => {
  const fixture = makeFixture();
  cleanFixture(t, fixture);
  syncOpencodeSkills(fixture);
  const first = snapshot(fixture.outputRoot);
  syncOpencodeSkills(fixture);
  assert.deepEqual(snapshot(fixture.outputRoot), first);
});

test('comparison detects path, bytes, representation, and executable-bit drift', t => {
  const fixture = makeFixture();
  cleanFixture(t, fixture);
  syncOpencodeSkills(fixture);
  fs.writeFileSync(path.join(fixture.outputRoot, 'ast-grep/unexpected.txt'), 'extra\n');
  fs.appendFileSync(path.join(fixture.outputRoot, 'registry-health/SKILL.md'), 'drift\n');
  fs.rmSync(path.join(fixture.outputRoot, 'stack-router/SKILL.md'));
  fs.mkdirSync(path.join(fixture.outputRoot, 'stack-router/SKILL.md'));
  fs.chmodSync(path.join(fixture.outputRoot, 'serena-guidance/SKILL.md'), 0o755);
  const result = compareOpencodeSkills(fixture);
  assert.equal(result.ok, false);
  assert.ok(result.differences.some(item => /ast-grep\/unexpected.txt.*unexpected/.test(item)));
  assert.ok(result.differences.some(item => /registry-health\/SKILL.md.*content differs/.test(item)));
  assert.ok(result.differences.some(item => /stack-router\/SKILL.md.*expected file, found directory/.test(item)));
  assert.ok(result.differences.some(item => /serena-guidance\/SKILL.md.*executable bit differs/.test(item)));
});

test('comparison rejects a byte-equivalent symlink', t => {
  const fixture = makeFixture();
  cleanFixture(t, fixture);
  syncOpencodeSkills(fixture);
  const skill = path.join(fixture.outputRoot, 'ast-grep/SKILL.md');
  const backing = path.join(fixture.outputRoot, 'ast-grep/SKILL.real');
  fs.renameSync(skill, backing);
  fs.symlinkSync('SKILL.real', skill);
  const result = compareOpencodeSkills(fixture);
  assert.equal(result.ok, false);
  assert.ok(result.differences.some(item => /ast-grep\/SKILL.md.*symlink/.test(item)));
});

test('comparison ignores irrelevant permission noise', t => {
  const fixture = makeFixture();
  cleanFixture(t, fixture);
  syncOpencodeSkills(fixture);
  fs.chmodSync(path.join(fixture.outputRoot, 'ast-grep'), 0o700);
  fs.chmodSync(path.join(fixture.outputRoot, 'ast-grep/SKILL.md'), 0o600);
  assert.deepEqual(compareOpencodeSkills(fixture), {ok: true, differences: []});
});

test('isolated check detects drift without rewriting checked-in output', t => {
  const fixture = makeFixture();
  cleanFixture(t, fixture);
  const checkedIn = path.join(fixture.root, '.opencode/skills');
  syncOpencodeSkills({...fixture, outputRoot: checkedIn});
  assert.deepEqual(checkOpencodeSkills({root: fixture.root}), {ok: true, differences: []});

  fs.appendFileSync(path.join(checkedIn, 'session-start/SKILL.md'), 'checked-in drift\n');
  const before = snapshot(path.join(fixture.root, '.opencode'));
  const result = checkOpencodeSkills({root: fixture.root});
  assert.equal(result.ok, false);
  assert.ok(result.differences.some(item => /session-start\/SKILL.md.*content differs/.test(item)));
  assert.deepEqual(snapshot(path.join(fixture.root, '.opencode')), before);
});

test('CLI generate and check modes produce deterministic summaries', t => {
  const fixture = makeFixture();
  cleanFixture(t, fixture);
  const script = copyCli(fixture);
  const generated = spawnSync(process.execPath, [script, 'generate'], {encoding: 'utf8'});
  assert.equal(generated.status, 0, generated.stderr);
  assert.equal(generated.stdout, 'generated 7 project-local OpenCode skills\n');
  const checked = spawnSync(process.execPath, [script, 'check'], {encoding: 'utf8'});
  assert.equal(checked.status, 0, checked.stderr);
  assert.equal(checked.stdout, 'checked-in project-local OpenCode skills match isolated generation\n');
});

test('CLI check reports drift without rewriting checked-in output', t => {
  const fixture = makeFixture();
  cleanFixture(t, fixture);
  const script = copyCli(fixture);
  assert.equal(spawnSync(process.execPath, [script, 'generate']).status, 0);
  const checkedIn = path.join(fixture.root, '.opencode/skills/session-start/SKILL.md');
  fs.appendFileSync(checkedIn, 'drift\n');
  const before = fs.readFileSync(checkedIn, 'utf8');
  const checked = spawnSync(process.execPath, [script, 'check'], {encoding: 'utf8'});
  assert.equal(checked.status, 1);
  assert.match(checked.stderr, /session-start\/SKILL.md: content differs/);
  assert.equal(fs.readFileSync(checkedIn, 'utf8'), before);
});

test('CLI rejects unknown modes with usage and exit 2', t => {
  const fixture = makeFixture();
  cleanFixture(t, fixture);
  const script = copyCli(fixture);
  const result = spawnSync(process.execPath, [script, 'unknown'], {encoding: 'utf8'});
  assert.equal(result.status, 2);
  assert.equal(result.stderr, 'usage: sync-opencode.mjs [generate|check]\n');
  assert.equal(fs.existsSync(path.join(fixture.root, '.opencode/skills')), false);
});

test('CLI rejects bare invocation without generating output', t => {
  const fixture = makeFixture();
  cleanFixture(t, fixture);
  const script = copyCli(fixture);
  const result = spawnSync(process.execPath, [script], {encoding: 'utf8'});
  assert.equal(result.status, 2);
  assert.equal(result.stderr, 'usage: sync-opencode.mjs [generate|check]\n');
  assert.equal(fs.existsSync(path.join(fixture.root, '.opencode/skills')), false);
});

test('CLI rejects extra arguments without generating output', t => {
  const fixture = makeFixture();
  cleanFixture(t, fixture);
  const script = copyCli(fixture);
  const result = spawnSync(process.execPath, [script, 'generate', 'extra'], {encoding: 'utf8'});
  assert.equal(result.status, 2);
  assert.equal(result.stderr, 'usage: sync-opencode.mjs [generate|check]\n');
  assert.equal(fs.existsSync(path.join(fixture.root, '.opencode/skills')), false);
});
