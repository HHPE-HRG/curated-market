import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {markRoutingComplete, isRoutingComplete, sessionIdFromHookPayload} from '../cursor-plugin-routing/scripts/plugin-description-index.mjs';
import {evaluateRouteGate} from '../cursor-plugin-routing/hooks/route-gate.mjs';

async function withState(run) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hhpe-route-'));
  const fingerprintPath = path.join(dir, '.fingerprint');
  fs.writeFileSync(fingerprintPath, 'fp1');
  try { return await run({dir, fingerprintPath}); }
  finally { fs.rmSync(dir, {recursive: true, force: true}); }
}

test('session id prefers conversation_id', () => {
  assert.equal(sessionIdFromHookPayload({conversation_id: 'sess-a', session_id: 'other'}), 'sess-a');
  assert.equal(sessionIdFromHookPayload({command: 'git commit'}), null);
});

test('completion for session A does not authorize session B', async () => withState(async ({dir, fingerprintPath}) => {
  await markRoutingComplete({fingerprintPath, stateDir: dir, sessionId: 'sess-a'});
  assert.equal(await isRoutingComplete({currentFingerprintPath: fingerprintPath, stateDir: dir, sessionId: 'sess-a'}), true);
  assert.equal(await isRoutingComplete({currentFingerprintPath: fingerprintPath, stateDir: dir, sessionId: 'sess-b'}), false);
  const denied = await evaluateRouteGate({
    command: 'git commit -m x',
    payload: {conversation_id: 'sess-b'},
    stateDir: dir,
    fingerprintPath,
  });
  assert.equal(denied.permission, 'deny');
  assert.equal(denied.reason, 'incomplete-or-stale');
}));

test('gated command without session id denies', async () => {
  const denied = await evaluateRouteGate({
    command: 'rm -rf /tmp/x',
    payload: {command: 'rm -rf /tmp/x'},
    stateDir: '/tmp',
    fingerprintPath: '/tmp/missing',
  });
  assert.equal(denied.permission, 'deny');
  assert.equal(denied.reason, 'missing-session');
});

test('stale fingerprint denies', async () => withState(async ({dir, fingerprintPath}) => {
  await markRoutingComplete({fingerprintPath, stateDir: dir, sessionId: 'sess-a'});
  fs.writeFileSync(fingerprintPath, 'fp2');
  const denied = await evaluateRouteGate({
    command: 'git push',
    payload: {conversation_id: 'sess-a'},
    stateDir: dir,
    fingerprintPath,
  });
  assert.equal(denied.permission, 'deny');
}));

test('valid session state allows gated command', async () => withState(async ({dir, fingerprintPath}) => {
  await markRoutingComplete({fingerprintPath, stateDir: dir, sessionId: 'sess-a'});
  const allowed = await evaluateRouteGate({
    command: 'git commit -m x',
    payload: {conversation_id: 'sess-a'},
    stateDir: dir,
    fingerprintPath,
  });
  assert.equal(allowed.permission, 'allow');
}));

test('non-gated command remains guidance-only allow', async () => {
  const allowed = await evaluateRouteGate({
    command: 'ls',
    payload: {conversation_id: 's'},
    stateDir: '/tmp',
    fingerprintPath: '/tmp/missing',
  });
  assert.equal(allowed.permission, 'allow');
  assert.equal(allowed.reason, 'not-gated');
});

test('unreadable must-hold state denies instead of catch-allow', async () => {
  const denied = await evaluateRouteGate({
    command: 'git commit -m x',
    payload: {conversation_id: 'sess-a'},
    stateDir: '/definitely-not-a-usable-state-dir',
    fingerprintPath: '/definitely-not-a-fingerprint',
  });
  assert.equal(denied.permission, 'deny');
});

test('legacy global routing-complete.json does not authorize', async () => withState(async ({dir, fingerprintPath}) => {
  fs.writeFileSync(path.join(dir, 'routing-complete.json'), JSON.stringify({fingerprint: 'fp1'}));
  const denied = await evaluateRouteGate({
    command: 'git commit -m x',
    payload: {conversation_id: 'sess-a'},
    stateDir: dir,
    fingerprintPath,
  });
  assert.equal(denied.permission, 'deny');
}));
