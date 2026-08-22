import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {ROOT, sync} from '../lib/registry.mjs';
import {markRoutingComplete} from '../cursor-plugin-routing/scripts/plugin-description-index.mjs';
import {evaluateRouteGate} from '../cursor-plugin-routing/hooks/route-gate.mjs';

function observation({requirement, context, observation, satisfied, limitations = []}) {
  return {requirement, context, observation, satisfied, limitations};
}

test('managed projection resolves from canonical overlay', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'hhpe-sdk-home-'));
  try {
    const result = sync({host: 'cursor', home});
    const target = path.join(home, '.cursor/skills/serena-guidance');
    const action = result.actions.find(a => a.target === target);
    assert.equal(action.action, 'LINK');
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.symlinkSync(action.source, target, 'dir');
    const resolved = fs.realpathSync(target);
    assert.equal(resolved, fs.realpathSync(path.join(ROOT, 'registry/overlays/wrappers/serena-guidance')));
    assert.deepEqual(observation({
      requirement: 'managed_projection_resolves',
      context: {home, scope: 'user-local'},
      observation: resolved,
      satisfied: true,
    }).satisfied, true);
    assert.match(resolved, /registry\/overlays\/wrappers\/serena-guidance$/);
    assert.equal(resolved.includes(`${os.homedir()}/.hhpe-skill-pool`), false);
  } finally {
    fs.rmSync(home, {recursive: true, force: true});
  }
});

test('legacy pool is unused in the fixture home', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'hhpe-sdk-home-'));
  try {
    const result = sync({host: 'cursor', home});
    const target = path.join(home, '.cursor/skills/serena-guidance');
    const action = result.actions.find(a => a.target === target);
    assert.equal(action.action, 'LINK');
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.symlinkSync(action.source, target, 'dir');
    const resolved = fs.realpathSync(target);
    assert.equal(resolved.includes('.hhpe-skill-pool'), false);
    assert.equal(fs.existsSync(path.join(home, '.hhpe-skill-pool')), false);
    assert.deepEqual(observation({
      requirement: 'legacy_pool_not_used_for_selected_fixture',
      context: {home, skill: 'serena-guidance', scope: 'user-local'},
      observation: resolved,
      satisfied: true,
    }), {
      requirement: 'legacy_pool_not_used_for_selected_fixture',
      context: {home, skill: 'serena-guidance', scope: 'user-local'},
      observation: resolved,
      satisfied: true,
      limitations: [],
    });
  } finally {
    fs.rmSync(home, {recursive: true, force: true});
  }
});

test('routing gate observations are requirement-specific', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hhpe-sdk-route-'));
  const fingerprintPath = path.join(dir, '.fingerprint');
  fs.writeFileSync(fingerprintPath, 'fp1');
  try {
    const blocked = await evaluateRouteGate({
      command: 'git commit -m x',
      payload: {conversation_id: 'sess-sdk'},
      stateDir: dir,
      fingerprintPath,
    });
    assert.equal(blocked.permission, 'deny');
    assert.deepEqual(observation({
      requirement: 'routing_gate_blocks_before_completion',
      context: {sessionId: 'sess-sdk', stateDir: dir},
      observation: blocked,
      satisfied: blocked.permission === 'deny',
    }).satisfied, true);

    await markRoutingComplete({fingerprintPath, stateDir: dir, sessionId: 'sess-sdk'});
    const allowed = await evaluateRouteGate({
      command: 'git commit -m x',
      payload: {conversation_id: 'sess-sdk'},
      stateDir: dir,
      fingerprintPath,
    });
    assert.equal(allowed.permission, 'allow');
    assert.deepEqual(observation({
      requirement: 'routing_gate_allows_after_completion',
      context: {sessionId: 'sess-sdk', stateDir: dir},
      observation: allowed,
      satisfied: allowed.permission === 'allow',
    }).satisfied, true);

    const executed = await evaluateRouteGate({
      command: 'ls',
      payload: {conversation_id: 'sess-sdk', executionContext: 'sess-sdk'},
      stateDir: dir,
      fingerprintPath,
    });
    assert.equal(executed.permission, 'allow');
    assert.deepEqual(observation({
      requirement: 'hook_executes',
      context: {sessionId: 'sess-sdk', command: 'ls'},
      observation: executed,
      satisfied: executed.permission === 'allow',
    }).satisfied, true);
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
});

test('projected skill is discoverable via fixture SKILL.md path', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'hhpe-sdk-home-'));
  try {
    const result = sync({host: 'cursor', home});
    const target = path.join(home, '.cursor/skills/serena-guidance');
    const action = result.actions.find(a => a.target === target);
    assert.equal(action.action, 'LINK');
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.symlinkSync(action.source, target, 'dir');
    const skillMd = path.join(target, 'SKILL.md');
    assert.equal(fs.existsSync(skillMd), true);
    const resolved = fs.realpathSync(skillMd);
    assert.deepEqual(observation({
      requirement: 'projected_skill_discoverable',
      context: {home, skill: 'serena-guidance', scope: 'user-local'},
      observation: resolved,
      satisfied: true,
    }).satisfied, true);
    assert.match(resolved, /registry\/overlays\/wrappers\/serena-guidance\/SKILL\.md$/);
  } finally {
    fs.rmSync(home, {recursive: true, force: true});
  }
});

test('SDK project_rule_loaded stays unobserved without a documented rule probe', async () => {
  let sdk = null;
  try { sdk = await import('@cursor/sdk'); } catch { sdk = null; }
  const available = Boolean(sdk) && Boolean(process.env.CURSOR_API_KEY);
  // Stay unobserved unless a real documented SDK rule-read API is invoked.
  const documentedRuleProbeRan = false;
  const result = observation({
    requirement: 'project_rule_loaded',
    context: {scope: 'project', runtime: 'cursor-sdk'},
    observation: documentedRuleProbeRan ? 'observed' : 'unobserved',
    satisfied: null,
    limitations: documentedRuleProbeRan
      ? []
      : [
          available
            ? 'no documented @cursor/sdk rule-read API used'
            : '@cursor/sdk or CURSOR_API_KEY unavailable',
        ],
  });
  assert.equal(result.observation, 'unobserved');
  assert.equal(result.satisfied, null);
  assert.notEqual(result.observation, 'attempted');
});
