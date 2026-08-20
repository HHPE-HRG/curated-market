import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const canonicalJson = value => {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
};

export function toolSpecRevision(spec) {
  return `hhpe-toolspec-json-v1-sha256:${crypto.createHash('sha256').update(canonicalJson(spec)).digest('hex')}`;
}

const hostFields = ['binary_paths', 'source_binary_paths', 'platform', 'noninteractive_path', 'status', 'generated_at', 'health_check'];

export function validateToolManifest(manifest, capabilityIds = null) {
  const errors = [];
  if (manifest.schema_version !== 2) errors.push('tools manifest schema_version must be 2');
  if (manifest.record_kind !== 'tool-spec') errors.push('tools manifest record_kind must be tool-spec');
  if (!Array.isArray(manifest.tools)) return [...errors, 'tools must be an array'];
  const ids = new Set();
  for (const tool of manifest.tools) {
    if (!tool.tool_id || ids.has(tool.tool_id)) errors.push(`missing or duplicate tool_id ${tool.tool_id || '<missing>'}`);
    ids.add(tool.tool_id);
    if (!tool.capability_id || (capabilityIds && !capabilityIds.has(tool.capability_id))) errors.push(`${tool.tool_id}: unknown capability ${tool.capability_id || '<missing>'}`);
    for (const field of ['version', 'source']) if (typeof tool[field] !== 'string' || !tool[field]) errors.push(`${tool.tool_id}: invalid ${field}`);
    if (!tool.provenance?.strength) errors.push(`${tool.tool_id}: missing provenance strength`);
    if (!Array.isArray(tool.commands) || !tool.commands.length || tool.commands.some(command => typeof command !== 'string' || !command || path.isAbsolute(command))) errors.push(`${tool.tool_id}: invalid commands`);
    if (tool.discovery?.method !== 'path') errors.push(`${tool.tool_id}: unsupported discovery method`);
    if (!tool.version_probe?.parser || !tool.version_probe?.command || !Array.isArray(tool.version_probe?.args) || !tool.version_probe?.requirement) errors.push(`${tool.tool_id}: invalid version_probe`);
    if (!tool.readiness_probe) errors.push(`${tool.tool_id}: missing readiness_probe`);
    if (tool.provisioning?.execution !== 'manual-only') errors.push(`${tool.tool_id}: provisioning must be manual-only`);
    for (const field of hostFields) if (field in tool) errors.push(`${tool.tool_id}: host field ${field} is forbidden`);
  }
  return errors;
}

export function readToolSpecs(manifest, capabilityIds = null) {
  if (manifest.schema_version === 1) return manifest.tools || [];
  if (manifest.schema_version !== 2) throw new Error(`unsupported tools manifest schema ${manifest.schema_version}`);
  const errors = validateToolManifest(manifest, capabilityIds);
  if (errors.length) throw new Error(`invalid tools manifest: ${errors.join('; ')}`);
  return manifest.tools;
}

export function executionContext({id, platform = os.platform(), arch = os.arch()} = {}) {
  if (typeof id !== 'string' || !id.trim()) throw new Error('explicit execution context id is required');
  return {id, platform, arch, reusable: true};
}

export function ephemeralLocalContext({platform = os.platform(), arch = os.arch()} = {}) {
  return {scope: 'ephemeral-local', platform, arch, reusable: false};
}

export function assertReusableObservation(observation) {
  if (!observation?.execution_context?.reusable || !observation.execution_context.id) throw new Error('observation is not reusable without explicit execution context id');
}

export function resolveExecutable(command, {env = process.env, realpath = fs.realpathSync.native} = {}) {
  for (const directory of `${env.PATH || ''}`.split(path.delimiter).filter(Boolean)) {
    const executable = path.join(directory, command);
    try {
      fs.accessSync(executable, fs.constants.X_OK);
      return {outcome: 'present', command, executable, realpath: realpath(executable)};
    } catch {}
  }
  return {outcome: 'absent', command};
}

export function observeToolVersion(spec, {context, now, resolve, run, parseVersion, compareVersion}) {
  const discovery = resolve(spec.version_probe.command);
  const base = {
    tool_id: spec.tool_id,
    tool_spec_revision: toolSpecRevision(spec),
    execution_context: context,
    observed_at: now(),
    discovery,
    version: {outcome: 'not-observed'},
    readiness: {outcome: 'not-observed'},
    limitations: []
  };
  if (discovery.outcome !== 'present') return base;
  const raw = run(discovery.executable, spec.version_probe.args);
  const processEvidence = {exit_code: raw.status, stdout: raw.stdout ?? '', stderr: raw.stderr ?? ''};
  if (raw.error || raw.status !== 0) return {...base, version: {outcome: 'indeterminate', ...processEvidence, reason: 'probe-failed'}};
  const observed = parseVersion(processEvidence.stdout, processEvidence.stderr);
  if (!observed) return {...base, version: {outcome: 'indeterminate', ...processEvidence, reason: 'unparseable'}};
  return {
    ...base,
    version: {
      outcome: compareVersion(observed, spec.version_probe.requirement) ? 'compatible' : 'incompatible',
      observed,
      requirement: spec.version_probe.requirement,
      ...processEvidence
    }
  };
}

export function attachReadiness(observation, readiness, limitations = observation.limitations) {
  return {...observation, readiness, limitations: [...limitations]};
}
