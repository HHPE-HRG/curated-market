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
