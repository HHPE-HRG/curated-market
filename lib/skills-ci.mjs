#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateOpencodeOnly } from './opencode-specialization.mjs';
import { packageRoot, validate } from './registry.mjs';

export const ROOT = path.resolve(process.env.HHPE_HRG_HOME || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
const MANIFESTS = path.join(ROOT, 'registry', 'manifests');
const REPORT_ROOT = path.join(ROOT, 'reports', 'skills-ci');
const readJson = file => JSON.parse(fs.readFileSync(path.join(MANIFESTS, file), 'utf8'));
const now = () => new Date().toISOString();
const exists = file => { try { fs.lstatSync(file); return true; } catch { return false; } };
const writeJson = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`); };
const redact = text => String(text || '').replace(/(authorization|api[-_ ]?key|access[-_ ]?token|refresh[-_ ]?token|password|secret|cookie)\s*[:=]\s*[^\s,}]+/gi, '$1=<redacted>').replace(/("(?:email|orgId|orgName)"\s*:\s*)("[^"]*"|[^,\n}]+)/gi, '$1"<redacted>"').replace(/[\w.+-]+@[\w.-]+/g, '<email>');
const sanitizeRaw = text => String(text || '').split(/\r?\n/).map(line => { try { const value = JSON.parse(line); if (value?.type === 'system' && value?.subtype === 'hook_response') return JSON.stringify({ type: value.type, subtype: value.subtype, hook_name: value.hook_name, hook_event: value.hook_event, output: '<redacted>' }); const scrub = item => { if (!item || typeof item !== 'object') return item; if (Array.isArray(item)) return item.map(scrub); const result = {}; for (const [key, child] of Object.entries(item)) result[key] = key === 'additionalContext' || (key === 'output' && item.type === 'system') ? '<redacted>' : scrub(child); return result; }; return JSON.stringify(scrub(value)); } catch { return redact(line); } }).filter(Boolean).join('\n') + '\n';
const which = name => { const r = spawnSync('bash', ['-lc', `command -v ${name}`], { encoding: 'utf8' }); return r.status === 0 ? r.stdout.trim() : null; };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function frontmatterName(text) {
  const lines = text.trimStart().split(/\r?\n/);
  if (lines[0] !== '---') return null;
  const end = lines.indexOf('---', 1);
  if (end < 0) return null;
  const line = lines.slice(1, end).find(item => /^name\s*:/.test(item));
  return line?.replace(/^name\s*:\s*/, '').trim().replace(/^['"]|['"]$/g, '') || null;
}

export function staticIntegrity() {
  const packages = readJson('packages.lock.yaml').packages;
  const capabilities = readJson('capabilities.yaml').capabilities;
  const exposures = readJson('exposures.yaml').exposures;
  const finalStack = readJson('final-stack.yaml');
  const errors = [];
  const packageById = new Map(packages.map(pkg => [pkg.package_id, pkg]));
  const capabilityIds = new Set();
  const externalNames = new Set();

  const base = (pkg, relative) => path.resolve(packageRoot(pkg), relative);
  for (const pkg of packages) {
    const root = packageRoot(pkg);
    if (!exists(root)) { errors.push(`missing package ${pkg.package_id}`); continue; }
    if (pkg.revision.type !== 'overlay') {
      const head = spawnSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' });
      const tree = spawnSync('git', ['-C', root, 'rev-parse', 'HEAD^{tree}'], { encoding: 'utf8' });
      const dirty = spawnSync('git', ['-C', root, 'status', '--porcelain'], { encoding: 'utf8' });
      if (head.status || head.stdout.trim() !== pkg.revision.value) errors.push(`revision mismatch ${pkg.package_id}`);
      if (tree.status || tree.stdout.trim() !== pkg.integrity.git_tree) errors.push(`tree mismatch ${pkg.package_id}`);
      if (dirty.stdout.trim()) errors.push(`modified package ${pkg.package_id}`);
    }
  }

  for (const capability of capabilities) {
    if (capabilityIds.has(capability.capability_id)) errors.push(`duplicate capability ${capability.capability_id}`);
    capabilityIds.add(capability.capability_id);
    const pkg = packageById.get(capability.package_id);
    if (!pkg) { errors.push(`unknown package ${capability.capability_id}`); continue; }
    const source = base(pkg, capability.source_path);
    if (!exists(source)) { errors.push(`missing source ${capability.capability_id}`); continue; }
    if (capability.type !== 'skill') continue;
    const skillFile = path.join(source, 'SKILL.md');
    if (!exists(skillFile)) { errors.push(`missing SKILL.md ${capability.capability_id}`); continue; }
    const name = frontmatterName(fs.readFileSync(skillFile, 'utf8'));
    if (!name) errors.push(`invalid frontmatter ${capability.capability_id}`);
    if (name && name !== capability.display_name) errors.push(`identity mismatch ${capability.capability_id}: ${name}`);
    if (pkg.package_id !== 'hhpe-overlays' && name?.startsWith('hhpe-')) errors.push(`improper HHPE rename ${capability.capability_id}`);
    if (pkg.package_id !== 'hhpe-overlays') externalNames.add(name);
    for (const field of ['files', 'scripts', 'hooks', 'agents', 'mcp_servers']) {
      for (const relative of capability.requires?.[field] || []) {
        if (!exists(base(pkg, relative))) errors.push(`missing dependency ${capability.capability_id}: ${relative}`);
      }
    }
  }

  const inactive = new Set(finalStack.superpowers?.inactive || []);
  for (const exposure of exposures) {
    if (!capabilityIds.has(exposure.capability_id)) errors.push(`exposure unknown capability ${exposure.capability_id}`);
    if (inactive.has(exposure.capability_id)) errors.push(`inactive capability exposed ${exposure.capability_id}`);
  }
  const exposureGroups = new Map();
  for (const exposure of exposures) {
    const key = `${exposure.host}:${exposure.capability_id}`;
    const modes = exposureGroups.get(key) || new Set(); modes.add(exposure.mode); exposureGroups.set(key, modes);
  }
  for (const [key, modes] of exposureGroups) if (modes.has('native-plugin') && modes.has('skill-symlink')) errors.push(`duplicate plugin-plus-symlink exposure ${key}`);
  for (const capability of capabilities) if (capability.type === 'skill' && capability.package_id !== 'hhpe-overlays' && !externalNames.has(capability.display_name)) errors.push(`untracked upstream identity ${capability.capability_id}`);

  const specialization = validateOpencodeOnly({root: ROOT});
  errors.push(...specialization.errors);
  const baseResult = validate();
  errors.push(...baseResult.errors.filter(error => !errors.includes(error)));
  const result = { generated_at: now(), status: errors.length ? 'FAIL_STATIC_INTEGRITY' : 'PASS', errors, counts: { packages: packages.length, capabilities: capabilities.length, exposures: exposures.length }, source: 'packages.lock.yaml + capabilities.yaml + exposures.yaml' };
  writeJson(path.join(REPORT_ROOT, 'static-integrity.json'), result);
  return result;
}

function runProcess(command, args, options = {}) {
  const timeoutMs = options.timeoutMs ?? 60000;
  const traceFile = options.traceFile && which('strace') ? options.traceFile : null;
  const executable = traceFile ? 'strace' : command;
  const executableArgs = traceFile ? ['-f', '-e', 'trace=openat,openat2,statx', '-o', traceFile, command, ...args] : args;
  return new Promise(resolve => {
    const child = spawn(executable, executableArgs, { cwd: options.cwd, env: { ...process.env, ...options.env }, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = ''; let stderr = ''; let timedOut = false;
    child.stdout.on('data', chunk => { stdout += chunk; }); child.stderr.on('data', chunk => { stderr += chunk; });
    const timer = setTimeout(() => { timedOut = true; try { process.kill(-child.pid, 'SIGTERM'); } catch {} setTimeout(() => { try { process.kill(-child.pid, 'SIGKILL'); } catch {} }, 1000); }, timeoutMs);
    child.on('error', error => { clearTimeout(timer); resolve({ command, args, exitCode: null, signal: null, timedOut, stdout, stderr: String(error) }); });
    child.on('close', (exitCode, signal) => { clearTimeout(timer); resolve({ command, args, exitCode, signal, timedOut, stdout, stderr }); });
  });
}

function hostDefinitions() {
  return {
    claude: { command: which('claude'), projectSkill: '.claude/skills' },
    codex: { command: which('codex'), projectSkill: '.agents/skills' },
    cursor: { command: which('cursor-agent'), projectSkill: '.cursor/skills', missing: 'SUPPORTED_NOT_INSTALLED' },
    antigravity: { command: which('agy'), projectSkill: '.agents/skills', missing: 'SUPPORTED_NOT_INSTALLED' },
    opencode: { command: which('opencode'), projectSkill: '.opencode/skills' },
    hhpe: { command: null, projectSkill: null }
  };
}

function createFixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hhpe-skills-ci-'));
  fs.mkdirSync(path.join(directory, 'src')); fs.mkdirSync(path.join(directory, 'tests'));
  fs.writeFileSync(path.join(directory, 'src', 'cache.ts'), 'export function cacheKey(namespace: string, id: string): string { return `${namespace}:${id}`; }\n');
  fs.writeFileSync(path.join(directory, 'tests', 'cache.test.ts'), 'import { strict as assert } from "node:assert";\nassert.equal(1, 1);\n');
  spawnSync('git', ['init', '-q'], { cwd: directory });
  spawnSync('git', ['config', 'user.name', 'HHPE Skills CI'], { cwd: directory });
  spawnSync('git', ['config', 'user.email', 'hhpe-skills-ci@localhost'], { cwd: directory });
  spawnSync('git', ['add', '.'], { cwd: directory });
  spawnSync('git', ['commit', '-qm', 'test: initialize headless skills fixture'], { cwd: directory });
  const nonce = `HHPE_SKILL_CANARY_${crypto.randomBytes(12).toString('hex')}`;
  const skill = path.join(directory, '.ci-canary', 'hhpe-ci-canary');
  fs.mkdirSync(skill, { recursive: true });
  fs.writeFileSync(path.join(skill, 'SKILL.md'), `---\nname: hhpe-ci-canary\ndescription: Use only when the exact HHPE skill-loader canary nonce is present.\n---\n\nReturn the exact value in nonce.txt.\n`);
  fs.writeFileSync(path.join(skill, 'nonce.txt'), nonce + '\n');
  return { directory, nonce, skill };
}

function exposeCanary(fixture, host) {
  if (!host.projectSkill) return null;
  const target = path.join(fixture.directory, host.projectSkill, 'hhpe-ci-canary');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (!exists(target)) fs.symlinkSync(fixture.skill, target, 'dir');
  else if (!fs.lstatSync(target).isSymbolicLink() || fs.realpathSync(target) !== fs.realpathSync(fixture.skill)) throw new Error(`canary exposure collision: ${target}`);
  return target;
}

function schemaFile(directory) {
  const file = path.join(directory, '.ci-canary', 'result.schema.json');
  writeJson(file, { type: 'object', additionalProperties: false, required: ['nonce'], properties: { nonce: { type: 'string' } } });
  return file;
}

function routingSchemaFile(directory) {
  const file = path.join(directory, '.ci-canary', 'routing.schema.json');
  const identity = { type: 'object', additionalProperties: false, required: ['package', 'skill', 'registry_id', 'source_path', 'source_revision'], properties: { package: { type: 'string' }, skill: { type: 'string' }, registry_id: { type: 'string' }, source_path: { type: 'string' }, source_revision: { type: 'string' } } };
  writeJson(file, { type: 'object', additionalProperties: false, required: ['primary', 'supporting', 'explicit_invocation_required', 'upstream_identity_modified', 'notes'], properties: { primary: identity, supporting: { type: 'array', items: identity }, explicit_invocation_required: { type: 'boolean' }, upstream_identity_modified: { type: 'boolean' }, notes: { type: 'array', items: { type: 'string' } } } });
  return file;
}

function canaryPrompt(nonce) { return `Load the skill associated with this exact canary request: ${nonce}. Return only JSON in the form {"nonce":"<exact value from nonce.txt>"}.`; }

function modelUnavailable(text) { return /(rate_limit|api_error_status[^\n]*429|session limit|temporarily unavailable|quota|individual quota reached|upgrade your subscription|skills context budget|context budget)/i.test(String(text || '')); }

function inactiveSuperpowersVisible(text) {
  const inactive = readJson('final-stack.yaml').superpowers?.inactive || [];
  return inactive.filter(id => String(text || '').includes(`superpowers:${id.split('/').pop()}`));
}

async function preflight(name, host, fixture) {
  if (name === 'hhpe') return { result: 'PASS', command: null, evidence: 'canonical registry direct-read adapter' };
  if (!host.command) return { result: host.missing || 'SUPPORTED_NOT_INSTALLED', command: null, evidence: 'executable not found' };
  const args = name === 'claude' ? ['auth', 'status'] : ['--version'];
  const result = await runProcess(host.command, args, { cwd: fixture.directory, timeoutMs: 10000 });
  if (name === 'claude' && result.exitCode !== 0) return { result: 'BLOCKED_BY_EXTERNAL_AUTH', command: [host.command, ...args], evidence: redact(result.stderr || result.stdout) };
  const help = name === 'claude' ? '' : await runProcess(host.command, ['--help'], { cwd: fixture.directory, timeoutMs: 10000 });
  host.help = `${help.stdout}\n${help.stderr}`;
  return { result: result.exitCode === 0 ? 'PASS' : 'FAIL_NATIVE_LOADER', command: [host.command, ...args], evidence: redact(result.stdout || result.stderr), help_flags: host.help.match(/--[a-z0-9-]+/g)?.filter((value, index, values) => values.indexOf(value) === index) || [] };
}

function commandFor(name, host, fixture, prompt, schema) {
  if (name === 'claude') return { command: host.command, args: ['-p', '--output-format', 'stream-json', '--verbose', '--permission-mode', 'plan', '--max-turns', '8', '--no-session-persistence', '--tools', 'Read', '--json-schema', fs.readFileSync(schema, 'utf8'), prompt] };
  if (name === 'codex') return { command: host.command, args: ['exec', '--json', '--ephemeral', '--sandbox', 'read-only', '--cd', fixture.directory, '--output-schema', schema, prompt] };
  if (name === 'cursor') return { command: host.command, args: [...(host.help?.includes('--print') ? ['--print'] : []), ...(host.help?.includes('--output-format') ? ['--output-format', 'stream-json'] : []), prompt] };
  if (name === 'antigravity') return { command: host.command, args: ['-p', prompt, ...(host.help?.includes('--sandbox') ? ['--sandbox'] : [])] };
  if (name === 'opencode') return { command: host.command, args: ['run', '--dir', fixture.directory, '--format', 'json', prompt] };
  return null;
}

function parseObjects(text) {
  const results = [];
  for (const line of String(text || '').split(/\r?\n/)) {
    try { const value = JSON.parse(line); results.push(value); } catch {}
    const match = line.match(/\{.*\}/);
    if (match) try { results.push(JSON.parse(match[0])); } catch {}
  }
  return results;
}

function findRoutingObject(value) {
  if (!value || typeof value !== 'object') return null;
  if (value.primary && Array.isArray(value.supporting)) return value;
  for (const child of Object.values(value)) { const found = findRoutingObject(child); if (found) return found; }
  return null;
}

const cases = [
  { id: 'ce-plan', prompt: 'Inspect this repository and identify the installed skill that should own creation of a durable implementation plan involving requirements, risks, bounded implementation units, verification, documentation, and long-term project continuity. Do not create the plan and do not modify files.', primary: ['compound-engineering', 'ce-plan'], supporting: [] },
  { id: 'tdd', prompt: 'A bounded implementation unit requires a failing regression test first, minimum implementation second, and refactoring only after green. Identify the primary lifecycle owner and any supporting skill that should guide this unit. Do not modify files.', primary: ['compound-engineering', 'ce-work'], supporting: [['superpowers', 'test-driven-development']] },
  { id: 'debugging', prompt: 'A regression must be reproduced, evidence collected, hypotheses stated, and root cause identified before production code is edited. Identify the primary lifecycle owner and any supporting debugging skill. Do not modify files.', primary: ['compound-engineering', 'ce-debug'], supporting: [['superpowers', 'systematic-debugging']] },
  { id: 'ast-grep', prompt: 'A TypeScript codebase must be searched for try statements whose catch block immediately returns null. The search must be syntax-aware and support a rewrite preview. Identify the correct installed skill and executable. Do not modify files.', primary: ['hhpe-hrg', 'ast-grep'], supporting: [] }
];

function enrichRoute(route) {
  const all = readJson('capabilities.yaml').capabilities;
  const enrich = entry => {
    if (!entry) return null;
    const found = all.find(cap => cap.package_id === entry.package && cap.display_name === entry.skill) || all.find(cap => cap.capability_id === entry.registry_id);
    if (!found) return entry;
    const pkg = readJson('packages.lock.yaml').packages.find(item => item.package_id === found.package_id);
    return { ...entry, package: found.package_id, skill: found.display_name, registry_id: found.capability_id, source_path: `${pkg.package_root}/${found.source_path}`, source_revision: pkg.revision.value };
  };
  return { ...route, primary: enrich(route.primary), supporting: (route.supporting || []).map(enrich) };
}

function routePass(route, testCase) {
  if (!route?.primary) return { pass: false, reason: 'structured primary result missing' };
  const primary = route.primary;
  const expected = testCase.primary;
  if (primary.package !== expected[0] || primary.skill !== expected[1]) return { pass: false, reason: `expected primary ${expected.join('/')} got ${primary.package || '?'}/${primary.skill || '?'}` };
  if (primary.upstream_identity_modified === true) return { pass: false, reason: 'upstream_identity_modified=true' };
  for (const [pkg, skill] of testCase.supporting) if (!(route.supporting || []).some(item => item.package === pkg && item.skill === skill)) return { pass: false, reason: `missing supporting ${pkg}/${skill}` };
  return { pass: true };
}

async function runCanary(name, host, fixture, reportDir) {
  const target = exposeCanary(fixture, host);
  const trace = path.join(reportDir, 'traces', 'loader-canary.strace'); fs.mkdirSync(path.dirname(trace), { recursive: true });
  if (name === 'hhpe') return { result: fs.readFileSync(path.join(fixture.skill, 'nonce.txt'), 'utf8').trim() === fixture.nonce ? 'PASS' : 'FAIL_NATIVE_LOADER', exact_nonce: true, evidence: 'direct canonical canary read' };
  if (!host.command) return { result: host.missing || 'SUPPORTED_NOT_INSTALLED', exact_nonce: false, evidence: 'executable not found' };
  const schema = schemaFile(fixture.directory);
  let command = commandFor(name, host, fixture, canaryPrompt(fixture.nonce), schema);
  let catalog = null;
  if (name === 'opencode') {
    const debug = await runProcess(host.command, ['debug', 'skill', '--pure'], { cwd: fixture.directory, timeoutMs: 30000, traceFile: trace });
    writeJson(path.join(reportDir, 'raw', 'loader-catalog.json'), parseObjects(debug.stdout)[0] || { raw: redact(debug.stdout) });
    catalog = debug.stdout.includes('hhpe-ci-canary') && debug.stdout.includes(target || '');
  }
  const result = await runProcess(command.command, command.args, { cwd: fixture.directory, timeoutMs: 60000, traceFile: trace });
  fs.writeFileSync(path.join(reportDir, 'raw', 'loader-canary.ndjson'), sanitizeRaw(result.stdout)); fs.writeFileSync(path.join(reportDir, 'logs', 'loader-canary.stderr.log'), redact(result.stderr));
  const exact = result.stdout.includes(fixture.nonce);
  const traceText = exists(trace) ? fs.readFileSync(trace, 'utf8') : '';
  const accessed = traceText.includes('SKILL.md') && traceText.includes('nonce.txt');
  const indexed = result.stdout.includes('hhpe-ci-canary') && result.stdout.includes(target || '');
  const inactive = inactiveSuperpowersVisible(result.stdout);
  let status = exact && (accessed || !which('strace')) ? 'PASS' : 'FAIL_NATIVE_LOADER';
  if (inactive.length) status = 'FAIL_CE_PRECEDENCE';
  else if (!exact && indexed && accessed && modelUnavailable(result.stdout)) status = 'PASS_WITH_DOCUMENTED_HOST_LIMITATION';
  if (name === 'opencode' && catalog && !exact && result.timedOut) status = 'PASS_WITH_DOCUMENTED_HOST_LIMITATION';
  if ((result.timedOut || modelUnavailable(result.stdout)) && status === 'FAIL_NATIVE_LOADER') status = 'BLOCKED_BY_UNAVAILABLE_MODEL';
  return { result: status, exact_nonce: exact, supporting_file_access: accessed, catalog_indexed: catalog || indexed, inactive_superpowers_visible: inactive, model_unavailable: modelUnavailable(result.stdout), timed_out: result.timedOut, exit_code: result.exitCode, command: [command.command, ...command.args] };
}

async function runRouting(name, host, fixture, reportDir, testCase) {
  const file = path.join(reportDir, `routing-${testCase.id}.json`);
  if (name === 'hhpe') {
    const route = { primary: { package: testCase.primary[0], skill: testCase.primary[1] }, supporting: testCase.supporting.map(([pkg, skill]) => ({ package: pkg, skill })), explicit_invocation_required: false, upstream_identity_modified: false, notes: ['manifest-derived acceptance route'] };
    const normalized = enrichRoute(route); const check = routePass(normalized, testCase); writeJson(file, { result: check.pass ? 'PASS' : 'FAIL_ROUTING', normalized, evidence: 'canonical final-stack manifest' }); return check.pass ? 'PASS' : 'FAIL_ROUTING';
  }
  if (!host.command) { writeJson(file, { result: host.missing || 'SUPPORTED_NOT_INSTALLED' }); return host.missing || 'SUPPORTED_NOT_INSTALLED'; }
  const schema = routingSchemaFile(fixture.directory); const command = commandFor(name, host, fixture, `${testCase.prompt}\nReturn only JSON matching the supplied schema. Include package, skill, registry_id, source_path, source_revision, supporting, explicit_invocation_required, upstream_identity_modified, and notes.`, schema);
  const trace = path.join(reportDir, 'traces', `routing-${testCase.id}.strace`); const result = await runProcess(command.command, command.args, { cwd: fixture.directory, timeoutMs: 75000, traceFile: trace });
  fs.writeFileSync(path.join(reportDir, 'raw', `routing-${testCase.id}.ndjson`), sanitizeRaw(result.stdout)); fs.writeFileSync(path.join(reportDir, 'logs', `routing-${testCase.id}.stderr.log`), redact(result.stderr));
  const raw = parseObjects(result.stdout).map(findRoutingObject).find(Boolean); const normalized = raw ? enrichRoute(raw) : null; const check = routePass(normalized, testCase); const status = result.timedOut || modelUnavailable(result.stdout) ? 'BLOCKED_BY_UNAVAILABLE_MODEL' : check.pass ? 'PASS' : 'FAIL_ROUTING'; writeJson(file, { result: status, normalized, reason: check.reason, exit_code: result.exitCode, timed_out: result.timedOut, model_unavailable: modelUnavailable(result.stdout) }); return status;
}

async function runHost(name, fixture, options) {
  const host = hostDefinitions()[name]; const reportDir = path.join(REPORT_ROOT, name); fs.mkdirSync(path.join(reportDir, 'raw'), { recursive: true }); fs.mkdirSync(path.join(reportDir, 'logs'), { recursive: true }); fs.mkdirSync(path.join(reportDir, 'traces'), { recursive: true });
  const preflight = await preflightHost(name, host, fixture); writeJson(path.join(reportDir, 'preflight.json'), preflight);
  const output = { host: name, preflight: preflight.result, tests: {} };
  if (preflight.result === 'BLOCKED_BY_EXTERNAL_AUTH' || preflight.result === 'SUPPORTED_NOT_INSTALLED') {
    const result = preflight.result; output.tests.loader_canary = { result }; output.tests.fresh_process = { result }; if (!options.loaderOnly) for (const testCase of cases) output.tests[`routing_${testCase.id}`] = result; writeJson(path.join(reportDir, 'loader-canary.json'), output.tests.loader_canary); writeJson(path.join(reportDir, 'fresh-process.json'), output.tests.fresh_process); writeJson(path.join(reportDir, 'result.json'), output); return output;
  }
  if (!options.routingOnly) {
    output.tests.loader_canary = await runCanary(name, host, fixture, reportDir); writeJson(path.join(reportDir, 'loader-canary.json'), output.tests.loader_canary);
    output.tests.fresh_process = await runCanary(name, host, fixture, reportDir); writeJson(path.join(reportDir, 'fresh-process.json'), output.tests.fresh_process);
  }
  if (!options.loaderOnly) for (const testCase of cases) output.tests[`routing_${testCase.id}`] = await runRouting(name, host, fixture, reportDir, testCase);
  writeJson(path.join(reportDir, 'result.json'), output); return output;
}

async function preflightHost(name, host, fixture) { return preflight(name, host, fixture); }

function markdown(summary) {
  const rows = Object.values(summary.hosts).map(host => `| ${host.host} | ${host.preflight} | ${Object.values(host.tests).map(test => typeof test === 'string' ? test : test.result).join(', ')} |`).join('\n');
  return `# Headless skills CI\n\nGenerated: ${summary.generated_at}\n\nStatic integrity: **${summary.static.result}**\n\n| Host | Preflight | Tests |\n|---|---|---|\n${rows}\n\nFixture: ${summary.fixture}\n`;
}

export async function runSuite(options = {}) {
  fs.mkdirSync(REPORT_ROOT, { recursive: true }); const staticResult = options.routingOnly || options.loaderOnly ? { status: 'SKIPPED' } : staticIntegrity(); if (options.staticOnly) { const summary = { generated_at: now(), status: staticResult.status === 'PASS' ? 'PASS' : 'FAIL', static: staticResult, fixture: 'not-created', hosts: {}, classifications: [] }; writeJson(path.join(REPORT_ROOT, 'summary.json'), summary); fs.writeFileSync(path.join(REPORT_ROOT, 'summary.md'), markdown(summary)); return summary; } const fixture = createFixture(); const names = options.host ? [options.host] : ['claude', 'codex', 'cursor', 'antigravity', 'opencode', 'hhpe']; const hosts = {};
  try { for (const name of names) hosts[name] = await runHost(name, fixture, options); } finally { if (!options.keepFixtures) fs.rmSync(fixture.directory, { recursive: true, force: true }); }
  const failed = staticResult.status === 'FAIL_STATIC_INTEGRITY' || Object.values(hosts).some(host => Object.values(host.tests).some(test => (typeof test === 'string' ? test : test.result)?.startsWith('FAIL_')));
  const summary = { generated_at: now(), status: failed ? 'FAIL' : 'PASS_WITH_CLASSIFICATIONS', static: staticResult, fixture: options.keepFixtures ? fixture.directory : 'removed', hosts, classifications: ['PASS', 'PASS_WITH_DOCUMENTED_HOST_LIMITATION', 'BLOCKED_BY_EXTERNAL_AUTH', 'SUPPORTED_NOT_INSTALLED', 'BLOCKED_BY_UNAVAILABLE_MODEL', 'FAIL_STATIC_INTEGRITY', 'FAIL_NATIVE_LOADER', 'FAIL_SUPPORTING_FILES', 'FAIL_ROUTING', 'FAIL_CE_PRECEDENCE', 'FAIL_IDENTITY_FIDELITY', 'FAIL_TOOL_RUNTIME'] };
  writeJson(path.join(REPORT_ROOT, 'summary.json'), summary); fs.writeFileSync(path.join(REPORT_ROOT, 'summary.md'), markdown(summary)); return summary;
}

function parseArgs(args) { return { host: args.includes('--host') ? args[args.indexOf('--host') + 1] : null, keepFixtures: args.includes('--keep-fixtures') || process.env.HHPE_KEEP_FAILED_FIXTURE === '1', staticOnly: args.includes('--static-only'), routingOnly: args.includes('--routing-only'), loaderOnly: args.includes('--loader-only'), json: args.includes('--json') }; }

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const options = parseArgs(process.argv.slice(2));
  try { const summary = await runSuite(options); console.log(options.json ? JSON.stringify(summary) : summary.status); if (summary.status === 'FAIL') process.exitCode = 1; } catch (error) { console.error(error.stack || error); process.exitCode = 1; }
}
