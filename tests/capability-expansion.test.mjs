import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {ROOT} from '../lib/registry.mjs';

const manifest = name => JSON.parse(fs.readFileSync(path.join(ROOT, 'registry/manifests', name), 'utf8'));
const capabilities = () => manifest('capabilities.yaml').capabilities;
const packageFor = id => manifest('packages.lock.yaml').packages.find(item => item.package_id === id);
const sourceFor = capability => path.join(ROOT, packageFor(capability.package_id).package_root, capability.source_path);
const run = (command, args, options = {}) => spawnSync(command, args, {encoding: 'utf8', timeout: options.timeout ?? 10000, env: {...process.env, ...options.env}});

test('Context7, Playwright MCP, and ast-grep use application-compatible initiation', () => {
  const vendors = manifest('vendors.yaml');
  const byId = Object.fromEntries(vendors.vendors.map(item => [item.vendor_id, item]));
  assert.equal(byId.upstash.packages[0].initiation_kind, 'mcp_repository');
  assert.equal(byId.upstash.packages[0].marketplace_identity, 'io.github.upstash/context7');
  assert.equal(byId.microsoft.packages[0].initiation_kind, 'mcp_repository');
  assert.equal(byId.microsoft.packages[0].marketplace_identity, 'io.github.microsoft/playwright-mcp');
  assert.equal(byId.microsoft.packages[0].related_framework, 'https://github.com/microsoft/playwright');
  assert.equal(byId['ast-grep'].packages[0].initiation_kind, 'cli_repository');

  for (const [id, kind, components] of [
    ['context7', 'mcp_repository', ['mcpServer']],
    ['playwright-mcp', 'mcp_repository', ['mcpServer']],
    ['ast-grep', 'cli_repository', []],
    ['serena', 'mcp_repository', ['mcpServer']],
    ['compound-engineering', 'skill_repository', ['skill', 'agent', 'workflow', 'command']],
  ]) {
    const pkg = packageFor(id);
    assert.equal(pkg.initiation.kind, kind, id);
    assert.deepEqual(pkg.initiation.enabled_components, components, id);
  }

  const contextMcp = capabilities().find(item => item.capability_id === 'context7/context7-mcp');
  const playwrightMcp = capabilities().find(item => item.capability_id === 'playwright-mcp/playwright-mcp');
  assert.equal(contextMcp?.type, 'mcp-server');
  assert.equal(playwrightMcp?.type, 'mcp-server');
  assert.equal(JSON.parse(fs.readFileSync(path.join(ROOT, packageFor('context7').package_root, 'server.json'), 'utf8')).name, 'io.github.upstash/context7');
  assert.equal(JSON.parse(fs.readFileSync(path.join(ROOT, packageFor('playwright-mcp').package_root, 'server.json'), 'utf8')).name, 'io.github.microsoft/playwright-mcp');

  const stack = manifest('final-stack.yaml');
  assert.equal(stack.documentation_grounding.application_transport, 'cli_plus_skill_preferred');
  assert.equal(stack.browser_acceptance.application_transport, 'cli_plus_skill_preferred');
  assert.equal(stack.syntax_tree_search.initiation_kind, 'cli_repository');
  assert.equal(stack.syntax_tree_search.mcp_capability, null);
});

test('Oraios Serena is externally vended as an MCP package', () => {
  const vendors = manifest('vendors.yaml');
  const oraios = vendors.vendors.find(item => item.vendor_id === 'oraios');
  assert.ok(oraios, 'missing oraios vendor');
  assert.equal(oraios.github_org, 'oraios');
  const serenaVendor = oraios.packages.find(item => item.package_id === 'serena');
  assert.ok(serenaVendor, 'missing serena vendor package');
  assert.equal(serenaVendor.repository, 'https://github.com/oraios/serena');
  assert.equal(serenaVendor.vend_kind, 'mcp_server_package');
  assert.equal(serenaVendor.marketplace_identity, 'io.github.oraios/serena');

  const locked = packageFor('serena');
  assert.equal(locked.repository, 'https://github.com/oraios/serena');
  assert.equal(locked.vendor?.vendor_id, 'oraios');
  assert.equal(locked.vendor?.marketplace_identity, 'io.github.oraios/serena');

  const mcp = capabilities().find(item => item.capability_id === 'serena/serena-mcp');
  assert.ok(mcp, 'missing serena/serena-mcp');
  assert.equal(mcp.type, 'mcp-server');
  assert.equal(mcp.source_path, 'server.json');
  assert.equal(mcp.architecture.marketplace_identity, 'io.github.oraios/serena');
  const server = JSON.parse(fs.readFileSync(path.join(ROOT, locked.package_root, 'server.json'), 'utf8'));
  assert.equal(server.name, 'io.github.oraios/serena');

  const stack = manifest('final-stack.yaml');
  assert.equal(stack.semantic_code_intelligence.owner, 'oraios');
  assert.equal(stack.semantic_code_intelligence.mcp_capability, 'serena/serena-mcp');
  assert.equal(stack.external_vendors_manifest, 'registry/manifests/vendors.yaml');
});

test('expanded packages and creator-defined specialist identities are registered', () => {
  const packages = manifest('packages.lock.yaml').packages;
  assert.deepEqual(packages.filter(item => ['serena', 'trailofbits'].includes(item.package_id)).map(item => item.package_id), ['serena', 'trailofbits']);
  const expected = [
    'trailofbits/dimensional-analysis', 'trailofbits/property-based-testing', 'trailofbits/differential-review',
    'trailofbits/supply-chain-risk-auditor', 'trailofbits/rust-review', 'trailofbits/c-review', 'trailofbits/sharp-edges',
    'trailofbits/static-analysis/codeql', 'trailofbits/static-analysis/semgrep', 'trailofbits/static-analysis/sarif-parsing'
  ];
  const all = capabilities();
  for (const id of expected) {
    const cap = all.find(item => item.capability_id === id);
    assert.ok(cap, `missing ${id}`);
    const frontmatter = fs.readFileSync(path.join(sourceFor(cap), 'SKILL.md'), 'utf8');
    assert.match(frontmatter, new RegExp(`(?:^|\\n)name:\\s*${cap.display_name}(?:\\s|$)`));
    assert.doesNotMatch(frontmatter, /name:\s*hhpe-/);
  }
});

test('HHPE wrappers keep lifecycle and specialist routing boundaries explicit', () => {
  const stack = manifest('final-stack.yaml');
  assert.equal(stack.lifecycle_owner, 'compound-engineering');
  assert.equal(stack.specialists_are_task_triggered, true);
  assert.equal(stack.no_routine_slash_invocation, true);
  assert.deepEqual(stack.startup_layers, ['caveman', 'hhpe-hrg/session-start']);
  assert.equal(stack.beads.active, false);
  for (const id of ['hhpe-hrg/serena-guidance', 'hhpe-hrg/context7-guidance', 'hhpe-hrg/playwright-guidance', 'hhpe-hrg/session-start']) {
    const cap = capabilities().find(item => item.capability_id === id);
    assert.ok(cap);
    assert.match(fs.readFileSync(path.join(sourceFor(cap), 'SKILL.md'), 'utf8'), new RegExp(`name:\\s*${cap.display_name}`));
  }
});

test('runtime tools are present at pinned versions', () => {
  for (const tool of manifest('tools.yaml').tools.filter(item => ['serena-runtime', 'context7-runtime', 'playwright-cli-runtime'].includes(item.tool_id))) {
    const binary = tool.binary_paths[0];
    assert.equal(fs.existsSync(binary), true, `${tool.tool_id} binary missing`);
    const result = run(binary, ['--version']);
    assert.equal(result.status, 0, `${tool.tool_id} failed: ${result.stderr}`);
    assert.match(`${result.stdout}\n${result.stderr}`, new RegExp(tool.version.replaceAll('.', '\\.'), 'i'));
  }
});

test('Serena fixture can create an isolated project configuration without modifying the registry', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'hhpe-serena-'));
  const home = path.join(fixture, 'home'); fs.mkdirSync(path.join(fixture, 'src'), {recursive: true}); fs.mkdirSync(home);
  fs.writeFileSync(path.join(fixture, 'src', 'cache.ts'), 'export interface Cache { key: string }\nexport const cache: Cache = { key: "x" };\n');
  const result = run('serena', ['project', 'create', fixture, '--language', 'typescript'], {timeout: 15000, env: {HOME: home, XDG_CONFIG_HOME: path.join(home, '.config')}});
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.equal(fs.existsSync(path.join(fixture, '.serena', 'project.yml')), true);
  fs.rmSync(fixture, {recursive: true, force: true});
});

test('Context7 and Playwright expose bounded task-triggered interfaces', () => {
  const ctxHelp = run('ctx7', ['library', '--help']);
  assert.equal(ctxHelp.status, 0); assert.match(ctxHelp.stdout, /Resolve a library name/);
  const pwHelp = run('playwright-cli', ['install', '--help']);
  assert.equal(pwHelp.status, 0); assert.match(pwHelp.stdout, /--skills/);
  const context = manifest('final-stack.yaml').specialist_routing['current external library or SDK documentation'];
  const browser = manifest('final-stack.yaml').specialist_routing['browser and UI acceptance'];
  assert.equal(context, 'hhpe-hrg/context7-guidance'); assert.equal(browser, 'hhpe-hrg/playwright-guidance');
});

test('session-start fixture is read-only and reports the required state fields', () => {
  const cap = capabilities().find(item => item.capability_id === 'hhpe-hrg/session-start');
  const text = fs.readFileSync(path.join(sourceFor(cap), 'SKILL.md'), 'utf8');
  for (const field of ['Repository:', 'Branch:', 'Working tree:', 'CE state:', 'Current unit:', 'Task state:', 'Serena:', 'Required tools:', 'Protected paths:', 'Concurrent changes:', 'Blockers:', 'Recommended next action:']) assert.match(text, new RegExp(field.replace(':', '\\:')));
  assert.match(text, /do not .*modify files/i); assert.match(text, /do not create a plan/i);
});

test('natural-language routing fixtures select CE lifecycle without skill naming', () => {
  const stack = manifest('final-stack.yaml');
  assert.equal(stack.lifecycle_owner, 'compound-engineering');
  assert.match(stack.automatic_selection_policy, /Routine explicit slash invocation is not required/);
  const fixtures = stack.natural_language_routing_fixtures;
  assert.equal(fixtures.length >= 7, true);
  for (const fixture of fixtures) {
    assert.equal(fixture.must_not_require_skill_names, true);
    assert.match(fixture.primary_lifecycle, /compound-engineering|hhpe-hrg\/session-start/);
    assert.equal(Array.isArray(fixture.specialists) && fixture.specialists.length > 0, true);
    for (const token of fixture.prompt_contains) assert.equal(typeof token, 'string');
  }
  const ids = fixtures.map(item => item.id);
  for (const id of ['investigation', 'architecture', 'implementation', 'debugging', 'review', 'physical-model', 'ui-behavior']) assert.equal(ids.includes(id), true, `missing fixture ${id}`);
});
