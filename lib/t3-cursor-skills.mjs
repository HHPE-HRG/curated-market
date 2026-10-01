/**
 * Agent context: T3 `$` is provider `skills`. Intended: attach
 * `listMarketSkills()` to every provider. Observed: wrapping Cursor FS /
 * Codex home could not populate orig; `$` ate write-side trees. Disk
 * caches are a copy of the catalog, not the authority.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {listMarketSkills} from './market-skill-catalog.mjs';

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
const HHPE_IMPORT_MARKER = '__hhpeAttachCursorSkillsToProviders';
const HHPE_BUILD_INPUT_MARKER = '__hhpeAttachCursorSkillsToBuildInput';
const GET_PROVIDERS_NEEDLE = 'getProviders: get$4(providersRef)';
const GET_PROVIDERS_REPLACEMENT =
  'getProviders: get$4(providersRef).pipe(map$4(__hhpeAttachCursorSkillsToProviders))';
const BUILD_SERVER_NEEDLE = 'function buildServerProvider(input) {\n';
const BUILD_SERVER_REPLACEMENT = `function buildServerProvider(input) {
	input = ${HHPE_BUILD_INPUT_MARKER}(input);
`;
// Persist + live stream skip getProviders. 16:38 refresh wrote cursor.json
// skills:[] without going through a wrapped read path the phone uses.
const WRITE_CACHE_NEEDLE = `const writeProviderStatusCache = (input) => {
	const { updateState: _updateState, ...cacheableProvider } = input.provider;`;
const WRITE_CACHE_REPLACEMENT = `const writeProviderStatusCache = (input) => {
	input = { ...input, provider: ${HHPE_IMPORT_MARKER}(input.provider) };
	const { updateState: _updateState, ...cacheableProvider } = input.provider;`;
const PUBLISH_NEEDLE = 'publish(changesPubSub, providers)';
const PUBLISH_REPLACEMENT = `publish(changesPubSub, ${HHPE_IMPORT_MARKER}(providers))`;

export const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
export const REGISTER_PATH = path.join(MODULE_DIR, 't3-cursor-skills-register.mjs');
export const WRAPPER_PATH = path.resolve(MODULE_DIR, '../bin/run-t3-server-with-cursor-skills');
export const DEFAULT_PATCHED_T3_DIST = path.join(
  os.homedir(),
  '.t3',
  'hhpe-cursor-skills',
  'node_modules',
  't3',
  'dist',
);
const DEFAULT_UPSTREAM_T3_DIST = '/usr/local/libexec/t3-server/node_modules/t3/dist';

function parseScalar(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseSkillFrontmatter(contents) {
  const match = FRONTMATTER_PATTERN.exec(contents);
  if (!match) return {kind: 'missing'};
  const lines = (match[1] ?? '').split(/\r?\n/);
  let name = '';
  let description = '';
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    const nameMatch = /^name:\s*(.*)$/.exec(line);
    if (nameMatch) {
      name = parseScalar(nameMatch[1] ?? '');
      continue;
    }
    const descriptionMatch = /^description:\s*(.*)$/.exec(line);
    if (descriptionMatch) {
      const rest = parseScalar(descriptionMatch[1] ?? '');
      if (rest === '>' || rest === '|' || rest === '>-' || rest === '|-') {
        const folded = [];
        while (index + 1 < lines.length && /^\s+\S/.test(lines[index + 1] ?? '')) {
          index += 1;
          folded.push((lines[index] ?? '').trim());
        }
        description = folded.join(' ');
      } else {
        description = rest;
      }
    }
  }
  return {kind: 'parsed', ...(name ? {name} : {}), ...(description ? {description} : {})};
}

function readSkillRoot(directory, scope, skillsByName) {
  let entries;
  try {
    entries = fs.readdirSync(directory);
  } catch {
    return;
  }
  for (const entry of [...entries].sort()) {
    const skillPath = path.join(directory, entry, 'SKILL.md');
    let contents;
    try {
      contents = fs.readFileSync(skillPath, 'utf8');
    } catch {
      continue;
    }
    const frontmatter = parseSkillFrontmatter(contents);
    const name = (frontmatter.kind === 'parsed' ? frontmatter.name : undefined) ?? entry.trim();
    if (!name) continue;
    const description =
      frontmatter.kind === 'parsed' && frontmatter.description ? frontmatter.description : undefined;
    const shortDescription = description
      ? description.split(/(?<=\.)\s/)[0].slice(0, 160)
      : name;
    skillsByName.set(name, {
      name,
      path: skillPath,
      enabled: true,
      scope,
      displayName: name,
      shortDescription,
      ...(description ? {description} : {}),
    });
  }
}

/**
 * Enumerate Cursor-visible SKILL.md trees. Not the `$` catalog (see
 * listMarketSkills). Kept for operators inspecting host projections.
 */
export function discoverCursorSkillsSync(options = {}) {
  const cwd = options.cwd ?? options.projectRoot ?? '';
  const home = options.home ?? os.homedir();
  const cursorHome = options.cursorHome ?? path.join(home, '.cursor');
  const skillsByName = new Map();
  readSkillRoot(path.join(home, '.agents', 'skills'), 'user', skillsByName);
  readSkillRoot(path.join(cursorHome, 'skills'), 'user', skillsByName);
  if (cwd) {
    readSkillRoot(path.join(cwd, '.agents', 'skills'), 'project', skillsByName);
    readSkillRoot(path.join(cwd, '.cursor', 'skills'), 'project', skillsByName);
  }
  return [...skillsByName.values()].sort((left, right) => left.name.localeCompare(right.name));
}

export function cursorSkillsToSlashCommands(skills) {
  return skills.map((skill) => ({
    name: skill.name,
    ...(skill.description ? {description: skill.description} : {}),
  }));
}

function isCursorProvider(provider) {
  return provider?.driver === 'cursor' || provider?.displayName === 'Cursor';
}

function isOpenCodeProvider(provider) {
  return provider?.driver === 'opencode' || provider?.displayName === 'OpenCode';
}

function mergeSlashCommands(existing, skillCommands) {
  const byName = new Map();
  for (const command of existing ?? []) {
    if (command?.name) byName.set(command.name, command);
  }
  for (const command of skillCommands) {
    byName.set(command.name, command);
  }
  return [...byName.values()];
}

function overlayCatalogOntoProvider(provider, overlaySkills, skillCommands) {
  const rest = { ...(provider && typeof provider === 'object' ? provider : {}) };
  // Agent: Codex snapshots carry enumerable toJSON that re-emits native
  // skills. Persist JSON.stringify would ignore our `skills` override.
  delete rest.toJSON;
  return {
    ...rest,
    skills: [...overlaySkills],
    slashCommands: mergeSlashCommands(rest.slashCommands, skillCommands),
  };
}

function hhpeSkillAttachLog(message) {
  try {
    const dir = path.join(os.homedir(), '.t3', 'hhpe-cursor-skills');
    fs.mkdirSync(dir, {recursive: true});
    fs.appendFileSync(path.join(dir, 'attach.log'), `${new Date().toISOString()} ${message}\n`);
  } catch {
    /* logging must never break t3-server */
  }
}

function loadCatalogSkills(options = {}) {
  if (Array.isArray(options.skills)) return options.skills;
  return listMarketSkills({root: options.root});
}

export function attachCursorSkillsToProviders(providers, options = {}) {
  try {
    const list = Array.isArray(providers) ? providers : providers == null ? [] : [providers];
    const skills = loadCatalogSkills(options);
    hhpeSkillAttachLog(`attach kind=${Array.isArray(providers) ? 'array' : typeof providers} n=${list.length} catalog=${skills.length} orig=${skills.some((s) => s.name === 'original-source-research')}`);
    const skillCommands = cursorSkillsToSlashCommands(skills);
    const mapped = list.map((provider) => overlayCatalogOntoProvider(provider, skills, skillCommands));
    try {
      injectT3CursorSkillCache({...options, skills});
    } catch (error) {
      hhpeSkillAttachLog(`cache-inject ${error.message}`);
    }
    return Array.isArray(providers) ? mapped : (mapped[0] ?? providers);
  } catch (error) {
    hhpeSkillAttachLog(`attach-error ${error.message}`);
    return Array.isArray(providers)
      ? (providers ?? []).map((provider) => overlayCatalogOntoProvider(provider, [], []))
      : overlayCatalogOntoProvider(providers, [], []);
  }
}

export const attachMarketCatalogToProviders = attachCursorSkillsToProviders;

/**
 * Persist wrap: every provider snapshot stores the Market catalog, not a
 * Cursor-only overlay. Fail closed to empty skills, never a Codex .system walk.
 */
export function attachCursorSkillsToBuildInput(input, options = {}) {
  try {
    hhpeSkillAttachLog(`buildInput displayName=${input?.presentation?.displayName} driver=${input?.driver}`);
    const skills = loadCatalogSkills(options);
    return overlayCatalogOntoProvider(input, skills, cursorSkillsToSlashCommands(skills));
  } catch (error) {
    hhpeSkillAttachLog(`buildInput-error ${error.message}`);
    return overlayCatalogOntoProvider(input, [], []);
  }
}

export function resolveT3CacheDir({cacheDir, home} = {}) {
  if (cacheDir) return cacheDir;
  const resolvedHome = home ?? os.homedir();
  return path.join(resolvedHome, '.t3', 'caches');
}

function overlayCacheFiles(cacheDir) {
  let entries;
  try {
    entries = fs.readdirSync(cacheDir);
  } catch {
    return [];
  }
  return entries.filter((name) => name.endsWith('.json')).map((name) => path.join(cacheDir, name));
}

function writeJsonAtomic(filePath, value) {
  const tmp = `${filePath}.hhpe-tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(tmp, filePath);
}

/**
 * Write Market catalog into every T3 provider cache JSON. Cache is a
 * snapshot of listMarketSkills, not Cursor/Codex filesystem discovery.
 */
export function injectT3CursorSkillCache(options = {}) {
  const cacheDir = resolveT3CacheDir(options);
  let skills;
  try {
    skills = loadCatalogSkills(options);
  } catch (error) {
    hhpeSkillAttachLog(`catalog ${error.message}`);
    skills = [];
  }
  const skillCommands = cursorSkillsToSlashCommands(skills);
  let updated = 0;
  const files = [];
  for (const filePath of overlayCacheFiles(cacheDir)) {
    let snapshot;
    try {
      snapshot = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
      continue;
    }
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) continue;
    if (snapshot.driver == null && snapshot.displayName == null && snapshot.skills == null) continue;
    writeJsonAtomic(filePath, overlayCatalogOntoProvider(snapshot, skills, skillCommands));
    updated += 1;
    files.push(filePath);
  }
  return {cacheDir, skillCount: skills.length, updated, files, skillNames: skills.map((s) => s.name)};
}

export function transformT3BinSource(source, runtimeHref) {
  const wrappedProviders = source.includes(GET_PROVIDERS_REPLACEMENT);
  const wrappedBuild = source.includes(`${HHPE_BUILD_INPUT_MARKER}(input)`);
  const wrappedPersist = source.includes(WRITE_CACHE_REPLACEMENT);
  const wrappedPublish = source.includes(PUBLISH_REPLACEMENT);
  if (
    source.includes(HHPE_IMPORT_MARKER) &&
    wrappedProviders &&
    wrappedBuild &&
    wrappedPersist &&
    wrappedPublish
  ) {
    return source;
  }
  if (!source.includes(GET_PROVIDERS_NEEDLE) && !wrappedProviders) {
    throw new Error('t3 bin.mjs does not contain the Cursor getProviders needle; refuse to wrap');
  }
  const importLine = `import { attachCursorSkillsToProviders as ${HHPE_IMPORT_MARKER}, attachCursorSkillsToBuildInput as ${HHPE_BUILD_INPUT_MARKER} } from ${JSON.stringify(runtimeHref)};\n`;
  let next = source;
  if (!next.includes(HHPE_IMPORT_MARKER)) {
    const shebang = next.startsWith('#!') ? next.indexOf('\n') + 1 : 0;
    next = next.slice(0, shebang) + importLine + next.slice(shebang);
  } else if (!next.includes(HHPE_BUILD_INPUT_MARKER)) {
    next = next.replace(
      `import { attachCursorSkillsToProviders as ${HHPE_IMPORT_MARKER} } from ${JSON.stringify(runtimeHref)};`,
      importLine.trim(),
    );
  }
  if (!wrappedProviders) {
    next = next.replace(GET_PROVIDERS_NEEDLE, GET_PROVIDERS_REPLACEMENT);
  }
  if (!wrappedBuild && next.includes(BUILD_SERVER_NEEDLE)) {
    next = next.replace(BUILD_SERVER_NEEDLE, BUILD_SERVER_REPLACEMENT);
  }
  if (!wrappedPersist && next.includes(WRITE_CACHE_NEEDLE)) {
    next = next.replace(WRITE_CACHE_NEEDLE, WRITE_CACHE_REPLACEMENT);
  }
  if (!wrappedPublish && next.includes(PUBLISH_NEEDLE)) {
    next = next.replace(PUBLISH_NEEDLE, PUBLISH_REPLACEMENT);
  }
  return next;
}

/**
 * Shadow-copy packaged t3 `dist/` into a user-writable directory, replacing
 * `bin.mjs` with a transformed copy. `--import` loaders have not been wrapping
 * the live Cursor snapshot the `$` menu reads. Sidecar modules stay symlinked
 * at the upstream dist.
 */
function ensureSymlink(source, dest) {
  fs.mkdirSync(path.dirname(dest), {recursive: true});
  try {
    const st = fs.lstatSync(dest);
    if (st.isSymbolicLink() && fs.readlinkSync(dest) === source) return;
    fs.rmSync(dest, {recursive: true, force: true});
  } catch {
    /* missing */
  }
  fs.symlinkSync(source, dest);
}

function linkOverlayNodeModules(sourceDist, destDist) {
  const origT3 = path.dirname(sourceDist);
  const origNm = path.dirname(origT3);
  const destT3 = path.dirname(destDist);
  const destNm = path.dirname(destT3);
  if (path.basename(destT3) !== 't3' || path.basename(destNm) !== 'node_modules') return 0;
  let linked = 0;
  for (const name of ['package.json', 'LICENSE']) {
    const src = path.join(origT3, name);
    if (!fs.existsSync(src)) continue;
    ensureSymlink(src, path.join(destT3, name));
    linked += 1;
  }
  if (!fs.existsSync(origNm)) return linked;
  for (const name of fs.readdirSync(origNm)) {
    if (name === 't3') continue;
    ensureSymlink(path.join(origNm, name), path.join(destNm, name));
    linked += 1;
  }
  return linked;
}

export function materializePatchedT3Dist({
  sourceDist = DEFAULT_UPSTREAM_T3_DIST,
  destDist = DEFAULT_PATCHED_T3_DIST,
  runtimeHref = pathToFileURL(path.join(MODULE_DIR, 't3-cursor-skills.mjs')).href,
} = {}) {
  if (!fs.existsSync(path.join(sourceDist, 'bin.mjs'))) {
    return {action: 'skip', reason: 'missing-upstream-bin', sourceDist};
  }
  fs.mkdirSync(destDist, {recursive: true});
  const sourceBin = path.join(sourceDist, 'bin.mjs');
  const destBin = path.join(destDist, 'bin.mjs');
  const sourceText = fs.readFileSync(sourceBin, 'utf8');
  const transformed = transformT3BinSource(sourceText, runtimeHref);
  if (!transformed.includes(GET_PROVIDERS_REPLACEMENT) || !transformed.includes(HHPE_BUILD_INPUT_MARKER)) {
    throw new Error('refusing to install a t3 bin.mjs that was not wrapped for Cursor skills');
  }
  if (sourceText.includes(WRITE_CACHE_NEEDLE) && !transformed.includes(WRITE_CACHE_REPLACEMENT)) {
    throw new Error('refusing to install a t3 bin.mjs that was not wrapped for Cursor cache persist');
  }
  fs.writeFileSync(destBin, transformed);
  let linked = 0;
  for (const name of fs.readdirSync(sourceDist)) {
    if (name === 'bin.mjs') continue;
    ensureSymlink(path.join(sourceDist, name), path.join(destDist, name));
    linked += 1;
  }
  linked += linkOverlayNodeModules(sourceDist, destDist);
  return {action: 'patched', destDist, destBin, linked, bytes: transformed.length};
}

/**
 * Insert `--import` for the HHPE Cursor-skill loader into the host
 * `run-t3-server` wrapper. Does not restart the live t3-server.
 */
export function ensureT3ServerCursorSkillImport({runScriptPath, registerPath = REGISTER_PATH} = {}) {
  if (!runScriptPath) return {action: 'skip', reason: 'no-run-script'};
  let text;
  try {
    text = fs.readFileSync(runScriptPath, 'utf8');
  } catch {
    return {action: 'skip', reason: 'missing-run-script', runScriptPath};
  }
  const importSpec = `file://${registerPath}`;
  if (text.includes('--import') && text.includes('t3-cursor-skills-register')) {
    return {action: 'unchanged', runScriptPath, importSpec};
  }
  const needle = 'exec "$NODE_BIN" "$T3_ENTRY" serve --host "$tail_ip"';
  if (!text.includes(needle)) {
    return {action: 'refuse', reason: 'unexpected-run-t3-server', runScriptPath};
  }
  const replacement = [
    `typeset -r HHPE_T3_CURSOR_SKILLS_IMPORT=\${HHPE_T3_CURSOR_SKILLS_IMPORT:-${registerPath}}`,
    `exec "$NODE_BIN" --import "file://$HHPE_T3_CURSOR_SKILLS_IMPORT" "$T3_ENTRY" serve --host "$tail_ip"`,
  ].join('\n');
  try {
    fs.writeFileSync(runScriptPath, text.replace(needle, replacement));
  } catch (error) {
    if (error?.code === 'EACCES' || error?.code === 'EPERM') {
      return {action: 'skip', reason: 'run-script-not-writable', runScriptPath, importSpec};
    }
    throw error;
  }
  return {action: 'patched', runScriptPath, importSpec};
}

function nodeImportSpec(registerPath) {
  return `--import ${pathToFileURL(registerPath).href}`;
}

function findT3ServerLaunchPlists(home) {
  const dir = path.join(home, 'Library', 'LaunchAgents');
  let entries;
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return [];
  }
  return entries
    .filter((name) => name.endsWith('.plist') && name.includes('t3-server'))
    .map((name) => path.join(dir, name));
}

/**
 * Point the user LaunchAgent at `bin/run-t3-server-with-cursor-skills`.
 * `launchctl kickstart -k` does not reload a patched plist; the job must be
 * bootout/bootstrap'd (or ProgramArguments already be the wrapper).
 */
export function ensureT3LaunchAgentCursorSkillImport({
  home,
  registerPath = REGISTER_PATH,
  plistPath,
  wrapperPath = WRAPPER_PATH,
} = {}) {
  const importFlag = nodeImportSpec(registerPath);
  const plists = plistPath ? [plistPath] : findT3ServerLaunchPlists(home ?? os.homedir());
  if (plists.length === 0) return {action: 'skip', reason: 'no-t3-server-plist'};
  const results = [];
  for (const filePath of plists) {
    let text;
    try {
      text = fs.readFileSync(filePath, 'utf8');
    } catch {
      results.push({action: 'skip', reason: 'unreadable', plistPath: filePath});
      continue;
    }
    let next = text;
    const originalExec = '<string>/usr/local/libexec/t3-server/run-t3-server</string>';
    const wrapperExec = `<string>${wrapperPath}</string>`;
    if (next.includes(originalExec)) {
      next = next.replace(originalExec, wrapperExec);
    }
    if (next === text) {
      if (text.includes(wrapperPath) || text.includes('run-t3-server-with-cursor-skills')) {
        results.push({action: 'unchanged', plistPath: filePath, wrapperPath, importFlag});
        continue;
      }
      results.push({action: 'refuse', reason: 'program-arguments-unparsed', plistPath: filePath});
      continue;
    }
    fs.writeFileSync(filePath, next);
    results.push({action: 'patched', plistPath: filePath, wrapperPath, importFlag});
  }
  const action = results.every((row) => row.action === 'unchanged')
    ? 'unchanged'
    : results.some((row) => row.action === 'patched')
      ? 'patched'
      : results[0]?.action ?? 'skip';
  return {action, importFlag, wrapperPath, plists: results};
}

/**
 * Reloads the LaunchAgent so ProgramArguments/env changes actually apply.
 * `kickstart -k` is not sufficient; it respawns the previously loaded job.
 */
export function reloadT3ServerLaunchAgent({
  home = os.homedir(),
  label = 'com.maxholden.t3-server',
} = {}) {
  const uid = typeof process.getuid === 'function' ? process.getuid() : null;
  if (uid == null) return {action: 'skip', reason: 'no-uid'};
  const domain = `gui/${uid}`;
  const job = `${domain}/${label}`;
  const plist = path.join(home, 'Library', 'LaunchAgents', `${label}.plist`);
  const bootout = spawnSync('launchctl', ['bootout', job], {encoding: 'utf8'});
  const bootstrap = spawnSync('launchctl', ['bootstrap', domain, plist], {encoding: 'utf8'});
  return {
    action: bootstrap.status === 0 ? 'reloaded' : 'failed',
    job,
    plist,
    bootout: {status: bootout.status, stderr: (bootout.stderr || '').trim()},
    bootstrap: {status: bootstrap.status, stderr: (bootstrap.stderr || '').trim()},
  };
}

export function afterRegistrySyncApply(options = {}) {
  const home = options.home ?? os.homedir();
  const projectRoot = options.projectRoot ?? null;
  const cacheDir = resolveT3CacheDir({cacheDir: options.cacheDir, home});
  const cache = injectT3CursorSkillCache({
    home,
    cwd: projectRoot || undefined,
    projectRoot: projectRoot || undefined,
    cacheDir,
  });
  const registerPath = options.registerPath ?? REGISTER_PATH;
  const runScriptPath =
    options.runScriptPath ??
    (path.resolve(home) === path.resolve(os.homedir())
      ? '/usr/local/libexec/t3-server/run-t3-server'
      : null);
  let loader = {action: 'skip', reason: 'non-live-home'};
  if (runScriptPath) {
    try {
      loader = ensureT3ServerCursorSkillImport({runScriptPath, registerPath});
    } catch (error) {
      loader = {action: 'skip', reason: error.message};
    }
  }
  const patchedDist = options.patchedDist ?? (path.resolve(home) === path.resolve(os.homedir())
    ? DEFAULT_PATCHED_T3_DIST
    : path.join(home, '.t3', 'hhpe-cursor-skills', 'node_modules', 't3', 'dist'));
  let patched = {action: 'skip', reason: 'non-live-home'};
  if (path.resolve(home) === path.resolve(os.homedir()) || options.sourceDist) {
    try {
      patched = materializePatchedT3Dist({
        sourceDist: options.sourceDist,
        destDist: patchedDist,
      });
    } catch (error) {
      patched = {action: 'error', reason: error.message};
    }
  }
  const launchAgent = ensureT3LaunchAgentCursorSkillImport({
    home,
    registerPath,
    plistPath: options.plistPath,
    wrapperPath: options.wrapperPath,
  });
  const reload = options.reloadT3 ? reloadT3ServerLaunchAgent({home, label: options.launchLabel}) : {action: 'skipped'};
  return {
    cache,
    loader,
    patched,
    launchAgent,
    reload,
    home,
    projectRoot,
  };
}

function parseArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--after-sync') values.afterSync = true;
    else if (argument === '--home') values.home = argv[++index];
    else if (argument === '--project-root') values.projectRoot = argv[++index];
    else if (argument === '--cache-dir') values.cacheDir = argv[++index];
    else if (argument === '--run-t3-server') values.runScriptPath = argv[++index];
    else if (argument === '--plist-path') values.plistPath = argv[++index];
    else if (argument === '--reload-t3') values.reloadT3 = true;
    else throw new Error(`unknown t3-cursor-skills option: ${argument}`);
  }
  return values;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const out = afterRegistrySyncApply(args);
    console.log(JSON.stringify(out, null, 2));
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    process.exitCode = 1;
  }
}
