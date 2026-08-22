import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  generatePluginDescriptionIndex,
  markRoutingComplete,
  isRoutingComplete,
} from '../cursor-plugin-routing/scripts/plugin-description-index.mjs';

import {rankPluginCandidatesFromIndexText} from '../cursor-plugin-routing/scripts/rank-plugin-candidates.mjs';

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value, 'utf8');
}

function makeCursorPluginTree(rootDir, pluginId, { pluginDescription, skillDescription, ruleDescription }) {
  const pluginRoot = path.join(rootDir, pluginId);
  const cursorPluginDir = path.join(pluginRoot, '.cursor-plugin');
  fs.mkdirSync(cursorPluginDir, { recursive: true });

  writeJson(path.join(cursorPluginDir, 'plugin.json'), {
    name: pluginId,
    version: '1.0.0',
    description: pluginDescription,
    skills: './skills/',
    rules: './rules/',
    hooks: './hooks/hooks.json',
    mcpServers: 'mcp.json',
  });

  writeJson(path.join(pluginRoot, 'mcp.json'), {
    mcpServers: {
      [pluginId]: {
        url: `https://example.com/${pluginId}`,
      },
    },
  });

  writeText(
    path.join(pluginRoot, 'skills', 'foo', 'SKILL.md'),
    `---\nname: ${pluginId}-foo\ndescription: ${skillDescription}\n---\n\nThis is full content.\nDO_NOT_COPY_FULL_INSTRUCTIONS\n`
  );

  writeText(
    path.join(pluginRoot, 'rules', 'my-rule.mdc'),
    `---\ndescription: ${ruleDescription}\nalwaysApply: true\n---\n\nRule body.\n`
  );

  writeJson(path.join(pluginRoot, 'hooks', 'hooks.json'), {
    version: 1,
    hooks: {
      sessionStart: [{ command: './hooks/session-start' }],
    },
  });

  return pluginRoot;
}

test('plugin-description-index: extracts routing metadata only', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hhpe-plugin-routing-'));
  const pluginsRoot = path.join(tmp, 'plugins');

  makeCursorPluginTree(pluginsRoot, 'plugin-a', {
    pluginDescription: 'Plugin A purpose',
    skillDescription: 'Foo skill does planning',
    ruleDescription: 'Always apply planning routing',
  });

  const outDir = path.join(tmp, 'out');
  fs.mkdirSync(outDir, { recursive: true });
  const outputIndexPath = path.join(outDir, 'plugin-index.md');
  const fingerprintPath = path.join(outDir, '.fingerprint');

  const result = await generatePluginDescriptionIndex({
    pluginSearchRoots: [pluginsRoot],
    outputIndexPath,
    fingerprintPath,
  });

  const indexText = fs.readFileSync(outputIndexPath, 'utf8');

  assert.equal(typeof result.fingerprint, 'string');
  assert.ok(indexText.includes('## plugin-a'));
  assert.ok(indexText.includes('Plugin A purpose'));
  assert.ok(indexText.includes('Foo skill does planning'));
  assert.ok(indexText.includes('sessionStart'));

  assert.ok(!indexText.includes('DO_NOT_COPY_FULL_INSTRUCTIONS'));

  fs.rmSync(tmp, { recursive: true, force: true });
});

test('plugin-description-index: deterministic + does not rewrite when fingerprint unchanged', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hhpe-plugin-routing-'));
  const pluginsRoot = path.join(tmp, 'plugins');

  makeCursorPluginTree(pluginsRoot, 'plugin-a', {
    pluginDescription: 'Plugin A purpose',
    skillDescription: 'Foo skill does planning',
    ruleDescription: 'Always apply planning routing',
  });

  const outDir = path.join(tmp, 'out');
  fs.mkdirSync(outDir, { recursive: true });
  const outputIndexPath = path.join(outDir, 'plugin-index.md');
  const fingerprintPath = path.join(outDir, '.fingerprint');

  const r1 = await generatePluginDescriptionIndex({
    pluginSearchRoots: [pluginsRoot],
    outputIndexPath,
    fingerprintPath,
  });
  const mtime1 = fs.statSync(outputIndexPath).mtimeMs;

  // Ensure same metadata → no rewrite.
  const r2 = await generatePluginDescriptionIndex({
    pluginSearchRoots: [pluginsRoot],
    outputIndexPath,
    fingerprintPath,
  });
  const mtime2 = fs.statSync(outputIndexPath).mtimeMs;

  assert.equal(r1.fingerprint, r2.fingerprint);
  assert.equal(mtime1, mtime2);

  fs.rmSync(tmp, { recursive: true, force: true });
});

test('plugin-description-index: fingerprint changes when metadata changes', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hhpe-plugin-routing-'));
  const pluginsRoot = path.join(tmp, 'plugins');

  const pluginRoot = makeCursorPluginTree(pluginsRoot, 'plugin-a', {
    pluginDescription: 'Plugin A purpose',
    skillDescription: 'Foo skill does planning',
    ruleDescription: 'Always apply planning routing',
  });

  const outDir = path.join(tmp, 'out');
  fs.mkdirSync(outDir, { recursive: true });
  const outputIndexPath = path.join(outDir, 'plugin-index.md');
  const fingerprintPath = path.join(outDir, '.fingerprint');

  const r1 = await generatePluginDescriptionIndex({
    pluginSearchRoots: [pluginsRoot],
    outputIndexPath,
    fingerprintPath,
  });

  const skillPath = path.join(pluginRoot, 'skills', 'foo', 'SKILL.md');
  const skillText = fs.readFileSync(skillPath, 'utf8').replace('Foo skill does planning', 'Foo skill does execution');
  fs.writeFileSync(skillPath, skillText, 'utf8');

  const r2 = await generatePluginDescriptionIndex({
    pluginSearchRoots: [pluginsRoot],
    outputIndexPath,
    fingerprintPath,
  });

  assert.notEqual(r1.fingerprint, r2.fingerprint);

  fs.rmSync(tmp, { recursive: true, force: true });
});

test('plugin-description-index: warns on missing/malformed metadata', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hhpe-plugin-routing-'));
  const pluginsRoot = path.join(tmp, 'plugins');

  const pluginRoot = makeCursorPluginTree(pluginsRoot, 'plugin-a', {
    pluginDescription: undefined,
    skillDescription: undefined,
    ruleDescription: undefined,
  });

  // Simulate malformed plugin.json by removing the description key entirely.
  const pluginJsonPath = path.join(pluginRoot, '.cursor-plugin', 'plugin.json');
  const pluginJson = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf8'));
  delete pluginJson.description;
  fs.writeFileSync(pluginJsonPath, JSON.stringify(pluginJson, null, 2) + '\n', 'utf8');

  const outDir = path.join(tmp, 'out');
  fs.mkdirSync(outDir, { recursive: true });
  const outputIndexPath = path.join(outDir, 'plugin-index.md');
  const fingerprintPath = path.join(outDir, '.fingerprint');

  const result = await generatePluginDescriptionIndex({
    pluginSearchRoots: [pluginsRoot],
    outputIndexPath,
    fingerprintPath,
  });

  assert.ok(result.warnings.length >= 1);

  fs.rmSync(tmp, { recursive: true, force: true });
});

test('routing-complete markers integrate with gating state checks', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hhpe-plugin-routing-'));
  const outDir = path.join(tmp, 'out');
  fs.mkdirSync(outDir, { recursive: true });

  const fingerprintPath = path.join(outDir, '.fingerprint');
  fs.writeFileSync(fingerprintPath, 'abc123', 'utf8');
  const routingCompleteFlagPath = path.join(outDir, 'routing-complete.json');

  await markRoutingComplete({
    fingerprintPath,
    routingCompleteFlagPath,
    stateDir: outDir,
    sessionId: 'test-session',
  });

  const ok = await isRoutingComplete({
    routingCompleteFlagPath,
    routingFingerprintPath: path.join(outDir, 'routing-fingerprint.json'),
    currentFingerprintPath: fingerprintPath,
    stateDir: outDir,
    sessionId: 'test-session',
  });

  assert.equal(ok, true);

  fs.rmSync(tmp, { recursive: true, force: true });
});

test('plugin-routing package exposes rule/skill and points at derived index path', async () => {
  const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
  const rulePath = path.join(repoRoot, 'cursor-plugin-routing', 'rules', 'plugin-routing.mdc');
  const skillPath = path.join(repoRoot, 'cursor-plugin-routing', 'skills', 'plugin-routing', 'SKILL.md');
  const manifestPath = path.join(repoRoot, 'cursor-plugin-routing', '.cursor-plugin', 'plugin.json');

  assert.ok(fs.existsSync(rulePath));
  assert.ok(fs.existsSync(skillPath));

  const rule = fs.readFileSync(rulePath, 'utf8');
  const skill = fs.readFileSync(skillPath, 'utf8');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  assert.equal(manifest.name, 'hhpe-hrg-plugin-stack');
  assert.equal(manifest.author.name, 'HHPE-HRG');
  assert.equal(manifest.repository, 'https://github.com/HHPE-HRG/curated-market');
  assert.ok(rule.includes('~/.cursor/hhpe-hrg-plugin-stack/derived/plugin-index.md'));
  assert.ok(rule.includes('## Plugin and capability use'));
  assert.ok(skill.includes('node ${CURSOR_PLUGIN_ROOT}/scripts/mark-routing-complete.mjs'));
});

test('plugin-index candidate ranking prefers the most relevant plugin block', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hhpe-plugin-routing-'));
  const pluginsRoot = path.join(tmp, 'plugins');

  makeCursorPluginTree(pluginsRoot, 'plugin-a', {
    pluginDescription: 'GitHub pull requests and GitHub Actions checks remediation',
    skillDescription: 'Plan and execute CI remediation',
    ruleDescription: 'Always apply planning routing',
  });

  makeCursorPluginTree(pluginsRoot, 'plugin-b', {
    pluginDescription: 'Local repository unit tests and static analysis',
    skillDescription: 'Run and validate unit tests',
    ruleDescription: 'Always apply planning routing',
  });

  const outDir = path.join(tmp, 'out');
  fs.mkdirSync(outDir, { recursive: true });
  const outputIndexPath = path.join(outDir, 'plugin-index.md');
  const fingerprintPath = path.join(outDir, '.fingerprint');

  await generatePluginDescriptionIndex({
    pluginSearchRoots: [pluginsRoot],
    outputIndexPath,
    fingerprintPath,
  });

  const indexText = fs.readFileSync(outputIndexPath, 'utf8');
  const ranked = rankPluginCandidatesFromIndexText({
    indexText,
    task: 'Fix the failing GitHub Actions checks on this pull request.',
    top: 2,
  });

  assert.equal(ranked[0].pluginName, 'plugin-a');

  fs.rmSync(tmp, { recursive: true, force: true });
});

