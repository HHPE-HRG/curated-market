import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createHermeticFixture } from './fixtures/function-control/two-account-fixture.mjs';
import { createFunctionControl } from '../lib/function-control/index.mjs';
import { createExecutionResolver, serializeExecutionContext } from '../lib/execution-resolve.mjs';
import { createBehaviorControl } from '../lib/behavior-projection.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('FunctionControl.resolve still works without ExecutionResolver', async () => {
  const fx = createHermeticFixture();
  await fx.seedAccounts();
  const result = await fx.fc.resolve({
    consumer_id: 'opencode',
    provider_family: 'openai',
    capability: 'codex',
    binding_key: 'opencode:direct-fn',
    pin_account_id: 'openai:personal',
  });
  assert.ok(result.access_credential.token);
  assert.ok(!JSON.stringify(result).includes('rt_personal_mock'));
  fx.cleanup();
});

test('ExecutionResolver composes Behavior + Function into ExecutionContext', async () => {
  const fx = createHermeticFixture();
  await fx.seedAccounts();
  const resolver = createExecutionResolver({
    functionControl: fx.fc,
    behaviorControl: createBehaviorControl({ manifestRoot: REPO }),
  });

  const ctx = await resolver.resolve({
    consumer_id: 'opencode',
    session_id: 'sess-compose-1',
    behavior: {
      capability_ids: ['hhpe-hrg/session-start'],
      requires_function: { provider_family: 'openai', capability: 'codex' },
    },
    execution_request: {
      pin_account_id: 'openai:personal',
    },
  });

  assert.ok(ctx.identity.execution_id);
  assert.equal(ctx.identity.consumer_id, 'opencode');
  assert.ok(ctx.behavior_projection.behavior_bundle_id);
  assert.ok(ctx.function_projection?.access_credential?.token);
  assert.equal(ctx.function_projection.binding.account_id, 'openai:personal');
  assert.ok(ctx.observability_context.behavior_bundle_id);
  assert.equal(ctx.observability_context.account_id, 'openai:personal');
  assert.ok(ctx.observability_context.authorization_lease_id);
  fx.cleanup();
});

test('ExecutionContext does not leak full catalogs, account bank, or refresh secrets', async () => {
  const fx = createHermeticFixture();
  await fx.seedAccounts();
  const resolver = createExecutionResolver({
    functionControl: fx.fc,
    behaviorControl: createBehaviorControl({ manifestRoot: REPO }),
  });
  const ctx = await resolver.resolve({
    consumer_id: 'opencode',
    session_id: 'sess-bound',
    behavior: {
      capability_ids: ['hhpe-hrg/session-start'],
      requires_function: { provider_family: 'openai', capability: 'codex' },
    },
    execution_request: { pin_account_id: 'openai:personal' },
  });
  const raw = JSON.stringify(ctx);
  assert.ok(!raw.includes('rt_personal_mock'));
  assert.ok(!raw.includes('rt_cursor'));
  assert.ok(!raw.includes('natural_language_routing_fixtures'));
  assert.ok(!raw.includes('openai:work') || ctx.function_projection.binding.account_id === 'openai:personal');
  assert.ok(!('accounts' in (ctx.function_projection || {})));
  fx.cleanup();
});

test('serializeExecutionContext redacts access tokens', async () => {
  const fx = createHermeticFixture();
  await fx.seedAccounts();
  const resolver = createExecutionResolver({
    functionControl: fx.fc,
    behaviorControl: createBehaviorControl({ manifestRoot: REPO }),
  });
  const ctx = await resolver.resolve({
    consumer_id: 'opencode',
    session_id: 'sess-redact',
    behavior: {
      capability_ids: ['hhpe-hrg/session-start'],
      requires_function: { provider_family: 'openai', capability: 'codex' },
    },
    execution_request: { pin_account_id: 'openai:personal' },
  });
  const token = ctx.function_projection.access_credential.token;
  assert.ok(token);
  const serialized = serializeExecutionContext(ctx);
  const text = JSON.stringify(serialized);
  assert.ok(!text.includes(token));
  assert.match(text, /\[REDACTED\]/);
  assert.ok(!('refresh' in (ctx.function_projection.access_credential || {})));
  assert.ok(!('refresh_credential' in (ctx.function_projection.access_credential || {})));
  assert.ok(!('refresh_token' in (ctx.function_projection.access_credential || {})));
  fx.cleanup();
});

test('execution_request.function_requirement may request Function without behavior.requires_function', async () => {
  const fx = createHermeticFixture();
  await fx.seedAccounts();
  const resolver = createExecutionResolver({
    functionControl: fx.fc,
    behaviorControl: createBehaviorControl({ manifestRoot: REPO }),
  });
  const ctx = await resolver.resolve({
    consumer_id: 'opencode',
    session_id: 'sess-exec-fn-req',
    behavior: { capability_ids: ['hhpe-hrg/session-start'] },
    execution_request: {
      function_requirement: { provider_family: 'openai', capability: 'codex' },
      pin_account_id: 'openai:personal',
    },
  });
  assert.equal(ctx.function_projection.binding.account_id, 'openai:personal');
  fx.cleanup();
});

test('behavior requires_function asks Function Control; cannot force unauthorized pin via behavior', async () => {
  const fx = createHermeticFixture();
  await fx.seedAccounts();
  const resolver = createExecutionResolver({
    functionControl: fx.fc,
    behaviorControl: createBehaviorControl({ manifestRoot: REPO }),
  });

  // Behavior pin_account_id is ignored — Function Control ordered policy selects personal.
  const unpinned = await resolver.resolve({
    consumer_id: 'opencode',
    session_id: 'sess-ignore-behavior-pin',
    behavior: {
      capability_ids: ['hhpe-hrg/session-start'],
      requires_function: { provider_family: 'openai', capability: 'codex' },
      pin_account_id: 'openai:work',
    },
  });
  assert.equal(unpinned.function_projection.binding.account_id, 'openai:personal');

  // Explicit execution_request pin is the only pin path and is still Function-authorized.
  const ok = await resolver.resolve({
    consumer_id: 'opencode',
    session_id: 'sess-exec-pin',
    behavior: {
      capability_ids: ['hhpe-hrg/session-start'],
      requires_function: { provider_family: 'openai', capability: 'codex' },
      pin_account_id: 'openai:work',
    },
    execution_request: { pin_account_id: 'openai:personal' },
  });
  assert.equal(ok.function_projection.binding.account_id, 'openai:personal');
  fx.cleanup();
});

test('Behavior success + Function failure yields no ExecutionContext', async () => {
  const fx = createHermeticFixture();
  // Do not seed accounts — Function resolve must fail.
  const resolver = createExecutionResolver({
    functionControl: fx.fc,
    behaviorControl: createBehaviorControl({ manifestRoot: REPO }),
  });
  await assert.rejects(
    () =>
      resolver.resolve({
        consumer_id: 'opencode',
        session_id: 'sess-fn-fail',
        behavior: {
          capability_ids: ['hhpe-hrg/session-start'],
          requires_function: { provider_family: 'openai', capability: 'codex' },
        },
      }),
    (err) => err.code === 'CREDENTIAL_NOT_REGISTERED' || err.code === 'FUNCTION_RESOLVE_FAILED' || Boolean(err.message),
  );
  fx.cleanup();
});

test('composition validation failure releases Function lease', async () => {
  const fx = createHermeticFixture();
  await fx.seedAccounts();
  let lastLease;
  const resolver = createExecutionResolver({
    functionControl: fx.fc,
    behaviorControl: createBehaviorControl({ manifestRoot: REPO }),
    // Force composition failure after Function succeeds.
    validateComposition: (parts) => {
      lastLease = parts.function_projection.authorization_lease.lease_id;
      const err = new Error('forced composition failure');
      err.code = 'EXECUTION_COMPOSITION_FAILED';
      throw err;
    },
  });
  await assert.rejects(
    () =>
      resolver.resolve({
        consumer_id: 'opencode',
        session_id: 'sess-cleanup',
        behavior: {
          capability_ids: ['hhpe-hrg/session-start'],
          requires_function: { provider_family: 'openai', capability: 'codex' },
        },
        execution_request: { pin_account_id: 'openai:personal' },
      }),
    (err) => err.code === 'EXECUTION_COMPOSITION_FAILED',
  );
  assert.ok(lastLease);
  const lease = fx.fc.leaseManager.get(lastLease);
  assert.ok(lease);
  assert.equal(lease.revoked, true);
  fx.cleanup();
});

test('repeated resolve preserves account binding; behavior_bundle_id stable across refresh', async () => {
  const fx = createHermeticFixture();
  await fx.seedAccounts({ personalExpiresAt: Date.now() - 1000 });
  const resolver = createExecutionResolver({
    functionControl: fx.fc,
    behaviorControl: createBehaviorControl({ manifestRoot: REPO }),
  });
  const first = await resolver.resolve({
    consumer_id: 'opencode',
    session_id: 'sess-stable',
    behavior: {
      capability_ids: ['hhpe-hrg/session-start'],
      requires_function: { provider_family: 'openai', capability: 'codex' },
    },
    execution_request: { pin_account_id: 'openai:personal' },
  });
  const second = await resolver.resolve({
    consumer_id: 'opencode',
    session_id: 'sess-stable',
    behavior: {
      capability_ids: ['hhpe-hrg/session-start'],
      requires_function: { provider_family: 'openai', capability: 'codex' },
    },
    execution_request: { pin_account_id: 'openai:personal' },
  });
  assert.equal(first.function_projection.binding.account_id, second.function_projection.binding.account_id);
  assert.equal(first.behavior_projection.behavior_bundle_id, second.behavior_projection.behavior_bundle_id);
  // Access token may change after refresh; binding must not.
  assert.ok(first.function_projection.access_credential.token);
  assert.ok(second.function_projection.access_credential.token);
  fx.cleanup();
});

test('CONTINUATION_BLOCKED propagates from Function Control', async () => {
  const fx = createHermeticFixture();
  await fx.seedAccounts();
  const resolver = createExecutionResolver({
    functionControl: fx.fc,
    behaviorControl: createBehaviorControl({ manifestRoot: REPO }),
  });
  const keySession = 'sess-cont';
  const first = await resolver.resolve({
    consumer_id: 'opencode',
    session_id: keySession,
    continuation_id: 'run-1',
    behavior: {
      capability_ids: ['hhpe-hrg/session-start'],
      requires_function: { provider_family: 'openai', capability: 'codex' },
    },
    execution_request: { pin_account_id: 'openai:personal' },
    affinity: 'required',
    scope: 'continuation',
  });
  await fx.fc.report(first.function_projection.authorization_lease.lease_id, {
    class: 'QUOTA_EXHAUSTED',
  });
  await assert.rejects(
    () =>
      resolver.resolve({
        consumer_id: 'opencode',
        session_id: keySession,
        continuation_id: 'run-1',
        behavior: {
          capability_ids: ['hhpe-hrg/session-start'],
          requires_function: { provider_family: 'openai', capability: 'codex' },
        },
        affinity: 'required',
        scope: 'continuation',
      }),
    (err) => err.code === 'CONTINUATION_BLOCKED',
  );
  fx.cleanup();
});

test('behavior-only resolve path: no Function projection when not required', async () => {
  const os = await import('node:os');
  const crypto = await import('node:crypto');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hhpe-er-'));
  const resolver = createExecutionResolver({
    functionControl: createFunctionControl({
      HHPE_HRG_HOME: tmp,
      HHPE_FUNCTION_VAULT_KEY: crypto.randomBytes(32).toString('hex'),
    }),
    behaviorControl: createBehaviorControl({ manifestRoot: REPO }),
  });
  const ctx = await resolver.resolve({
    consumer_id: 'opencode',
    session_id: 'behavior-only',
    behavior: {
      capability_ids: ['hhpe-hrg/session-start'],
    },
  });
  assert.ok(ctx.behavior_projection.behavior_bundle_id);
  assert.equal(ctx.function_projection, undefined);
  fs.rmSync(tmp, { recursive: true, force: true });
});
