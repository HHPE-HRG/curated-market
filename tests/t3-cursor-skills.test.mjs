/**
 * Agent context: T3 `$` reads provider `skills`. Intended: Market catalog on
 * every provider. Observed: Cursor-home inject left Codex `.system` in `$`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

import {
  attachCursorSkillsToProviders,
  discoverCursorSkillsSync,
  ensureT3LaunchAgentCursorSkillImport,
  injectT3CursorSkillCache,
  materializePatchedT3Dist,
  transformT3BinSource,
} from '../lib/t3-cursor-skills.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function tmpDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

test('discoverCursorSkillsSync reads SKILL.md from ~/.cursor/skills', () => {
  const home = tmpDir('hhpe-t3-skills-home-');
  const skillDir = path.join(home, '.cursor/skills/original-source-research');
  fs.mkdirSync(skillDir, {recursive: true});
  fs.writeFileSync(
    path.join(skillDir, 'SKILL.md'),
    '---\nname: original-source-research\ndescription: Find original producers.\n---\n# body\n',
  );
  const skills = discoverCursorSkillsSync({home});
  assert.equal(skills.some((s) => s.name === 'original-source-research'), true);
  fs.rmSync(home, {recursive: true, force: true});
});

test('injectT3CursorSkillCache writes the Market catalog into every provider snapshot', () => {
  const home = tmpDir('hhpe-t3-skills-cache-');
  const cacheDir = path.join(home, '.t3/caches');
  fs.mkdirSync(cacheDir, {recursive: true});
  const catalog = [
    {
      name: 'skill-creator-guidance',
      path: '/tmp/skill-creator-guidance/SKILL.md',
      enabled: true,
      displayName: 'skill-creator-guidance',
    },
  ];
  fs.writeFileSync(
    path.join(cacheDir, 'cursor.json'),
    JSON.stringify({
      displayName: 'Cursor',
      driver: 'cursor',
      instanceId: 'cursor',
      models: [{slug: 'default', name: 'Auto'}],
      slashCommands: [{name: 'compact', description: 'Summarize'}],
      skills: [],
    }),
  );
  fs.writeFileSync(
    path.join(cacheDir, 'opencode.json'),
    JSON.stringify({
      displayName: 'OpenCode',
      driver: 'opencode',
      instanceId: 'opencode',
      skills: [{name: 'keep-open', path: '/tmp/keep.md', enabled: true}],
    }),
  );
  fs.writeFileSync(
    path.join(cacheDir, 'grok.json'),
    JSON.stringify({
      displayName: 'Grok',
      driver: 'cursor',
      skills: [{name: 'skill-creator', path: '/tmp/system/skill-creator/SKILL.md'}],
    }),
  );
  // Grok/Cursor default snapshots often omit `skills` after status refresh.
  // `$` still reads those files; inject must write the catalog anyway.
  fs.writeFileSync(
    path.join(cacheDir, 'grok-empty.json'),
    JSON.stringify({
      displayName: 'Grok',
      driver: 'grok',
    }),
  );
  const result = injectT3CursorSkillCache({home, cacheDir, skills: catalog});
  const snapshot = JSON.parse(fs.readFileSync(path.join(cacheDir, 'cursor.json'), 'utf8'));
  const openCode = JSON.parse(fs.readFileSync(path.join(cacheDir, 'opencode.json'), 'utf8'));
  const grok = JSON.parse(fs.readFileSync(path.join(cacheDir, 'grok.json'), 'utf8'));
  const grokEmpty = JSON.parse(fs.readFileSync(path.join(cacheDir, 'grok-empty.json'), 'utf8'));
  assert.equal(result.updated, 4);
  assert.equal(snapshot.models[0].slug, 'default');
  assert.ok(snapshot.skills.some((s) => s.name === 'skill-creator-guidance'));
  assert.ok(snapshot.slashCommands.some((c) => c.name === 'skill-creator-guidance'));
  assert.ok(snapshot.slashCommands.some((c) => c.name === 'compact'));
  assert.equal(openCode.skills.some((s) => s.name === 'keep-open'), false);
  assert.ok(openCode.skills.some((s) => s.name === 'skill-creator-guidance'));
  assert.equal(grok.skills.some((s) => s.name === 'skill-creator'), false);
  assert.ok(grok.skills.some((s) => s.name === 'skill-creator-guidance'));
  assert.ok(grokEmpty.skills.some((s) => s.name === 'skill-creator-guidance'));
  fs.rmSync(home, {recursive: true, force: true});
});

test('JSON.stringify of an attached Codex snapshot uses catalog skills, not toJSON native skills', () => {
  const catalog = [
    {
      name: 'original-source-research',
      path: '/tmp/orig/SKILL.md',
      enabled: true,
      displayName: 'original-source-research',
    },
  ];
  const provider = {
    displayName: 'Codex',
    driver: 'codex',
    skills: [{name: 'caveman:caveman-compress'}],
    toJSON() {
      return {
        displayName: this.displayName,
        driver: this.driver,
        skills: [{name: 'caveman-compress'}, {name: 'caveman:caveman-compress'}],
      };
    },
  };
  const attached = attachCursorSkillsToProviders(provider, {skills: catalog, cacheDir: tmpDir('hhpe-t3-tojson-cache-')});
  const parsed = JSON.parse(JSON.stringify(attached));
  assert.equal(parsed.skills.map((s) => s.name).join(','), 'original-source-research');
  assert.equal(parsed.skills.some((s) => String(s.name).includes('compress')), false);
});

test('attachCursorSkillsToProviders puts one Market catalog on every provider', () => {
  const catalog = [
    {
      name: 'original-source-research',
      path: '/tmp/orig/SKILL.md',
      enabled: true,
      displayName: 'original-source-research',
    },
    {
      name: 'caveman-compress',
      path: '/tmp/compress/SKILL.md',
      enabled: true,
      displayName: 'caveman-compress',
    },
  ];
  const next = attachCursorSkillsToProviders(
    [
      {displayName: 'Cursor', driver: 'cursor', skills: [], slashCommands: []},
      {displayName: 'Codex', driver: 'codex', skills: [{name: 'skill-creator'}], slashCommands: []},
      {displayName: 'OpenCode', driver: 'opencode', skills: [{name: 'keep-open'}], slashCommands: []},
    ],
    {skills: catalog, cacheDir: tmpDir('hhpe-t3-attach-cache-')},
  );
  assert.deepEqual(next[0].skills.map((s) => s.name), ['original-source-research', 'caveman-compress']);
  assert.deepEqual(next[1].skills.map((s) => s.name), ['original-source-research', 'caveman-compress']);
  assert.deepEqual(next[2].skills.map((s) => s.name), ['original-source-research', 'caveman-compress']);
  assert.equal(next[1].skills.some((s) => s.name === 'skill-creator'), false);
  assert.equal(next[0].skills.filter((s) => s.name === 'caveman-compress').length, 1);
});

test('transformT3BinSource wraps getProviders so `$` re-reads skills', () => {
  const source = `import { $ as map$4 } from "./Schema.mjs";
function buildServerProvider(input) {
	const versionAdvisory = void 0;
	return input;
}
	return {
		getProviders: get$4(providersRef),
		refresh: (provider) => refresh(provider)
	};
const writeProviderStatusCache = (input) => {
	const { updateState: _updateState, ...cacheableProvider } = input.provider;
	return cacheableProvider;
};
			if (options?.publish !== false) yield* publish(changesPubSub, providers);
`;
  const transformed = transformT3BinSource(source, 'file:///tmp/t3-cursor-skills.mjs');
  assert.match(transformed, /t3-cursor-skills\.mjs/);
  assert.match(transformed, /__hhpeAttachCursorSkillsToProviders/);
  assert.match(transformed, /__hhpeAttachCursorSkillsToBuildInput\(input\)/);
  assert.match(transformed, /getProviders: get\$4\(providersRef\)\.pipe\(map\$4\(__hhpeAttachCursorSkillsToProviders\)\)/);
  assert.match(transformed, /provider: __hhpeAttachCursorSkillsToProviders\(input\.provider\)/);
  assert.match(transformed, /publish\(changesPubSub, __hhpeAttachCursorSkillsToProviders\(providers\)\)/);
  const again = transformT3BinSource(transformed, 'file:///tmp/t3-cursor-skills.mjs');
  assert.equal(again, transformed);
});

test('ensureT3LaunchAgentCursorSkillImport points ProgramArguments at the wrapper', () => {
  const dir = tmpDir('hhpe-t3-plist-');
  const plistPath = path.join(dir, 'com.example.t3-server.plist');
  const wrapperPath = path.join(dir, 'run-t3-server-with-cursor-skills');
  fs.writeFileSync(
    plistPath,
    `<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0">
<dict>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/libexec/t3-server/run-t3-server</string>
  </array>
</dict>
</plist>
`,
  );
  const first = ensureT3LaunchAgentCursorSkillImport({
    plistPath,
    registerPath: '/tmp/t3-cursor-skills-register.mjs',
    wrapperPath,
  });
  assert.equal(first.action, 'patched');
  const text = fs.readFileSync(plistPath, 'utf8');
  assert.match(text, /run-t3-server-with-cursor-skills/);
  assert.equal(text.includes('/usr/local/libexec/t3-server/run-t3-server'), false);
  const second = ensureT3LaunchAgentCursorSkillImport({
    plistPath,
    registerPath: '/tmp/t3-cursor-skills-register.mjs',
    wrapperPath,
  });
  assert.equal(second.action, 'unchanged');
  fs.rmSync(dir, {recursive: true, force: true});
});

test('materializePatchedT3Dist writes a wrapped bin.mjs beside symlinked sidecars', () => {
  const sourceDist = tmpDir('hhpe-t3-src-dist-');
  const destDist = tmpDir('hhpe-t3-dst-dist-');
  fs.writeFileSync(
    path.join(sourceDist, 'bin.mjs'),
    `#!/usr/bin/env node
function buildServerProvider(input) {
	return input;
}
	return { getProviders: get$4(providersRef) };
`,
  );
  fs.writeFileSync(path.join(sourceDist, 'Schema.mjs'), 'export {}\n');
  const result = materializePatchedT3Dist({
    sourceDist,
    destDist,
    runtimeHref: 'file:///tmp/t3-cursor-skills.mjs',
  });
  assert.equal(result.action, 'patched');
  const patched = fs.readFileSync(path.join(destDist, 'bin.mjs'), 'utf8');
  assert.match(patched, /__hhpeAttachCursorSkillsToProviders/);
  assert.equal(fs.readlinkSync(path.join(destDist, 'Schema.mjs')), path.join(sourceDist, 'Schema.mjs'));
  fs.rmSync(sourceDist, {recursive: true, force: true});
  fs.rmSync(destDist, {recursive: true, force: true});
});

test('sync --apply spawns the T3 Cursor skill injector when present', () => {
  const root = tmpDir('hhpe-t3-skills-sync-');
  const home = tmpDir('hhpe-t3-skills-sync-home-');
  fs.mkdirSync(path.join(root, 'lib'), {recursive: true});
  fs.mkdirSync(path.join(root, 'registry/manifests'), {recursive: true});
  // Agent-agnostic main peeled OpenCode specialization; registry.mjs no longer imports it.
  fs.copyFileSync(path.join(repoRoot, 'lib/registry.mjs'), path.join(root, 'lib/registry.mjs'));
  fs.copyFileSync(path.join(repoRoot, 'lib/tool-contracts.mjs'), path.join(root, 'lib/tool-contracts.mjs'));
  fs.writeFileSync(
    path.join(root, 'lib/t3-cursor-skills.mjs'),
    `#!/usr/bin/env node
import fs from 'node:fs';
const marker = process.argv.includes('--after-sync');
fs.writeFileSync(new URL('./injected.json', import.meta.url), JSON.stringify({marker, argv: process.argv.slice(2)}));
console.log(JSON.stringify({ok: true, marker}));
`,
  );
  const write = (name, value) =>
    fs.writeFileSync(path.join(root, 'registry/manifests', name), JSON.stringify(value));
  write('packages.lock.yaml', {packages: []});
  write('capabilities.yaml', {capabilities: []});
  write('exposures.yaml', {exposures: []});
  write('migration-state.yaml', {phase: 'test', managed_objects: [], limitations: []});
  write('tools.yaml', {tools: []});
  const result = spawnSync(process.execPath, [path.join(root, 'lib/registry.mjs'), 'sync', '--apply', '--home', home], {
    env: {...process.env, HHPE_HRG_HOME: root},
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  const injected = JSON.parse(fs.readFileSync(path.join(root, 'lib/injected.json'), 'utf8'));
  assert.equal(injected.marker, true);
  assert.ok(injected.argv.includes('--home'));
  fs.rmSync(root, {recursive: true, force: true});
  fs.rmSync(home, {recursive: true, force: true});
});
