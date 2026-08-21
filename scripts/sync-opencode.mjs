#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const OPENCODE_SKILL_PROJECTIONS = Object.freeze([
  {capabilityId: 'hhpe-hrg/ast-grep', source: 'ast-grep', destination: 'ast-grep'},
  {capabilityId: 'hhpe-hrg/registry-health', source: 'registry-health', destination: 'registry-health'},
  {capabilityId: 'hhpe-hrg/stack-router', source: 'stack-router', destination: 'stack-router'},
  {capabilityId: 'hhpe-hrg/serena-guidance', source: 'serena-guidance', destination: 'serena-guidance'},
  {capabilityId: 'hhpe-hrg/context7-guidance', source: 'context7-guidance', destination: 'context7-guidance'},
  {capabilityId: 'hhpe-hrg/playwright-guidance', source: 'playwright-guidance', destination: 'playwright-guidance'},
  {capabilityId: 'hhpe-hrg/session-start', source: 'session-start', destination: 'session-start'},
]);

const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const canonicalSkillsRoot = root => path.join(root, 'registry/overlays/wrappers');
const checkedInSkillsRoot = root => path.join(root, '.opencode/skills');

function resolvedLocation(file) {
  const absolute = path.resolve(file);
  const missing = [];
  let existing = absolute;
  while (!fs.existsSync(existing)) {
    const parent = path.dirname(existing);
    if (parent === existing) break;
    missing.unshift(path.basename(existing));
    existing = parent;
  }
  return path.join(fs.realpathSync(existing), ...missing);
}

function contains(parent, child) {
  const relative = path.relative(parent, child);
  return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function requireDirectoryRoot(root, role) {
  const stat = fs.lstatSync(root, {throwIfNoEntry: false});
  if (!stat) {
    if (role === 'canonical OpenCode skills root') throw new Error(`${role} is missing`);
    return;
  }
  if (stat.isSymbolicLink()) throw new Error(`${role} is a symlink`);
  if (!stat.isDirectory()) throw new Error(`${role} is not a directory`);
}

function validateRoots(sourceRoot, outputRoot) {
  requireDirectoryRoot(sourceRoot, 'canonical OpenCode skills root');
  requireDirectoryRoot(outputRoot, 'OpenCode skills output root');
  const source = resolvedLocation(sourceRoot);
  const output = resolvedLocation(outputRoot);
  if (output === path.parse(output).root) throw new Error('OpenCode skills output root cannot be a filesystem root');
  if (source === output || contains(source, output) || contains(output, source)) {
    throw new Error('canonical source and output roots overlap');
  }
  return output;
}

function requireCanonicalSkill(source, name) {
  const stat = fs.lstatSync(source, {throwIfNoEntry: false});
  if (!stat?.isDirectory() || stat.isSymbolicLink()) {
    throw new Error(`missing canonical OpenCode skill: ${name}`);
  }
  const visit = directory => {
    fs.accessSync(directory, fs.constants.R_OK | fs.constants.X_OK);
    for (const name of fs.readdirSync(directory).sort()) {
      const file = path.join(directory, name);
      const entry = fs.lstatSync(file);
      if (entry.isDirectory()) visit(file);
      else if (entry.isFile()) fs.accessSync(file, fs.constants.R_OK);
      else throw new Error(`unsupported canonical entry: ${file}`);
    }
  };
  visit(source);
}

function requireSafeOwnedOutput(destination) {
  const root = fs.lstatSync(destination, {throwIfNoEntry: false});
  if (!root) return;
  const visit = file => {
    const stat = fs.lstatSync(file);
    if (stat.isSymbolicLink() || (!stat.isDirectory() && !stat.isFile())) {
      throw new Error(`unsupported OpenCode output entry: ${file}`);
    }
    if (stat.isDirectory()) {
      for (const name of fs.readdirSync(file).sort()) visit(path.join(file, name));
    }
  };
  visit(destination);
}

function copyCanonicalTree(source, destination) {
  fs.mkdirSync(destination, {recursive: true, mode: 0o755});
  fs.chmodSync(destination, 0o755);
  for (const name of fs.readdirSync(source).sort()) {
    const from = path.join(source, name);
    const to = path.join(destination, name);
    const stat = fs.lstatSync(from);
    if (stat.isDirectory()) copyCanonicalTree(from, to);
    else {
      fs.copyFileSync(from, to);
      fs.chmodSync(to, stat.mode & 0o111 ? 0o755 : 0o644);
    }
  }
}

function entries(directory) {
  const result = new Map();
  const visit = (current, prefix = '') => {
    for (const name of fs.readdirSync(current).sort()) {
      const relative = path.join(prefix, name);
      const file = path.join(current, name);
      const stat = fs.lstatSync(file);
      if (stat.isDirectory()) {
        result.set(relative, {type: 'directory'});
        visit(file, relative);
      } else if (stat.isSymbolicLink()) {
        result.set(relative, {type: 'symlink', target: fs.readlinkSync(file)});
      } else if (stat.isFile()) {
        result.set(relative, {
          type: 'file',
          bytes: fs.readFileSync(file),
          executable: Boolean(stat.mode & 0o111),
        });
      } else {
        result.set(relative, {type: 'unsupported'});
      }
    }
  };
  visit(directory);
  return result;
}

function validateContainer(root, role, differences) {
  const stat = fs.lstatSync(root, {throwIfNoEntry: false});
  if (!stat) differences.push(`${role} root missing`);
  else if (stat.isSymbolicLink()) differences.push(`${role} root is a symlink`);
  else if (!stat.isDirectory()) differences.push(`${role} root is not a directory`);
  return Boolean(stat?.isDirectory() && !stat.isSymbolicLink());
}

function validateTreeRoot(root, role, skill, differences) {
  const stat = fs.lstatSync(root, {throwIfNoEntry: false});
  if (!stat) differences.push(`${skill}: ${role} root missing`);
  else if (stat.isSymbolicLink()) differences.push(`${skill}: ${role} root is a symlink`);
  else if (!stat.isDirectory()) differences.push(`${skill}: ${role} root is not a directory`);
  return Boolean(stat?.isDirectory() && !stat.isSymbolicLink());
}

function compareTrees(expectedRoot, actualRoot, skill, differences) {
  const expectedValid = validateTreeRoot(expectedRoot, 'expected', skill, differences);
  const actualValid = validateTreeRoot(actualRoot, 'generated', skill, differences);
  if (!expectedValid || !actualValid) return;
  const expected = entries(expectedRoot);
  const actual = entries(actualRoot);
  const paths = [...new Set([...expected.keys(), ...actual.keys()])].sort();
  for (const relative of paths) {
    const wanted = expected.get(relative);
    const found = actual.get(relative);
    const label = `${skill}/${relative}`;
    if (!wanted) differences.push(`${label}: unexpected generated entry`);
    else if (!found) differences.push(`${label}: missing generated entry`);
    else if (wanted.type !== found.type) differences.push(`${label}: expected ${wanted.type}, found ${found.type}`);
    else if (found.type === 'symlink') differences.push(`${label}: generated symlink is not allowed`);
    else if (found.type === 'file' && !wanted.bytes.equals(found.bytes)) differences.push(`${label}: content differs`);
    else if (found.type === 'file' && wanted.executable !== found.executable) differences.push(`${label}: executable bit differs`);
    else if (found.type === 'unsupported') differences.push(`${label}: unsupported generated entry`);
  }
}

function compareProjectionRoots(expectedRoot, expectedKey, actualRoot) {
  const differences = [];
  const expectedValid = validateContainer(expectedRoot, 'expected OpenCode skills', differences);
  const actualValid = validateContainer(actualRoot, 'generated OpenCode skills', differences);
  if (!expectedValid || !actualValid) return {ok: false, differences};
  for (const projection of OPENCODE_SKILL_PROJECTIONS) {
    compareTrees(
      path.join(expectedRoot, projection[expectedKey]),
      path.join(actualRoot, projection.destination),
      projection.destination,
      differences,
    );
  }
  return {ok: differences.length === 0, differences};
}

export function syncOpencodeSkills({
  root = REPOSITORY_ROOT,
  outputRoot = checkedInSkillsRoot(root),
} = {}) {
  const sourceRoot = canonicalSkillsRoot(root);
  const resolvedOutputRoot = validateRoots(sourceRoot, outputRoot);
  const skills = OPENCODE_SKILL_PROJECTIONS.map(projection => ({
    ...projection,
    sourcePath: path.join(sourceRoot, projection.source),
    destinationPath: path.join(outputRoot, projection.destination),
  }));

  for (const skill of skills) requireCanonicalSkill(skill.sourcePath, skill.source);
  for (const skill of skills) {
    if (!contains(resolvedOutputRoot, resolvedLocation(skill.destinationPath))) {
      throw new Error(`unsafe OpenCode skill destination: ${skill.destination}`);
    }
    requireSafeOwnedOutput(skill.destinationPath);
  }

  fs.mkdirSync(outputRoot, {recursive: true, mode: 0o755});
  for (const skill of skills) {
    fs.rmSync(skill.destinationPath, {recursive: true, force: true});
    copyCanonicalTree(skill.sourcePath, skill.destinationPath);
  }
  return {
    capabilities: skills.map(skill => skill.capabilityId),
    destinations: skills.map(skill => skill.destination),
  };
}

export function compareOpencodeSkills({
  root = REPOSITORY_ROOT,
  outputRoot = checkedInSkillsRoot(root),
} = {}) {
  return compareProjectionRoots(canonicalSkillsRoot(root), 'source', outputRoot);
}

export function checkOpencodeSkills({root = REPOSITORY_ROOT} = {}) {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hhpe-opencode-skills-'));
  try {
    syncOpencodeSkills({root, outputRoot: temporaryRoot});
    return compareProjectionRoots(temporaryRoot, 'destination', checkedInSkillsRoot(root));
  } finally {
    fs.rmSync(temporaryRoot, {recursive: true, force: true});
  }
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url))) {
  const command = process.argv[2] || 'generate';
  if (command === 'generate') {
    const result = syncOpencodeSkills();
    console.log(`generated ${result.destinations.length} project-local OpenCode skills`);
  } else if (command === 'check') {
    const result = checkOpencodeSkills();
    if (!result.ok) {
      console.error(result.differences.join('\n'));
      process.exitCode = 1;
    } else {
      console.log('checked-in project-local OpenCode skills match isolated generation');
    }
  } else {
    console.error('usage: sync-opencode.mjs [generate|check]');
    process.exitCode = 2;
  }
}
