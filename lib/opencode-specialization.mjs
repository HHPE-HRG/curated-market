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

export function validateOpencodeOnly({root, specialization, projectConfig, agents} = {}) {
  const files = specialization === undefined || projectConfig === undefined || agents === undefined
    ? readOpencodeOnlyFiles({root})
    : null;
  const policy = specialization === undefined ? files.specialization : specialization;
  const config = projectConfig === undefined ? files.projectConfig : projectConfig;
  const agentMap = agents === undefined ? files.agents : agents;
  const errors = [];

  if (!sameJson(policy, APPROVED_OPENCODE_ONLY_POLICY)) errors.push('specialization does not match approved opencode_only policy');
  if (config !== null && typeof config !== 'object') errors.push('opencode project configuration must be an object');
  if (!(agentMap instanceof Map)) errors.push('opencode agents must be a map');

  return {ok: errors.length === 0, errors};
}
