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

test('runtime ToolSpecs preserve approved identities without lead-host paths', () => {
  const tools = manifest('tools.yaml').tools;
  const expected = new Map([
    ['serena-runtime', ['1.5.3', 'uv:serena-agent==1.5.3', 'serena']],
    ['context7-runtime', ['0.5.4', 'npm:ctx7@0.5.4', 'ctx7']],
    ['playwright-cli-runtime', ['0.1.17', 'npm:@playwright/cli@0.1.17', 'playwright-cli']]
  ]);
  for (const [id, [version, source, command]] of expected) {
    const tool = tools.find(item => item.tool_id === id);
    assert.equal(tool.version, version); assert.equal(tool.source, source); assert.ok(tool.commands.includes(command));
    assert.equal(JSON.stringify(tool).includes('/home/'), false);
  }
});

test('Serena keeps project activation distinct from version presence', () => {
  const tool = manifest('tools.yaml').tools.find(item => item.tool_id === 'serena-runtime');
  assert.equal(tool.readiness_probe, 'serena-project-activation');
  assert.equal(tool.version_probe.requirement, '1.5.3');
});

test('Context7 and Playwright expose distinct portable readiness policies', () => {
  const tools = manifest('tools.yaml').tools;
  assert.equal(tools.find(item => item.tool_id === 'context7-runtime').readiness_probe, 'context7-live-lookup');
  assert.equal(tools.find(item => item.tool_id === 'playwright-cli-runtime').readiness_probe, 'playwright-layered-readiness');
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
