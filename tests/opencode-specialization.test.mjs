import assert from 'node:assert/strict';
import childProcess, {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import {syncBuiltinESMExports} from 'node:module';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {
  APPROVED_OPENCODE_ONLY_POLICY,
  readOpencodeOnlyFiles,
  validateOpencodeOnly,
} from '../lib/opencode-specialization.mjs';
import {checkOpencodeSkills, syncOpencodeSkills} from '../scripts/sync-opencode.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('project configuration selects only OpenAI and Cursor and pins classic Cursor provider', () => {
  const files = readOpencodeOnlyFiles({root: ROOT});
  assert.deepEqual(files.projectConfig.enabled_providers, ['openai', 'cursor']);
  assert.deepEqual(files.projectConfig.plugin, ['cursor-opencode-provider@0.6.3']);
  assert.equal(validateOpencodeOnly({...files, root: ROOT}).ok, true);
});

test('project configuration contains no credential, model catalog, local path, or OpenCode 2 entrypoint', () => {
  const text = fs.readFileSync(path.join(ROOT, 'opencode.json'), 'utf8');
  assert.doesNotMatch(text, /OPENAI_API_KEY|api[_-]?key|auth\.json|opencode2|node_modules|(?:^|["'])\/(?:Users|home|tmp)\//i);
  assert.equal(Object.hasOwn(JSON.parse(text), 'model'), false);
});

test('project configuration rejects non-canonical bindings and unsafe nested values', () => {
  const {specialization, projectConfig, agents} = readOpencodeOnlyFiles({root: ROOT});
  for (const mutate of [
    value => { value.enabled_providers = ['openai']; },
    value => { value.plugin = ['cursor-opencode-provider@latest']; },
    value => { value.instructions = ['/tmp/AGENTS.md']; },
    value => { value.model = 'openai/gpt-5'; },
    value => { value.extra = {credentials: 'browser'}; },
    value => { value.extra = {env: 'OPENAI_API_KEY'}; },
    value => { value.extra = {plugin_path: './plugin.mjs'}; },
    value => { value.extra = {source: 'https://github.com/example/provider#main'}; },
    value => { value.extra = {entrypoint: 'opencode2'}; },
  ]) {
    const value = structuredClone(projectConfig);
    mutate(value);
    assert.equal(validateOpencodeOnly({root: ROOT, specialization, projectConfig: value, agents}).ok, false);
  }
});

test('provider policy fails closed on every unapproved realization', () => {
  const files = readOpencodeOnlyFiles({root: ROOT});
  const cases = [
    ['OpenAI API key', value => { value.projectConfig.provider = {openai: {apiKey: '{env:OPENAI_API_KEY}'}}; }, 'opencode.json provider.openai.apiKey'],
    ['extra provider', value => { value.projectConfig.enabled_providers.push('anthropic'); }, 'opencode.json enabled_providers'],
    ['floating Cursor package', value => { value.projectConfig.plugin = ['cursor-opencode-provider@latest']; }, 'opencode.json plugin[0]'],
    ['Git Cursor package', value => { value.projectConfig.plugin = ['github:oakimov/cursor-opencode-provider#main']; }, 'opencode.json plugin[0]'],
    ['local Cursor package', value => { value.projectConfig.plugin = ['/tmp/cursor-opencode-provider']; }, 'opencode.json plugin[0]'],
    ['OpenCode 2 entrypoint', value => { value.projectConfig.plugin = ['cursor-opencode-provider/plugin/opencode2']; }, 'opencode.json plugin[0]'],
    ['Cursor API key auth', value => { value.specialization.provider_bindings[1].auth_realization = 'api-key'; }, 'specialization.provider_bindings[1].auth_realization'],
    ['wrong package version', value => { value.specialization.provider_bindings[1].package.version = '0.6.4'; }, 'specialization.provider_bindings[1].package.version'],
    ['wrong upstream commit', value => { value.specialization.provider_bindings[1].package.upstream_commit = 'deadbeef'; }, 'specialization.provider_bindings[1].package.upstream_commit'],
    ['wrong npm integrity', value => { value.specialization.provider_bindings[1].package.npm_integrity = 'sha512-wrong'; }, 'specialization.provider_bindings[1].package.npm_integrity'],
    ['nested model catalog', value => { value.projectConfig.metadata = {runtime: {models: ['cursor/model']}}; }, 'opencode.json metadata.runtime.models'],
  ];
  for (const [name, mutate, errorPath] of cases) {
    const value = structuredClone({specialization: files.specialization, projectConfig: files.projectConfig});
    mutate(value);
    const result = validateOpencodeOnly({...files, ...value, root: ROOT});
    assert.equal(result.ok, false, name);
    assert.ok(result.errors.some(error => error.includes(errorPath)), `${name}: ${result.errors.join('; ')}`);
  }
});

test('accepted provider schema contains and accepts no account or model data', () => {
  const files = readOpencodeOnlyFiles({root: ROOT});
  const keys = value => value && typeof value === 'object'
    ? Object.entries(value).flatMap(([key, child]) => [key, ...keys(child)])
    : [];
  assert.deepEqual(
    keys({specialization: files.specialization, projectConfig: files.projectConfig})
      .filter(key => /^(?:accounts?|models?)$/i.test(key)),
    [],
  );

  for (const [name, metadata] of [
    ['account', {account: {id: 'personal'}}],
    ['model', {catalog: {model: 'cursor/model'}}],
  ]) {
    const projectConfig = structuredClone(files.projectConfig);
    projectConfig.metadata = metadata;
    const result = validateOpencodeOnly({...files, projectConfig, root: ROOT});
    assert.equal(result.ok, false, name);
    assert.ok(result.errors.some(error => error.includes(`opencode.json metadata.${name === 'account' ? 'account' : 'catalog.model'}`)));
  }
});

test('static provider validation performs no subprocess, fetch, or sensitive state access', async () => {
  const originalSpawnSync = childProcess.spawnSync;
  const originalFetch = globalThis.fetch;
  const originalReadFileSync = fs.readFileSync;
  const calls = {spawnSync: [], fetch: [], sensitiveReads: []};
  const sensitivePath = /(?:^|[\\/])(?:auth\.json|credentials?(?:\.json)?|accounts?(?:\.json)?|models?(?:\.json)?|hosts\.yaml|node_modules|\.cache|opencode[^\\/]*cache)(?:$|[\\/])/i;

  childProcess.spawnSync = (...args) => {
    calls.spawnSync.push(args);
    throw new Error(`forbidden subprocess: ${String(args[0])}`);
  };
  globalThis.fetch = async (...args) => {
    calls.fetch.push(args);
    throw new Error(`forbidden fetch: ${String(args[0])}`);
  };
  fs.readFileSync = function(file, ...args) {
    const value = String(file);
    if (sensitivePath.test(value)) {
      calls.sensitiveReads.push(value);
      throw new Error(`forbidden sensitive read: ${value}`);
    }
    const body = originalReadFileSync.call(this, file, ...args);
    if (path.basename(value) !== 'packages.lock.yaml') return body;
    const manifest = JSON.parse(String(body));
    for (const pkg of manifest.packages) pkg.revision = {type: 'overlay'};
    return args[0] ? JSON.stringify(manifest) : Buffer.from(JSON.stringify(manifest));
  };
  syncBuiltinESMExports();

  try {
    const nonce = `${Date.now()}-${Math.random()}`;
    const [{validate}, {staticIntegrity}] = await Promise.all([
      import(`../lib/registry.mjs?static-provider-policy=${nonce}`),
      import(`../lib/skills-ci.mjs?static-provider-policy=${nonce}`),
    ]);
    assert.equal(validateOpencodeOnly({root: ROOT}).ok, true);
    assert.equal(validate().status, 'passed');
    assert.equal(staticIntegrity().status, 'PASS');
    assert.deepEqual(calls, {spawnSync: [], fetch: [], sensitiveReads: []});
  } finally {
    childProcess.spawnSync = originalSpawnSync;
    globalThis.fetch = originalFetch;
    fs.readFileSync = originalReadFileSync;
    syncBuiltinESMExports();
  }
});

test('validate:opencode invokes static policy CLI', () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  assert.equal(packageJson.scripts['validate:opencode'], 'node lib/opencode-specialization.mjs');
  const result = spawnSync(process.execPath, ['lib/opencode-specialization.mjs'], {cwd: ROOT, encoding: 'utf8'});
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {ok: true, errors: []});
});

test('specialization manifest is exact executable opencode_only authority', () => {
  const {specialization} = readOpencodeOnlyFiles({root: ROOT});
  assert.deepEqual(specialization, APPROVED_OPENCODE_ONLY_POLICY);
  assert.deepEqual(validateOpencodeOnly({root: ROOT, specialization}).errors, []);
});

test('specialization rejects contradictory runtime, target, range, and bypass selection', () => {
  for (const mutate of [
    value => { value.schema_version = 2; },
    value => { value.specialization_id = 'general'; },
    value => { value.agent_runtime = 'cursor'; },
    value => { value.personalization_target = 'codex'; },
    value => { value.opencode_runtime.minimum = '1.18.18'; },
    value => { value.opencode_runtime.maximum_exclusive = '3.0.0'; },
    value => { value.provider_bindings[0].auth_realization = 'api-key'; },
    value => { value.provider_bindings[1].package.version = '0.6.4'; },
    value => { value.personalization_paths_bypassed = ['codex-direct', 'cursor-direct']; },
  ]) {
    const value = structuredClone(APPROVED_OPENCODE_ONLY_POLICY);
    mutate(value);
    assert.equal(validateOpencodeOnly({specialization: value}).ok, false);
  }
});

test('specialization comparison ignores object insertion order but rejects extra undefined data', () => {
  const reordered = Object.fromEntries(Object.entries(APPROVED_OPENCODE_ONLY_POLICY).reverse());
  assert.equal(validateOpencodeOnly({specialization: reordered}).ok, true);

  const withExtraUndefined = structuredClone(APPROVED_OPENCODE_ONLY_POLICY);
  withExtraUndefined.unapproved = undefined;
  assert.equal(validateOpencodeOnly({specialization: withExtraUndefined}).ok, false);
});

test('approved policy is deeply frozen', () => {
  assert.equal(Object.isFrozen(APPROVED_OPENCODE_ONLY_POLICY), true);
  assert.equal(Object.isFrozen(APPROVED_OPENCODE_ONLY_POLICY.opencode_runtime), true);
  assert.equal(Object.isFrozen(APPROVED_OPENCODE_ONLY_POLICY.provider_bindings), true);
  assert.equal(Object.isFrozen(APPROVED_OPENCODE_ONLY_POLICY.provider_bindings[1].package), true);
});

test('reader rejects symlinked specialization, configuration, agent directory, and agent file', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'opencode-specialization-'));
  const sentinel = path.join(tmp, 'sentinel.json');
  fs.writeFileSync(sentinel, '{"outside":true}');
  const forbiddenReads = [];
  const original = fs.readFileSync;
  fs.readFileSync = function(file, ...args) {
    if (path.resolve(String(file)) === sentinel) forbiddenReads.push(file);
    return original.call(this, file, ...args);
  };
  try {
    for (const target of [
      ['registry/manifests/specialization.yaml'],
      ['opencode.json'],
      ['.opencode/agents'],
      ['.opencode/agents/operator.md'],
    ]) {
      const root = fs.mkdtempSync(path.join(tmp, 'root-'));
      fs.mkdirSync(path.join(root, 'registry/manifests'), {recursive: true});
      fs.writeFileSync(path.join(root, 'registry/manifests/specialization.yaml'), JSON.stringify(APPROVED_OPENCODE_ONLY_POLICY));
      fs.mkdirSync(path.join(root, '.opencode/agents'), {recursive: true});
      const link = path.join(root, ...target[0].split('/'));
      fs.rmSync(link, {recursive: true, force: true});
      fs.symlinkSync(sentinel, link);
      assert.throws(() => readOpencodeOnlyFiles({root}), /path escapes repository root/);
    }
    assert.deepEqual(forbiddenReads, []);
  } finally {
    fs.readFileSync = original;
    fs.rmSync(tmp, {recursive: true, force: true});
  }
});

test('reader retains exact agent filenames as map keys', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'opencode-specialization-'));
  try {
    fs.mkdirSync(path.join(tmp, 'registry/manifests'), {recursive: true});
    fs.mkdirSync(path.join(tmp, '.opencode/agents'), {recursive: true});
    fs.writeFileSync(path.join(tmp, 'registry/manifests/specialization.yaml'), JSON.stringify(APPROVED_OPENCODE_ONLY_POLICY));
    fs.writeFileSync(path.join(tmp, '.opencode/agents/operator.md'), 'operator');
    fs.writeFileSync(path.join(tmp, '.opencode/agents/worker.md'), 'worker');
    assert.deepEqual([...readOpencodeOnlyFiles({root: tmp}).agents.keys()].sort(), ['operator.md', 'worker.md']);
  } finally {
    fs.rmSync(tmp, {recursive: true, force: true});
  }
});

test('native agent source is the closed operator and worker set', () => {
  const files = readOpencodeOnlyFiles({root: ROOT});
  assert.deepEqual([...files.agents.keys()].sort(), ['operator.md', 'worker.md']);
  assert.equal(files.agents.get('operator.md').frontmatter.mode, 'primary');
  assert.equal(files.agents.get('worker.md').frontmatter.mode, 'subagent');
  assert.equal('model' in files.agents.get('operator.md').frontmatter, false);
  assert.equal('model' in files.agents.get('worker.md').frontmatter, false);
  assert.equal(validateOpencodeOnly({...files, root: ROOT}).ok, true);
});

test('worker cannot delegate and agent source rejects host-bound or secret values', () => {
  const files = readOpencodeOnlyFiles({root: ROOT});
  assert.equal(files.agents.get('worker.md').frontmatter.permission.task, 'deny');
  const agents = new Map(files.agents);
  agents.set('extra.md', {frontmatter: {description: 'extra', mode: 'all'}, body: '/Users/example/auth.json'});
  assert.equal(validateOpencodeOnly({...files, agents, root: ROOT}).ok, false);
});

test('agent validation rejects non-native frontmatter and unsafe agent text', () => {
  const files = readOpencodeOnlyFiles({root: ROOT});
  for (const mutate of [
    agents => { agents.get('operator.md').frontmatter.description = ''; },
    agents => { agents.get('operator.md').frontmatter.mode = 'subagent'; },
    agents => { agents.get('worker.md').frontmatter.permission.task = 'allow'; },
    agents => { agents.get('worker.md').frontmatter.permission.edit = 'prompt'; },
    agents => { agents.get('worker.md').frontmatter.model = 'openai/gpt-5'; },
    agents => { agents.get('operator.md').frontmatter.description = '/Users/example/operator'; },
    agents => { agents.get('operator.md').body = 'Use /Users/example/.config/opencode.'; },
    agents => { agents.get('operator.md').body = 'Use `/Users/example/.config/opencode`.'; },
    agents => { agents.get('operator.md').body = 'Read [configuration](/Users/example/.config/opencode).'; },
    agents => { agents.get('operator.md').body = 'Use "/Users/example/.config/opencode".'; },
    agents => { agents.get('operator.md').body = 'Use "C:\\Users\\example\\opencode".'; },
    agents => { agents.get('operator.md').body = 'Set ROOT=/Users/example/project.'; },
    agents => { agents.get('operator.md').body = 'Use </Users/example/project> or [/Users/example/project].'; },
    agents => { agents.get('operator.md').body = 'Use \\\\server\\share.'; },
    agents => { agents.get('operator.md').body = 'Set OPENAI_API_KEY before work.'; },
  ]) {
    const agents = structuredClone(files.agents);
    mutate(agents);
    assert.equal(validateOpencodeOnly({...files, agents, root: ROOT}).ok, false);
  }
});

test('agent text permits web URLs but rejects duplicate nested permission keys', () => {
  const files = readOpencodeOnlyFiles({root: ROOT});
  const agents = structuredClone(files.agents);
  agents.get('operator.md').body = 'Read https://example.com/operator-guide.';
  assert.equal(validateOpencodeOnly({...files, agents, root: ROOT}).ok, true);

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'opencode-specialization-'));
  try {
    fs.mkdirSync(path.join(tmp, '.opencode/agents'), {recursive: true});
    fs.writeFileSync(path.join(tmp, '.opencode/agents/operator.md'), `---
description: operator
mode: primary
permission:
  edit: allow
  edit: deny
---
body
`);
    assert.equal(readOpencodeOnlyFiles({root: tmp}).agents.get('operator.md').frontmatter, null);
  } finally {
    fs.rmSync(tmp, {recursive: true, force: true});
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

test('specialization generation does not inspect or mutate provider home skill roots', t => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'opencode-only-home-'));
  t.after(() => fs.rmSync(home, {recursive: true, force: true}));
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'opencode-only-repository-'));
  t.after(() => fs.rmSync(fixtureRoot, {recursive: true, force: true}));
  const originalEnvironment = {HOME: process.env.HOME, XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME};
  t.after(() => {
    for (const [name, value] of Object.entries(originalEnvironment)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });
  process.env.HOME = home;
  process.env.XDG_CONFIG_HOME = path.join(home, 'xdg-config');
  assert.equal(process.env.HOME, home);
  assert.equal(process.env.XDG_CONFIG_HOME, path.join(home, 'xdg-config'));

  const providerRoots = [
    path.join(home, '.cursor/skills'),
    path.join(home, '.agents/skills'),
    path.join(home, '.config/opencode/skills'),
    path.join(process.env.XDG_CONFIG_HOME, 'opencode/skills'),
  ];
  assert.deepEqual(providerRoots, [
    path.join(home, '.cursor/skills'),
    path.join(home, '.agents/skills'),
    path.join(home, '.config/opencode/skills'),
    path.join(process.env.XDG_CONFIG_HOME, 'opencode/skills'),
  ]);
  for (const root of providerRoots) {
    fs.mkdirSync(path.join(root, 'nested'), {recursive: true, mode: 0o755});
    fs.writeFileSync(path.join(root, 'sentinel'), 'unchanged');
    fs.writeFileSync(path.join(root, 'nested/executable'), '#!/bin/sh\nexit 0\n', {mode: 0o755});
  }

  const snapshot = root => {
    const entries = [];
    const visit = (directory, relative = '') => {
      const stat = fs.lstatSync(directory);
      entries.push({relative, type: stat.isDirectory() ? 'directory' : stat.isFile() ? 'file' : stat.isSymbolicLink() ? 'symlink' : 'other', mode: stat.mode & 0o777, bytes: stat.isFile() ? fs.readFileSync(directory).toString('base64') : undefined, target: stat.isSymbolicLink() ? fs.readlinkSync(directory) : undefined});
      if (stat.isDirectory()) for (const name of fs.readdirSync(directory).sort()) visit(path.join(directory, name), path.join(relative, name));
    };
    visit(root);
    return entries;
  };
  const before = providerRoots.map(snapshot);

  for (const projection of [
    'ast-grep', 'registry-health', 'stack-router', 'serena-guidance', 'context7-guidance', 'playwright-guidance', 'session-start',
  ]) {
    fs.cpSync(path.join(ROOT, 'registry/overlays/wrappers', projection), path.join(fixtureRoot, 'registry/overlays/wrappers', projection), {recursive: true});
  }
  syncOpencodeSkills({root: fixtureRoot});

  const outputRoot = path.join(home, 'project/.opencode/skills');
  const guardedFunctions = [
    'accessSync', 'chmodSync', 'copyFileSync', 'existsSync', 'lstatSync', 'mkdirSync', 'mkdtempSync',
    'readFileSync', 'readlinkSync', 'readdirSync', 'realpathSync', 'renameSync', 'rmSync', 'writeFileSync',
  ];
  const originals = Object.fromEntries(guardedFunctions.map(name => [name, fs[name]]));
  const originalRealpathNative = fs.realpathSync.native;
  const forbidden = value => providerRoots.some(root => {
    const candidate = path.resolve(String(value));
    return candidate === root || candidate.startsWith(`${root}${path.sep}`);
  });
  try {
    for (const [name, original] of Object.entries(originals)) {
      fs[name] = function(value, ...args) {
        if (forbidden(value)) throw new Error(`provider home skill root accessed through ${name}: ${value}`);
        return original.call(this, value, ...args);
      };
    }
    fs.realpathSync.native = function(value, ...args) {
      if (forbidden(value)) throw new Error(`provider home skill root accessed through realpathSync.native: ${value}`);
      return originalRealpathNative.call(this, value, ...args);
    };
    syncOpencodeSkills({root: ROOT, outputRoot});
    assert.deepEqual(checkOpencodeSkills({root: fixtureRoot}), {ok: true, differences: []});
  } finally {
    Object.assign(fs, originals);
    fs.realpathSync.native = originalRealpathNative;
  }
  assert.deepEqual(providerRoots.map(snapshot), before);
});

test('general exposure declarations remain while OpenCode specialization bypasses them', () => {
  const exposures = JSON.parse(fs.readFileSync(path.join(ROOT, 'registry/manifests/exposures.yaml'), 'utf8')).exposures;
  for (const [host, target] of [
    ['codex', '~/.agents/skills/'],
    ['cursor', '~/.cursor/skills/'],
    ['opencode', '~/.config/opencode/skills/'],
  ]) {
    assert.ok(exposures.some(exposure => exposure.host === host && exposure.target.startsWith(target)));
  }
  assert.deepEqual(APPROVED_OPENCODE_ONLY_POLICY.personalization_paths_bypassed, [
    'codex-direct',
    'cursor-direct',
    'opencode-global-home',
  ]);
});
