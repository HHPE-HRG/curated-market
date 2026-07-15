#!/usr/bin/env node
/**
 * Cursor Team Marketplace projection for curated-market.
 *
 * Produces a GitHub-importable layout:
 *   .cursor-plugin/marketplace.json
 *   plugins/<name>/.cursor-plugin/plugin.json (+ skills/…)
 *
 * Vendor plugin trees are materialized (no absolute symlinks) so a fresh clone
 * is Dashboard-import ready without registry/packages/ on disk.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const ROOT = path.resolve(process.env.HHPE_HRG_HOME || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
const MANIFESTS = path.join(ROOT, 'registry/manifests');
const PLUGINS_ROOT = path.join(ROOT, 'plugins');
const MARKETPLACE_PATH = path.join(ROOT, '.cursor-plugin/marketplace.json');
const OVERLAYS = path.join(ROOT, 'registry/overlays/wrappers');
const PIN_FILE = '.hhpe-pin.json';

const EXCLUDE_DIR_NAMES = new Set([
  '.git', 'node_modules', 'tests', 'benchmarks', 'evals', 'dist', '.github',
  '.claude-plugin', '.codex-plugin', '.agents', '.kimi-plugin', '.devin-plugin',
  '.agy', '.opencode',
]);

/** Skill-repository packages projected as Cursor plugins (plus hhpe-registry). */
export const VENDOR_PLUGIN_IDS = [
  'compound-engineering',
  'superpowers',
  'ponytail',
  'caveman',
  'trailofbits',
];

const HHPE_SKILLS = [
  'ast-grep',
  'registry-health',
  'stack-router',
  'serena-guidance',
  'context7-guidance',
  'playwright-guidance',
  'session-start',
];

const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeJson = (file, value) => {
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
};
const exists = p => {
  try { fs.lstatSync(p); return true; } catch { return false; }
};

function packageById(packageId) {
  const packages = readJson(path.join(MANIFESTS, 'packages.lock.yaml')).packages;
  const pkg = packages.find(p => p.package_id === packageId);
  if (!pkg) throw new Error(`missing lock entry for ${packageId}`);
  return pkg;
}

function packageDir(pkg) {
  return path.join(ROOT, pkg.package_root);
}

function copyTreeFiltered(src, dst) {
  fs.mkdirSync(dst, {recursive: true});
  for (const entry of fs.readdirSync(src, {withFileTypes: true})) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    if (entry.isDirectory() && EXCLUDE_DIR_NAMES.has(entry.name)) continue;
    const from = path.join(src, entry.name);
    const to = path.join(dst, entry.name);
    if (entry.isSymbolicLink()) {
      const target = fs.readlinkSync(from);
      if (path.isAbsolute(target)) {
        // Materialize absolute links instead of preserving machine-local targets.
        const real = fs.realpathSync(from);
        const st = fs.statSync(real);
        if (st.isDirectory()) copyTreeFiltered(real, to);
        else {
          fs.mkdirSync(path.dirname(to), {recursive: true});
          fs.copyFileSync(real, to);
        }
      } else {
        fs.symlinkSync(target, to);
      }
      continue;
    }
    if (entry.isDirectory()) copyTreeFiltered(from, to);
    else {
      fs.mkdirSync(path.dirname(to), {recursive: true});
      fs.copyFileSync(from, to);
    }
  }
}

function writePin(pluginDir, pkg) {
  writeJson(path.join(pluginDir, PIN_FILE), {
    package_id: pkg.package_id,
    revision: pkg.revision.value,
    repository: pkg.repository,
    projected_at: new Date().toISOString(),
  });
}

function writeJsonWritable(file, value) {
  fs.mkdirSync(path.dirname(file), {recursive: true});
  if (exists(file)) fs.chmodSync(file, 0o644);
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function ensureCursorPluginManifest(pluginDir, {name, description, version, author, extra = {}}) {
  const manifestDir = path.join(pluginDir, '.cursor-plugin');
  const manifestPath = path.join(manifestDir, 'plugin.json');
  if (exists(manifestPath)) {
    const existing = readJson(manifestPath);
    if (existing.name !== name) {
      existing.name = name;
      writeJsonWritable(manifestPath, existing);
    }
    return existing;
  }
  const manifest = {
    name,
    description,
    version: version || '0.1.0',
    author: typeof author === 'string' ? {name: author} : (author || {name: 'HHPE HRG'}),
    ...extra,
  };
  writeJsonWritable(manifestPath, manifest);
  return manifest;
}

function readUpstreamMeta(src) {
  const pkgJson = path.join(src, 'package.json');
  if (exists(pkgJson)) {
    const j = readJson(pkgJson);
    return {
      version: j.version || '0.1.0',
      description: j.description || '',
      author: j.author || 'upstream',
    };
  }
  return {version: '0.1.0', description: '', author: 'upstream'};
}

function projectVendorPackage(packageId) {
  const pkg = packageById(packageId);
  const src = packageDir(pkg);
  if (!exists(src)) throw new Error(`package tree missing for ${packageId}: ${src} (run registry package materialize first)`);
  const dest = path.join(PLUGINS_ROOT, packageId);
  fs.rmSync(dest, {recursive: true, force: true});

  if (packageId === 'trailofbits') {
    projectTrailofbits(src, dest, pkg);
  } else {
    copyTreeFiltered(src, dest);
    // Drop nested Cursor marketplace manifests so Team import uses the root catalog only.
    const nestedMarket = path.join(dest, '.cursor-plugin/marketplace.json');
    if (exists(nestedMarket)) fs.rmSync(nestedMarket, {force: true});
    const meta = readUpstreamMeta(src);
    const destPlugin = path.join(dest, '.cursor-plugin/plugin.json');
    if (!exists(destPlugin)) {
      ensureCursorPluginManifest(dest, {
        name: packageId,
        description: meta.description || `${packageId} skills from curated-market`,
        version: meta.version,
        author: meta.author,
        extra: {
          skills: './skills/',
          ...(exists(path.join(dest, 'commands')) ? {commands: './commands/'} : {}),
          ...(exists(path.join(dest, 'agents')) ? {agents: './agents/'} : {}),
        },
      });
    } else {
      // Normalize name to the marketplace plugin id when upstream differs.
      ensureCursorPluginManifest(dest, {
        name: packageId,
        description: meta.description,
        version: meta.version,
        author: meta.author,
      });
    }
  }
  writePin(dest, pkg);
  return {name: packageId, path: dest};
}

function projectTrailofbits(src, dest, pkg) {
  fs.mkdirSync(path.join(dest, 'skills'), {recursive: true});
  const license = path.join(src, 'LICENSE');
  if (exists(license)) fs.copyFileSync(license, path.join(dest, 'LICENSE'));
  const readme = path.join(src, 'README.md');
  if (exists(readme)) fs.copyFileSync(readme, path.join(dest, 'README.md'));

  const used = new Set();
  const walk = dir => {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '.git' || entry.name === 'node_modules') continue;
        walk(full);
      } else if (entry.name === 'SKILL.md') {
        const skillDir = path.dirname(full);
        let name = path.basename(skillDir);
        if (used.has(name)) {
          const parent = path.basename(path.dirname(path.dirname(skillDir)));
          name = `${parent}-${name}`;
        }
        used.add(name);
        const target = path.join(dest, 'skills', name);
        fs.cpSync(skillDir, target, {recursive: true, dereference: true});
      }
    }
  };
  walk(src);

  ensureCursorPluginManifest(dest, {
    name: 'trailofbits',
    description: 'Trail of Bits security and review skills (aggregated Cursor projection)',
    version: '1.0.0',
    author: {name: 'Trail of Bits'},
    extra: {
      skills: './skills/',
      repository: pkg.repository,
      license: 'MIT',
      keywords: ['security', 'trailofbits', 'review'],
    },
  });
}

function projectHhpeRegistry() {
  const dest = path.join(PLUGINS_ROOT, 'hhpe-registry');
  fs.rmSync(dest, {recursive: true, force: true});
  const skillsDest = path.join(dest, 'skills');
  fs.mkdirSync(skillsDest, {recursive: true});
  for (const name of HHPE_SKILLS) {
    const from = path.join(OVERLAYS, name);
    if (!exists(from)) throw new Error(`missing overlay skill ${name}`);
    fs.cpSync(from, path.join(skillsDest, name), {recursive: true, dereference: true});
  }
  ensureCursorPluginManifest(dest, {
    name: 'hhpe-registry',
    description: 'HHPE registry routing, health, specialist guidance, and session-start policy',
    version: '0.1.0',
    author: {name: 'HHPE HRG'},
    extra: {
      skills: './skills/',
      license: 'Proprietary',
      keywords: ['hhpe', 'registry', 'routing'],
    },
  });
  writeJson(path.join(dest, PIN_FILE), {
    package_id: 'hhpe-overlays',
    revision: 'overlay',
    source: 'registry/overlays/wrappers',
    projected_at: new Date().toISOString(),
  });
  return {name: 'hhpe-registry', path: dest};
}

function marketplaceDocument(pluginNames) {
  return {
    name: 'hhpe-curated-market',
    owner: {
      name: 'HHPE-HRG',
    },
    metadata: {
      description: 'Private HHPE curated skills marketplace (commit-pinned vendors + HHPE overlays)',
      version: '1.0.0',
      pluginRoot: 'plugins',
    },
    plugins: pluginNames.map(name => ({
      name,
      source: name,
      description: pluginDescription(name),
    })),
  };
}

function pluginDescription(name) {
  const descriptions = {
    'compound-engineering': 'Brainstorm, plan, debug, review, and compound learnings with AI agents',
    superpowers: 'Core skills library: TDD, debugging, collaboration patterns, and proven techniques',
    ponytail: 'Lazy senior-dev mode skills for AI agents',
    caveman: 'Ultra-compressed communication mode skills',
    trailofbits: 'Trail of Bits security and review skills',
    'hhpe-registry': 'HHPE registry routing, health, and specialist guidance skills',
  };
  return descriptions[name] || name;
}

/**
 * Materialize root Cursor marketplace projection from locked packages + overlays.
 *
 * @returns {{plugins: string[], marketplacePath: string}}
 */
export function projectCursorMarketplace() {
  fs.mkdirSync(PLUGINS_ROOT, {recursive: true});
  const projected = [];
  for (const id of VENDOR_PLUGIN_IDS) projected.push(projectVendorPackage(id).name);
  projected.push(projectHhpeRegistry().name);

  // Remove stale plugin dirs not in the catalog.
  for (const entry of fs.readdirSync(PLUGINS_ROOT, {withFileTypes: true})) {
    if (!entry.isDirectory()) continue;
    if (!projected.includes(entry.name)) {
      fs.rmSync(path.join(PLUGINS_ROOT, entry.name), {recursive: true, force: true});
    }
  }

  writeJson(MARKETPLACE_PATH, marketplaceDocument(projected));
  writeJson(path.join(ROOT, 'registry/adapters/cursor/adapter.json'), {
    mode: 'cursor-team-marketplace',
    marketplace: '.cursor-plugin/marketplace.json',
    plugin_root: 'plugins',
    preserve: ['settings', 'rules', 'mcp', 'agents', 'plugins'],
    reload: 'window-reload',
    note: 'Import HHPE-HRG/curated-market as a Cursor Team Marketplace; Auto Refresh via Cursor GitHub App.',
  });
  return {plugins: projected, marketplacePath: MARKETPLACE_PATH};
}

function collectAbsoluteSymlinks(dir, acc = []) {
  if (!exists(dir)) return acc;
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const full = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) {
      const target = fs.readlinkSync(full);
      if (path.isAbsolute(target)) acc.push({path: full, target});
      continue;
    }
    if (entry.isDirectory()) collectAbsoluteSymlinks(full, acc);
  }
  return acc;
}

function walkFiles(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const full = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) walkFiles(full, acc);
    else acc.push(full);
  }
  return acc;
}

/**
 * Validate the committed Cursor marketplace projection (import-ready gate).
 *
 * @returns {{status: 'PASS'|'FAIL', errors: string[], plugins: string[]}}
 */
export function validateCursorMarketplace() {
  const errors = [];
  if (!exists(MARKETPLACE_PATH)) {
    return {status: 'FAIL', errors: ['missing .cursor-plugin/marketplace.json'], plugins: []};
  }
  let market;
  try { market = readJson(MARKETPLACE_PATH); }
  catch (e) { return {status: 'FAIL', errors: [`invalid marketplace.json: ${e.message}`], plugins: []}; }

  if (market.name !== 'hhpe-curated-market') errors.push(`marketplace name must be hhpe-curated-market (got ${market.name})`);
  if (!market.owner?.name) errors.push('marketplace.owner.name required');
  if (!Array.isArray(market.plugins) || market.plugins.length === 0) errors.push('marketplace.plugins must be a non-empty array');

  const pluginRoot = market.metadata?.pluginRoot
    ? path.join(ROOT, market.metadata.pluginRoot)
    : ROOT;
  const expected = new Set([...VENDOR_PLUGIN_IDS, 'hhpe-registry']);
  const listed = new Set();

  for (const entry of market.plugins || []) {
    if (!entry.name || !/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/.test(entry.name)) {
      errors.push(`invalid plugin name: ${entry.name}`);
      continue;
    }
    listed.add(entry.name);
    const source = typeof entry.source === 'string' ? entry.source : entry.source?.path;
    if (!source) { errors.push(`missing source for ${entry.name}`); continue; }
    const pluginDir = path.resolve(pluginRoot, source);
    if (!pluginDir.startsWith(path.resolve(pluginRoot) + path.sep) && pluginDir !== path.resolve(pluginRoot)) {
      errors.push(`plugin source escapes pluginRoot: ${entry.name}`);
      continue;
    }
    const manifest = path.join(pluginDir, '.cursor-plugin/plugin.json');
    if (!exists(manifest)) { errors.push(`missing plugin.json for ${entry.name}`); continue; }
    try {
      const pj = readJson(manifest);
      if (pj.name !== entry.name) errors.push(`plugin.json name mismatch for ${entry.name}: ${pj.name}`);
    } catch (e) {
      errors.push(`invalid plugin.json for ${entry.name}: ${e.message}`);
    }
    const skillsDir = path.join(pluginDir, 'skills');
    if (!exists(skillsDir)) errors.push(`missing skills/ for ${entry.name}`);
    else {
      const skillCount = fs.readdirSync(skillsDir, {withFileTypes: true}).filter(e => e.isDirectory()).length;
      if (skillCount < 1) errors.push(`no skill directories under ${entry.name}/skills`);
    }
    const absLinks = collectAbsoluteSymlinks(pluginDir);
    for (const link of absLinks) {
      errors.push(`absolute symlink in projection: ${path.relative(ROOT, link.path)} -> ${link.target}`);
    }
  }

  for (const name of expected) {
    if (!listed.has(name)) errors.push(`marketplace missing plugin ${name}`);
  }

  // HHPE overlays must match projected hhpe-registry skills (always in git).
  for (const name of HHPE_SKILLS) {
    const src = path.join(OVERLAYS, name);
    const dst = path.join(pluginRoot, 'hhpe-registry/skills', name);
    if (!exists(src)) { errors.push(`missing overlay ${name}`); continue; }
    if (!exists(dst)) { errors.push(`missing projected hhpe skill ${name}`); continue; }
    for (const file of walkFiles(src)) {
      const rel = path.relative(src, file);
      const a = fs.readFileSync(file);
      const bPath = path.join(dst, rel);
      if (!exists(bPath)) { errors.push(`hhpe-registry missing ${name}/${rel}`); continue; }
      if (!a.equals(fs.readFileSync(bPath))) errors.push(`hhpe-registry stale ${name}/${rel}`);
    }
  }

  // When vendor packages are materialized locally, pin must match lock.
  for (const id of VENDOR_PLUGIN_IDS) {
    let pkg;
    try { pkg = packageById(id); } catch (e) { errors.push(e.message); continue; }
    const pinPath = path.join(pluginRoot, id, PIN_FILE);
    if (!exists(pinPath)) { errors.push(`missing ${id}/${PIN_FILE}`); continue; }
    const pin = readJson(pinPath);
    if (pin.revision !== pkg.revision.value) {
      errors.push(`stale pin for ${id}: projection ${pin.revision} != lock ${pkg.revision.value}`);
    }
    const src = packageDir(pkg);
    if (exists(src) && id !== 'trailofbits') {
      // Spot-check: at least one SKILL.md from upstream exists in projection.
      const upstreamSkills = path.join(src, 'skills');
      const projectedSkills = path.join(pluginRoot, id, 'skills');
      if (exists(upstreamSkills) && exists(projectedSkills)) {
        const sample = fs.readdirSync(upstreamSkills, {withFileTypes: true}).find(e => e.isDirectory());
        if (sample && !exists(path.join(projectedSkills, sample.name, 'SKILL.md'))) {
          errors.push(`projection missing sample skill ${id}/${sample.name}`);
        }
      }
    }
  }

  return {
    status: errors.length ? 'FAIL' : 'PASS',
    errors,
    plugins: [...listed],
  };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const cmd = process.argv[2] || 'project';
  if (cmd === 'validate') {
    const result = validateCursorMarketplace();
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.status === 'PASS' ? 0 : 1);
  }
  const result = projectCursorMarketplace();
  const check = validateCursorMarketplace();
  console.log(JSON.stringify({projected: result, validate: check}, null, 2));
  process.exit(check.status === 'PASS' ? 0 : 1);
}
