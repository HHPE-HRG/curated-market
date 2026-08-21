#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

export const CODEX_WRAPPER_PROJECTIONS = Object.freeze([
  'ast-grep',
  'registry-health',
  'stack-router',
  'serena-guidance',
  'context7-guidance',
  'playwright-guidance',
  'session-start',
]);

const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const canonicalWrappersRoot = root => path.join(root, 'registry/overlays/wrappers');
const codexSkillsRoot = root => path.join(root, 'registry/adapters/codex/marketplace/plugins/hhpe-registry/skills');

function copyCanonicalTree(source, destination) {
  fs.mkdirSync(destination, {recursive: true, mode: 0o755});
  fs.chmodSync(destination, 0o755);
  for (const entry of fs.readdirSync(source, {withFileTypes: true})) {
    const from = path.join(source, entry.name);
    const to = path.join(destination, entry.name);
    if (entry.isDirectory()) copyCanonicalTree(from, to);
    else if (entry.isFile()) {
      fs.copyFileSync(from, to);
      fs.chmodSync(to, fs.statSync(from).mode & 0o111 ? 0o755 : 0o644);
    } else {
      throw new Error(`unsupported canonical entry: ${from}`);
    }
  }
}

function entries(directory) {
  if (!fs.existsSync(directory)) return new Map();
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
        result.set(relative, {type: 'file', bytes: fs.readFileSync(file), executable: Boolean(stat.mode & 0o111)});
      } else {
        result.set(relative, {type: 'unsupported'});
      }
    }
  };
  visit(directory);
  return result;
}

function compareTrees(expectedRoot, actualRoot, wrapper, differences) {
  const expected = entries(expectedRoot);
  const actual = entries(actualRoot);
  const paths = [...new Set([...expected.keys(), ...actual.keys()])].sort();
  for (const relative of paths) {
    const wanted = expected.get(relative);
    const found = actual.get(relative);
    const label = `${wrapper}/${relative}`;
    if (!wanted) differences.push(`${label}: unexpected generated entry`);
    else if (!found) differences.push(`${label}: missing generated entry`);
    else if (wanted.type !== found.type) differences.push(`${label}: expected ${wanted.type}, found ${found.type}`);
    else if (found.type === 'symlink') differences.push(`${label}: generated symlink is not allowed`);
    else if (found.type === 'file' && !wanted.bytes.equals(found.bytes)) differences.push(`${label}: content differs`);
    else if (found.type === 'file' && wanted.executable !== found.executable) differences.push(`${label}: executable bit differs`);
    else if (found.type === 'unsupported') differences.push(`${label}: unsupported generated entry`);
  }
}

function compareProjectionRoots(expectedRoot, actualRoot) {
  const differences = [];
  for (const name of CODEX_WRAPPER_PROJECTIONS) {
    compareTrees(path.join(expectedRoot, name), path.join(actualRoot, name), name, differences);
  }
  return {ok: differences.length === 0, differences};
}

export function syncAdapters({root = REPOSITORY_ROOT, outputRoot = codexSkillsRoot(root)} = {}) {
  for (const name of CODEX_WRAPPER_PROJECTIONS) {
    const source = path.join(canonicalWrappersRoot(root), name);
    const destination = path.join(outputRoot, name);
    if (!fs.statSync(source, {throwIfNoEntry: false})?.isDirectory()) {
      throw new Error(`missing canonical Codex wrapper: ${name}`);
    }
    fs.rmSync(destination, {recursive: true, force: true});
    copyCanonicalTree(source, destination);
  }
  return {wrappers: [...CODEX_WRAPPER_PROJECTIONS]};
}

export function compareAdapterProjection({root = REPOSITORY_ROOT, outputRoot = codexSkillsRoot(root)} = {}) {
  return compareProjectionRoots(canonicalWrappersRoot(root), outputRoot);
}

export function checkAdapters({root = REPOSITORY_ROOT} = {}) {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hhpe-codex-adapters-'));
  try {
    syncAdapters({root, outputRoot: temporaryRoot});
    return compareProjectionRoots(temporaryRoot, codexSkillsRoot(root));
  } finally {
    fs.rmSync(temporaryRoot, {recursive: true, force: true});
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const command = process.argv[2] || 'generate';
  if (command === 'generate') {
    syncAdapters();
    console.log('generated Codex HHPE adapter skills from canonical overlays');
  } else if (command === 'check') {
    const result = checkAdapters();
    if (!result.ok) {
      console.error(result.differences.join('\n'));
      process.exitCode = 1;
    } else {
      console.log('checked-in Codex HHPE adapter skills match isolated generation');
    }
  } else {
    console.error('usage: sync-adapters.mjs [generate|check]');
    process.exitCode = 2;
  }
}
