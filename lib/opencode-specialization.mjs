import fs from 'node:fs';
import path from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {fileURLToPath} from 'node:url';

const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const deepFreeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
};

export const APPROVED_OPENCODE_ONLY_POLICY = deepFreeze({
  schema_version: 1,
  specialization_id: 'opencode_only',
  agent_runtime: 'opencode',
  personalization_target: 'opencode',
  opencode_runtime: {
    minimum: '1.18.19',
    maximum_exclusive: '2.0.0',
  },
  provider_bindings: [
    {
      provider_id: 'openai',
      auth_realization: 'chatgpt-plus-pro-oauth',
    },
    {
      provider_id: 'cursor',
      auth_realization: 'browser-oauth',
      package: {
        name: 'cursor-opencode-provider',
        version: '0.6.3',
        upstream_commit: '7c474be70898cd69defc174eca4071c3b57e6e48',
        npm_integrity: 'sha512-G5eQiYvLM5gKaKvnWzkBEv+8VzEL78zfbY+ui5u36gI9ukJW+3DmIW0OR6tqa6RvuratNkwjpnI2MAijiPSY1w==',
      },
    },
  ],
  personalization_paths_bypassed: [
    'codex-direct',
    'cursor-direct',
    'opencode-global-home',
  ],
});

const repositoryPath = (root, ...segments) => {
  const base = path.resolve(root);
  const candidate = path.resolve(base, ...segments);
  if (candidate !== base && !candidate.startsWith(`${base}${path.sep}`)) throw new Error('path escapes repository root');
  return candidate;
};

const existingRepositoryPath = (root, ...segments) => {
  const candidate = repositoryPath(root, ...segments);
  try {
    fs.lstatSync(candidate);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
  const base = fs.realpathSync.native(path.resolve(root));
  const resolved = fs.realpathSync.native(candidate);
  if (resolved !== base && !resolved.startsWith(`${base}${path.sep}`)) throw new Error('path escapes repository root');
  return candidate;
};

const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));

const readAgent = file => {
  const body = fs.readFileSync(file, 'utf8');
  const match = body.match(/^---\n([\s\S]*?)\n---\n?/);
  const frontmatter = match ? match[1] : null;
  return {frontmatter, body: match ? body.slice(match[0].length) : body};
};

export function readOpencodeOnlyFiles({root = REPOSITORY_ROOT} = {}) {
  const specializationPath = existingRepositoryPath(root, 'registry', 'manifests', 'specialization.yaml');
  const projectConfigPath = existingRepositoryPath(root, 'opencode.json');
  const agentsPath = existingRepositoryPath(root, '.opencode', 'agents');
  const agents = new Map();

  if (agentsPath) {
    for (const name of fs.readdirSync(agentsPath)) {
      if (name.endsWith('.md')) agents.set(name, readAgent(existingRepositoryPath(root, '.opencode', 'agents', name)));
    }
  }

  return {
    specialization: specializationPath ? readJson(specializationPath) : null,
    projectConfig: projectConfigPath ? readJson(projectConfigPath) : null,
    agents,
  };
}

const sameJson = (actual, expected) => isDeepStrictEqual(actual, expected);

const unsafeConfigEntry = value => {
  if (typeof value === 'string') {
    return /OPENAI_API_KEY|api[_-]?key|auth\.json|credentials?|password|secret|token|opencode2|node_modules|\blatest\b/i.test(value)
      || /^(?:\.{1,2}[\\/]|~[\\/]|[\\/]|[A-Za-z]:[\\/]|file:)/i.test(value)
      || /(?:git(?:\+https?|ssh)?:\/\/|git@|https?:\/\/(?:www\.)?(?:github|gitlab|bitbucket)\.|#[A-Za-z][\w./-]*$)/i.test(value);
  }
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, child]) =>
    /credential|api[_-]?key|password|secret|token|auth|branch|git/i.test(key) || unsafeConfigEntry(child));
};

export function validateOpencodeOnly({root, specialization, projectConfig, agents} = {}) {
  const files = specialization === undefined || projectConfig === undefined || agents === undefined
    ? readOpencodeOnlyFiles({root})
    : null;
  const policy = specialization === undefined ? files.specialization : specialization;
  const config = projectConfig === undefined ? files.projectConfig : projectConfig;
  const agentMap = agents === undefined ? files.agents : agents;
  const errors = [];

  if (!sameJson(policy, APPROVED_OPENCODE_ONLY_POLICY)) errors.push('specialization does not match approved opencode_only policy');
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    errors.push('opencode project configuration must be an object');
  } else {
    if (!sameJson(config.enabled_providers, ['openai', 'cursor'])) errors.push('opencode project configuration must enable only openai and cursor');
    if (!sameJson(config.plugin, ['cursor-opencode-provider@0.6.3'])) errors.push('opencode project configuration must pin cursor-opencode-provider@0.6.3');
    if (!sameJson(config.instructions, ['AGENTS.md'])) errors.push('opencode project configuration must use relative AGENTS.md instructions');
    if (Object.hasOwn(config, 'model')) errors.push('opencode project configuration must inherit the operator-selected model');
    if (unsafeConfigEntry(config)) errors.push('opencode project configuration contains forbidden credentials, paths, versions, Git references, or OpenCode 2 values');
  }
  if (!(agentMap instanceof Map)) errors.push('opencode agents must be a map');

  return {ok: errors.length === 0, errors};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = validateOpencodeOnly({root: REPOSITORY_ROOT});
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
}
