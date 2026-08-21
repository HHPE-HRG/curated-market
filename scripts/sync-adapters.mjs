#!/usr/bin/env node
import fs from 'node:fs';
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
  fs.cpSync(source, destination, {recursive: true, dereference: true});
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

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  syncAdapters();
  console.log('generated Codex HHPE adapter skills from canonical overlays');
}
