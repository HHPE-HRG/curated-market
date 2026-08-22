#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const OPENCODE_SKILL_PROJECTION_RECORDS = [
  {capabilityId: 'hhpe-hrg/ast-grep', source: 'ast-grep', destination: 'ast-grep'},
  {capabilityId: 'hhpe-hrg/registry-health', source: 'registry-health', destination: 'registry-health'},
  {capabilityId: 'hhpe-hrg/stack-router', source: 'stack-router', destination: 'stack-router'},
  {capabilityId: 'hhpe-hrg/serena-guidance', source: 'serena-guidance', destination: 'serena-guidance'},
  {capabilityId: 'hhpe-hrg/context7-guidance', source: 'context7-guidance', destination: 'context7-guidance'},
  {capabilityId: 'hhpe-hrg/playwright-guidance', source: 'playwright-guidance', destination: 'playwright-guidance'},
  {capabilityId: 'hhpe-hrg/session-start', source: 'session-start', destination: 'session-start'},
];

function requireClosedProjectionMapping(projections) {
  for (const field of ['source', 'destination']) {
    const seen = new Set();
    for (const projection of projections) {
      const name = projection[field];
      if (
        typeof name !== 'string' ||
        name === '' ||
        name === '.' ||
        name === '..' ||
        path.basename(name) !== name ||
        name.includes('/') ||
        name.includes('\\')
      ) {
        throw new Error(`OpenCode skill ${field} must be a basename: ${name}`);
      }
      if (seen.has(name)) throw new Error(`duplicate OpenCode skill ${field}: ${name}`);
      seen.add(name);
    }
  }
}

requireClosedProjectionMapping(OPENCODE_SKILL_PROJECTION_RECORDS);
export const OPENCODE_SKILL_PROJECTIONS = Object.freeze(
  OPENCODE_SKILL_PROJECTION_RECORDS.map(projection => Object.freeze(projection)),
);

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

function existingParent(directory) {
  let current = path.dirname(directory);
  while (!fs.existsSync(current)) {
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return fs.realpathSync(current);
}

function contains(parent, child) {
  const relative = path.relative(parent, child);
  return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function requireRepositoryPath(root, target, role) {
  const trustedRoot = path.resolve(root);
  const absoluteTarget = path.resolve(target);
  if (!contains(trustedRoot, absoluteTarget)) throw new Error(`${role} is outside trusted repository root`);
  let current = trustedRoot;
  for (const component of path.relative(trustedRoot, absoluteTarget).split(path.sep)) {
    current = path.join(current, component);
    const stat = fs.lstatSync(current, {throwIfNoEntry: false});
    if (!stat) break;
    if (stat.isSymbolicLink()) throw new Error(`${role} path component is a symlink: ${current}`);
  }
}

function requireCanonicalRepositorySource(root, sourceRoot) {
  requireRepositoryPath(root, sourceRoot, 'canonical source');
  const physicalRoot = fs.realpathSync(path.resolve(root));
  const physicalSource = resolvedLocation(sourceRoot);
  if (!contains(physicalRoot, physicalSource)) {
    throw new Error('canonical source resolves outside trusted repository root');
  }
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
  return {source, output};
}

function requireCanonicalSkillRoot(source, name) {
  const stat = fs.lstatSync(source, {throwIfNoEntry: false});
  if (!stat?.isDirectory() || stat.isSymbolicLink()) {
    throw new Error(`missing canonical OpenCode skill: ${name}`);
  }
}

function snapshotCanonicalSkill(source) {
  const entries = [];
  const visit = (directory, prefix = '') => {
    fs.accessSync(directory, fs.constants.R_OK | fs.constants.X_OK);
    for (const child of fs.readdirSync(directory).sort()) {
      const file = path.join(directory, child);
      const relative = path.join(prefix, child);
      const entry = fs.lstatSync(file);
      if (entry.isDirectory()) {
        entries.push(Object.freeze({relative, type: 'directory'}));
        visit(file, relative);
      } else if (entry.isFile()) {
        fs.accessSync(file, fs.constants.R_OK);
        entries.push(Object.freeze({
          relative,
          type: 'file',
          bytes: fs.readFileSync(file).toString('base64'),
          executable: Boolean(entry.mode & 0o111),
        }));
      }
      else throw new Error(`unsupported canonical entry: ${file}`);
    }
  };
  visit(source);
  return Object.freeze(entries);
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

function materializeSnapshot(snapshot, destination) {
  fs.mkdirSync(destination, {recursive: true, mode: 0o755});
  fs.chmodSync(destination, 0o755);
  for (const entry of snapshot) {
    const target = path.join(destination, entry.relative);
    if (entry.type === 'directory') {
      fs.mkdirSync(target, {recursive: true, mode: 0o755});
      fs.chmodSync(target, 0o755);
    } else {
      fs.writeFileSync(target, Buffer.from(entry.bytes, 'base64'));
      fs.chmodSync(target, entry.executable ? 0o755 : 0o644);
    }
  }
}

function nodeIdentity(file) {
  const stat = fs.lstatSync(file, {throwIfNoEntry: false});
  return stat ? {exists: true, device: stat.dev, inode: stat.ino} : {exists: false};
}

function sameIdentity(left, right) {
  return left.exists === right.exists && (!left.exists || (left.device === right.device && left.inode === right.inode));
}

function validateOwnedOutputs(
  outputRoot,
  resolvedOutputRoot,
  skills,
  expectedOutputIdentity,
  expectedDestinationIdentities,
) {
  requireDirectoryRoot(outputRoot, 'OpenCode skills output root');
  if (resolvedLocation(outputRoot) !== resolvedOutputRoot) {
    throw new Error('OpenCode skills output root changed during generation');
  }
  if (expectedOutputIdentity && !sameIdentity(nodeIdentity(outputRoot), expectedOutputIdentity)) {
    throw new Error('OpenCode skills output root changed during generation');
  }
  for (const skill of skills) {
    if (!contains(resolvedOutputRoot, resolvedLocation(skill.destinationPath))) {
      throw new Error(`unsafe OpenCode skill destination: ${skill.destination}`);
    }
    requireSafeOwnedOutput(skill.destinationPath);
    const expected = expectedDestinationIdentities?.get(skill.destination);
    if (expected && !sameIdentity(nodeIdentity(skill.destinationPath), expected)) {
      throw new Error(`OpenCode skill destination changed during generation: ${skill.destination}`);
    }
  }
}

function stagedDifference(snapshot, stagedRoot) {
  const expected = new Map(snapshot.map(entry => [entry.relative, entry]));
  const actual = entries(stagedRoot);
  const paths = [...new Set([...expected.keys(), ...actual.keys()])].sort();
  for (const relative of paths) {
    const wanted = expected.get(relative);
    const found = actual.get(relative);
    if (!wanted || !found || wanted.type !== found.type) return relative;
    if (found.type === 'file' && wanted.bytes !== found.bytes.toString('base64')) return relative;
    if (found.type === 'file' && wanted.executable !== found.executable) return relative;
    if (found.type === 'symlink' || found.type === 'unsupported') return relative;
  }
}

function validateStagedSkill(stagingRoot, stagingIdentity, resolvedStagingRoot, skill, stagedIdentity) {
  if (!sameIdentity(nodeIdentity(stagingRoot), stagingIdentity)) {
    throw new Error('OpenCode staging root changed during generation');
  }
  const stagedPath = path.join(stagingRoot, skill.destination);
  if (!contains(resolvedStagingRoot, resolvedLocation(stagedPath))) {
    throw new Error(`staged OpenCode skill escapes staging root: ${skill.destination}`);
  }
  const stat = fs.lstatSync(stagedPath, {throwIfNoEntry: false});
  if (!stat?.isDirectory() || stat.isSymbolicLink() || !sameIdentity(nodeIdentity(stagedPath), stagedIdentity)) {
    throw new Error(`staged OpenCode skill changed during generation: ${skill.destination}`);
  }
  const difference = stagedDifference(skill.snapshot, stagedPath);
  if (difference !== undefined) {
    throw new Error(`staged OpenCode skill changed during generation: ${skill.destination}/${difference}`);
  }
}

function rollbackReplacements(records) {
  const errors = [];
  for (const record of [...records].reverse()) {
    try {
      if (record.installed) fs.rmSync(record.skill.destinationPath, {recursive: true, force: true});
      if (record.backedUp) fs.renameSync(record.backupPath, record.skill.destinationPath);
    } catch (error) {
      errors.push(error);
    }
  }
  return errors;
}

function findIdentity(root, identity) {
  const stat = fs.lstatSync(root, {throwIfNoEntry: false});
  if (!stat || stat.isSymbolicLink()) return;
  if (sameIdentity(nodeIdentity(root), identity)) return root;
  if (!stat.isDirectory()) return;
  for (const name of fs.readdirSync(root)) {
    const found = findIdentity(path.join(root, name), identity);
    if (found) return found;
  }
}

function cleanupStaging(stagingRoot, stagingIdentity, outputIdentity, searchRoot) {
  const currentIdentity = nodeIdentity(stagingRoot);
  if (sameIdentity(currentIdentity, stagingIdentity)) {
    fs.rmSync(stagingRoot, {recursive: true, force: true});
    return;
  }
  if (!outputIdentity.exists) return;
  const movedOutputRoot = findIdentity(searchRoot, outputIdentity);
  if (movedOutputRoot) {
    const movedStaging = path.join(movedOutputRoot, path.basename(stagingRoot));
    if (sameIdentity(nodeIdentity(movedStaging), stagingIdentity)) {
      fs.rmSync(movedStaging, {recursive: true, force: true});
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

export function syncOpencodeSkills(options = {}) {
  const root = options.root ?? REPOSITORY_ROOT;
  const defaultOutputRoot = checkedInSkillsRoot(root);
  const outputRoot = options.outputRoot ?? defaultOutputRoot;
  const sourceRoot = canonicalSkillsRoot(root);
  const normalizedOutputRoot = path.resolve(outputRoot);
  const trustedRoot = path.resolve(root);
  requireDirectoryRoot(sourceRoot, 'canonical OpenCode skills root');
  requireCanonicalRepositorySource(root, sourceRoot);
  if (normalizedOutputRoot === path.resolve(defaultOutputRoot)) {
    requireRepositoryPath(root, normalizedOutputRoot, 'OpenCode output');
  }
  const {source: resolvedSourceRoot, output: resolvedOutputRoot} = validateRoots(sourceRoot, normalizedOutputRoot);
  const skills = OPENCODE_SKILL_PROJECTIONS.map(projection => ({
    ...projection,
    sourcePath: path.join(sourceRoot, projection.source),
    destinationPath: path.join(normalizedOutputRoot, projection.destination),
  }));

  for (const skill of skills) {
    requireCanonicalSkillRoot(skill.sourcePath, skill.source);
    const resolvedSource = resolvedLocation(skill.sourcePath);
    if (!contains(resolvedSourceRoot, resolvedSource)) {
      throw new Error(`unsafe canonical OpenCode skill source: ${skill.source}`);
    }
    skill.snapshot = snapshotCanonicalSkill(skill.sourcePath);
  }
  validateOwnedOutputs(normalizedOutputRoot, resolvedOutputRoot, skills);
  let outputIdentity = nodeIdentity(normalizedOutputRoot);
  const destinationIdentities = new Map(
    skills.map(skill => [skill.destination, nodeIdentity(skill.destinationPath)]),
  );

  const stagingParent = outputIdentity.exists ? normalizedOutputRoot : existingParent(normalizedOutputRoot);
  const stagingRoot = fs.mkdtempSync(path.join(stagingParent, '.hhpe-opencode-stage-'));
  const stagingIdentity = nodeIdentity(stagingRoot);
  let preserveStaging = false;
  try {
    for (const skill of skills) materializeSnapshot(skill.snapshot, path.join(stagingRoot, skill.destination));
    const resolvedStagingRoot = resolvedLocation(stagingRoot);
    const stagedIdentities = new Map(
      skills.map(skill => [skill.destination, nodeIdentity(path.join(stagingRoot, skill.destination))]),
    );

    validateOwnedOutputs(
      normalizedOutputRoot,
      resolvedOutputRoot,
      skills,
      outputIdentity,
      destinationIdentities,
    );
    fs.mkdirSync(normalizedOutputRoot, {recursive: true, mode: 0o755});
    if (!outputIdentity.exists) outputIdentity = nodeIdentity(normalizedOutputRoot);
    if (stagingIdentity.device !== outputIdentity.device) {
      const error = new Error('OpenCode staging and destination parent are on different devices');
      error.code = 'EXDEV';
      throw error;
    }
    validateOwnedOutputs(
      normalizedOutputRoot,
      resolvedOutputRoot,
      skills,
      outputIdentity,
      destinationIdentities,
    );
    const backupsRoot = path.join(stagingRoot, 'backups');
    fs.mkdirSync(backupsRoot, {mode: 0o700});
    const records = [];
    try {
      for (const skill of skills) {
        validateOwnedOutputs(
          normalizedOutputRoot,
          resolvedOutputRoot,
          [skill],
          outputIdentity,
          destinationIdentities,
        );
        validateStagedSkill(
          stagingRoot,
          stagingIdentity,
          resolvedStagingRoot,
          skill,
          stagedIdentities.get(skill.destination),
        );
        const record = {
          skill,
          backupPath: path.join(backupsRoot, skill.destination),
          backedUp: false,
          installed: false,
        };
        records.push(record);
        if (fs.existsSync(skill.destinationPath)) {
          fs.renameSync(skill.destinationPath, record.backupPath);
          record.backedUp = true;
        }
        fs.renameSync(path.join(stagingRoot, skill.destination), skill.destinationPath);
        record.installed = true;
      }
    } catch (error) {
      const rollbackErrors = rollbackReplacements(records);
      if (rollbackErrors.length) {
        preserveStaging = true;
        throw new AggregateError(
          [error, ...rollbackErrors],
          `OpenCode skill replacement and rollback failed; preserved staging at ${stagingRoot}`,
        );
      }
      throw error;
    }
  } finally {
    if (!preserveStaging) {
      const cleanupSearchRoot = contains(trustedRoot, normalizedOutputRoot)
        ? trustedRoot
        : path.dirname(normalizedOutputRoot);
      cleanupStaging(
        stagingRoot,
        stagingIdentity,
        outputIdentity,
        cleanupSearchRoot,
      );
    }
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
  const sourceRoot = canonicalSkillsRoot(root);
  const normalizedOutputRoot = path.resolve(outputRoot);
  try {
    requireCanonicalRepositorySource(root, sourceRoot);
    if (normalizedOutputRoot === path.resolve(checkedInSkillsRoot(root))) {
      requireRepositoryPath(root, normalizedOutputRoot, 'OpenCode output');
    }
  } catch (error) {
    return {ok: false, differences: [error.message]};
  }
  return compareProjectionRoots(sourceRoot, 'source', normalizedOutputRoot);
}

export function checkOpencodeSkills({root = REPOSITORY_ROOT} = {}) {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hhpe-opencode-skills-'));
  try {
    syncOpencodeSkills({root, outputRoot: temporaryRoot});
    try {
      requireRepositoryPath(root, checkedInSkillsRoot(root), 'OpenCode output');
    } catch (error) {
      return {ok: false, differences: [error.message]};
    }
    return compareProjectionRoots(temporaryRoot, 'destination', checkedInSkillsRoot(root));
  } finally {
    fs.rmSync(temporaryRoot, {recursive: true, force: true});
  }
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url))) {
  const command = process.argv[2];
  if (process.argv.length === 3 && command === 'generate') {
    const result = syncOpencodeSkills();
    console.log(`generated ${result.destinations.length} project-local OpenCode skills`);
  } else if (process.argv.length === 3 && command === 'check') {
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
