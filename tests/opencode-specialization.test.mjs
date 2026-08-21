import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {
  APPROVED_OPENCODE_ONLY_POLICY,
  readOpencodeOnlyFiles,
  validateOpencodeOnly,
} from '../lib/opencode-specialization.mjs';

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
    agents => { agents.get('operator.md').body = 'Set OPENAI_API_KEY before work.'; },
  ]) {
    const agents = structuredClone(files.agents);
    mutate(agents);
    assert.equal(validateOpencodeOnly({...files, agents, root: ROOT}).ok, false);
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
